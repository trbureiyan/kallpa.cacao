import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/dexieDb'
import { disponibleKg } from '@/features/inventario/api/inventarioDb'
import { limpiarDb } from '@/test/limpiarDb'
import { seedDatabase } from './seed'

beforeEach(limpiarDb)

describe('seedDatabase', () => {
  it('carga CAC001-003 con las cantidades del reto', async () => {
    await seedDatabase()
    const lotes = await db.recepciones.orderBy('lotCode').toArray()
    expect(lotes.map((l) => [l.lotCode, l.origin, l.quantity])).toEqual([
      ['CAC001', 'Rivera', 100],
      ['CAC002', 'Campoalegre', 150],
      ['CAC003', 'Algeciras', 80],
    ])
    expect(await disponibleKg('CAC002')).toBe(150)
    expect(lotes.every((l) => l.status === 'PENDIENTE')).toBe(true)
  })

  it('no inventa procesos ni auditoría de transformaciones', async () => {
    await seedDatabase()
    expect(await db.procesos.count()).toBe(0)
  })

  it('ejecutarla dos veces no duplica nada', async () => {
    await seedDatabase()
    await seedDatabase()
    expect(await db.recepciones.count()).toBe(3)
    expect(await db.movimientos.count()).toBe(3)
  })
})
