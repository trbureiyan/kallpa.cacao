import { db } from '@/db/dexieDb'
import { guardarRecepcionLocal } from '@/features/recepcion/api/recepcionDb'

// Datos sintéticos del caso (reto, sección 5). Municipios son referencias, no afirmaciones sobre productores reales.
const LOTES_BASE = [
  { lotCode: 'CAC001', producer: 'Productor A', origin: 'Rivera', quantity: 100 },
  { lotCode: 'CAC002', producer: 'Productor B', origin: 'Campoalegre', quantity: 150 },
  { lotCode: 'CAC003', producer: 'Productor C', origin: 'Algeciras', quantity: 80 },
]

/** Solo carga si la base está vacía, así que repetirla no duplica ni pisa registros. */
export async function seedDatabase(): Promise<void> {
  if ((await db.recepciones.count()) > 0) return
  for (const l of LOTES_BASE) {
    await guardarRecepcionLocal({ ...l, date: '2026-01-05', unit: 'kg', usuario: 'Carga inicial' })
  }
}
