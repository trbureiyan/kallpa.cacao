import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/dexieDb'
import { resumirCola } from './api/recepcionSync'

/** Pendientes y errores de la cola de recepciones, reactivo a Dexie. Mismo criterio en cabecera, resumen y Recepción. */
export function useEstadoCola() {
  return useLiveQuery(async () => resumirCola(await db.recepciones.toArray()), [], { pendientes: 0, errores: 0 })
}
