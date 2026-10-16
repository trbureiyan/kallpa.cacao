import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/dexieDb'
import { disponibleKg } from '@/features/inventario/api/inventarioDb'
import { guardarRecepcionLocal } from '@/features/recepcion/api/recepcionDb'
import { limpiarDb } from '@/test/limpiarDb'
import { fijarReloj } from '@/utils/clock'
import { registrarProcesoLocal } from './procesoDb'

const base = {
  lotCode: 'CAC001',
  stage: 'SECADO',
  inputQty: 100,
  outputQty: 80,
  responsible: 'José Rivera',
  costoTotalCOP: 1_600_000,
  precioVentaCOP: 25_000,
  claveIdempotencia: 'k1',
}

beforeEach(async () => {
  fijarReloj(null)
  await limpiarDb()
  await guardarRecepcionLocal({ lotCode: 'CAC001', producer: 'Productor A', origin: 'Rivera', date: '2026-01-05', quantity: 100, unit: 'kg' })
})

describe('registrarProcesoLocal', () => {
  it('ejemplo del reto: 100→80 registra merma 20 % y consume 100 kg', async () => {
    const p = await registrarProcesoLocal(base)
    expect(p.shrinkagePercent).toBe(20)
    expect(await disponibleKg('CAC001')).toBe(0)
    expect(await db.procesos.count()).toBe(1)
    expect((await db.auditLogs.toArray()).some((a) => a.action === 'PROCESO')).toBe(true)
  })

  it('valores nuevos: 60→45 recalcula la merma (25 %) y deja 40 kg', async () => {
    const p = await registrarProcesoLocal({ ...base, inputQty: 60, outputQty: 45 })
    expect(p.shrinkagePercent).toBe(25)
    expect(await disponibleKg('CAC001')).toBe(40)
  })

  it('salida 0 se rechaza y no consume', async () => {
    await expect(registrarProcesoLocal({ ...base, outputQty: 0 })).rejects.toMatchObject({ codigo: 'DATO_INVALIDO' })
    expect(await disponibleKg('CAC001')).toBe(100)
  })

  it('120 kg sobre 100 disponibles se rechaza sin dejar nada', async () => {
    await expect(registrarProcesoLocal({ ...base, inputQty: 120, outputQty: 90 })).rejects.toMatchObject({
      codigo: 'EXISTENCIA_INSUFICIENTE',
    })
    expect(await db.procesos.count()).toBe(0)
    expect(await disponibleKg('CAC001')).toBe(100)
  })

  it('reenviar la misma clave devuelve el original y no consume dos veces', async () => {
    const a = await registrarProcesoLocal({ ...base, inputQty: 40, outputQty: 30 })
    const b = await registrarProcesoLocal({ ...base, inputQty: 40, outputQty: 30 })
    expect(b.idLocal).toBe(a.idLocal)
    expect(await db.procesos.count()).toBe(1)
    expect(await disponibleKg('CAC001')).toBe(60)
  })

  it('doble envío simultáneo con la misma clave consume una sola vez', async () => {
    await Promise.allSettled([
      registrarProcesoLocal({ ...base, inputQty: 40, outputQty: 30 }),
      registrarProcesoLocal({ ...base, inputQty: 40, outputQty: 30 }),
    ])
    expect(await db.procesos.count()).toBe(1)
    expect(await disponibleKg('CAC001')).toBe(60)
  })

  it('salida mayor que la entrada exige justificación', async () => {
    await expect(registrarProcesoLocal({ ...base, inputQty: 50, outputQty: 60, claveIdempotencia: 'k2' })).rejects.toMatchObject({
      codigo: 'DATO_INVALIDO',
    })
    const p = await registrarProcesoLocal({ ...base, inputQty: 50, outputQty: 60, justificacion: 'adición de insumos', claveIdempotencia: 'k3' })
    expect(p.shrinkagePercent).toBe(-20)
  })

  it('si la auditoría falla no queda proceso ni consumo', async () => {
    fijarReloj(() => {
      throw new Error('reloj roto')
    })
    await expect(registrarProcesoLocal({ ...base, inputQty: 40, outputQty: 30 })).rejects.toThrow()
    fijarReloj(null)
    expect(await db.procesos.count()).toBe(0)
    expect(await disponibleKg('CAC001')).toBe(100)
  })

  it('lote inexistente se rechaza', async () => {
    await expect(registrarProcesoLocal({ ...base, lotCode: 'CAC999' })).rejects.toMatchObject({ codigo: 'LOTE_NO_ENCONTRADO' })
  })
})
