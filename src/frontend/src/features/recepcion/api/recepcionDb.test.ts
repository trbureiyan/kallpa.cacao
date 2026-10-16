import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/dexieDb'
import { disponibleKg } from '@/features/inventario/api/inventarioDb'
import { limpiarDb } from '@/test/limpiarDb'
import { fijarReloj } from '@/utils/clock'
import { guardarRecepcionLocal } from './recepcionDb'

const valido = { producer: 'Productor A', origin: 'Rivera', date: '2026-01-05', quantity: 100, unit: 'kg' }

beforeEach(async () => {
  fijarReloj(null)
  await limpiarDb()
})

describe('guardarRecepcionLocal', () => {
  it('guarda un lote válido con clave, estado pendiente y disponible igual a la cantidad', async () => {
    const lote = await guardarRecepcionLocal(valido)
    expect(lote.idempotencyKey).toMatch(/.+/)
    expect(lote.status).toBe('PENDIENTE')
    expect(lote.syncStatus).toBe('PENDING')
    expect(await disponibleKg(lote.lotCode)).toBe(100)
    expect(await db.auditLogs.count()).toBe(1)
  })

  it.each([-5, 0, NaN])('rechaza la cantidad %s y no guarda nada', async (quantity) => {
    await expect(guardarRecepcionLocal({ ...valido, quantity })).rejects.toMatchObject({ codigo: 'DATO_INVALIDO' })
    expect(await db.recepciones.count()).toBe(0)
    expect(await db.movimientos.count()).toBe(0)
  })

  it('rechaza productor vacío', async () => {
    await expect(guardarRecepcionLocal({ ...valido, producer: ' ' })).rejects.toMatchObject({ codigo: 'DATO_INVALIDO' })
  })

  it('rechaza un código de lote repetido', async () => {
    await guardarRecepcionLocal({ ...valido, lotCode: 'CAC001' })
    await expect(guardarRecepcionLocal({ ...valido, lotCode: 'CAC001' })).rejects.toMatchObject({ codigo: 'LOTE_DUPLICADO' })
    expect(await db.recepciones.count()).toBe(1)
  })

  it('sin código asigna el siguiente CACnnn libre', async () => {
    const a = await guardarRecepcionLocal(valido)
    const b = await guardarRecepcionLocal(valido)
    expect([a.lotCode, b.lotCode]).toEqual(['CAC001', 'CAC002'])
  })

  it('si la auditoría falla no queda lote ni movimiento', async () => {
    fijarReloj(() => {
      throw new Error('reloj roto')
    })
    await expect(guardarRecepcionLocal(valido)).rejects.toThrow()
    expect(await db.recepciones.count()).toBe(0)
    expect(await db.movimientos.count()).toBe(0)
  })
})
