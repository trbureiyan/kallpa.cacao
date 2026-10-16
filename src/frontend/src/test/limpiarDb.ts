import { db } from '@/db/dexieDb'

// Base limpia para cada prueba: sin estado compartido entre casos.
export async function limpiarDb(): Promise<void> {
  await db.delete()
  await db.open()
}
