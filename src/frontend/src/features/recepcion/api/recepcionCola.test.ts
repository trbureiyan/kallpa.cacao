import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/dexieDb'
import { limpiarDb } from '@/test/limpiarDb'
import { encolarRecepcionApi } from './recepcionDb'

const valido = { farmId: 1, farmName: 'Finca A · Rivera', date: '2026-01-05', quantity: 100, purchaseTotalCop: 1_200_000 }

beforeEach(limpiarDb)

describe('encolarRecepcionApi', () => {
  it('guarda pendiente con código provisional, clave UUID y sin movimiento ni auditoría locales', async () => {
    const l = await encolarRecepcionApi(valido)
    expect(l.syncStatus).toBe('PENDING')
    expect(l.lotCode).toMatch(/^PEND-[0-9A-F]{8}$/)
    expect(l.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(l).toMatchObject({ farmId: 1, quantity: 100, purchaseTotalCop: 1_200_000, unit: 'kg' })
    expect(await db.movimientos.count()).toBe(0)
    expect(await db.auditLogs.count()).toBe(0)
  })

  it('dos recepciones iguales son dos lotes distintos (cada captura tiene su clave)', async () => {
    const a = await encolarRecepcionApi(valido)
    const b = await encolarRecepcionApi(valido)
    expect(a.idempotencyKey).not.toBe(b.idempotencyKey)
    expect(a.lotCode).not.toBe(b.lotCode)
  })

  it.each([
    ['cantidad 0', { quantity: 0 }],
    ['cantidad negativa', { quantity: -3 }],
    ['cantidad NaN', { quantity: NaN }],
    ['costo negativo', { purchaseTotalCop: -1 }],
    ['costo NaN', { purchaseTotalCop: NaN }],
    ['sin finca', { farmId: 0 }],
    ['sin fecha', { date: '' }],
  ])('rechaza %s y no guarda nada', async (_n, cambio) => {
    await expect(encolarRecepcionApi({ ...valido, ...cambio })).rejects.toMatchObject({ codigo: 'DATO_INVALIDO' })
    expect(await db.recepciones.count()).toBe(0)
  })

  it('costo 0 es válido (cacao donado)', async () => {
    await expect(encolarRecepcionApi({ ...valido, purchaseTotalCop: 0 })).resolves.toMatchObject({ purchaseTotalCop: 0 })
  })
})
