import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import type { ModoFuente } from '@/context/fuente'
import { db, type RecepcionOffline } from '@/db/dexieDb'
import { ErrorDominio } from '@/utils/errores'

// Errores que no dependen del registro: seguir enviando solo alargaría la espera y no cambiaría el resultado.
const CORTAN_LA_CORRIDA = new Set(['SESION', 'SIN_RED', 'SIN_RESPUESTA', 'SERVIDOR'])

// [DECISION] las corridas se encolan en lugar de reutilizar la que está en curso: la página y el formulario pueden
// pedir sincronizar a la vez, y una recepción guardada justo después de que la primera leyó sus pendientes
// quedaría sin enviar si se devolviera esa misma promesa. Cada corrida lee las pendientes cuando le toca.
let cola: Promise<unknown> = Promise.resolve()

/**
 * Envía las recepciones pendientes a /receptions, una por una y en orden de captura.
 * Devuelve cuántas quedaron sincronizadas. Una recepción nunca se borra: o queda SYNCED, o PENDING, o ERROR con mensaje
 * (y desde ERROR solo el operador la pasa a DISCARDED).
 */
export function sincronizarRecepcionesPendientes(modo: ModoFuente): Promise<number> {
  const corrida = cola.catch(() => undefined).then(() => correr(modo))
  cola = corrida
  return corrida
}

// [DECISION] la cola del servidor son solo las recepciones capturadas en modo API (llevan finca). Las filas sin finca
// son lotes del modo local o de la semilla de demostración: pertenecen a la otra fuente (AGENTS.md, «Fuente única
// por sesión»), así que en modo API no se envían, no se cuentan y no se marcan con error. Tampoco se borran.
export function esDeLaCola(r: RecepcionOffline): boolean {
  return r.farmId != null && r.farmId > 0
}

/** Lo que muestra la cabecera: por enviar (se resuelve solo) y con error (requiere que el operador decida). */
export function resumirCola(filas: RecepcionOffline[]): { pendientes: number; errores: number } {
  const cola = filas.filter(esDeLaCola)
  return {
    pendientes: cola.filter((r) => r.syncStatus === 'PENDING').length,
    errores: cola.filter((r) => r.syncStatus === 'ERROR').length,
  }
}

/** Devuelve a la cola una recepción rechazada, con la misma clave: si el servidor ya la tenía, no se duplica. */
export async function reintentarRecepcion(idLocal: number, modo: ModoFuente): Promise<void> {
  await db.recepciones.where('idLocal').equals(idLocal).and((r) => r.syncStatus === 'ERROR').modify({ syncStatus: 'PENDING', errorMessage: undefined })
  await sincronizarRecepcionesPendientes(modo)
}

/**
 * Saca de la cola una recepción con error que el operador decidió no enviar. No se borra: queda en el dispositivo
 * como DISCARDED, con sus datos, el último motivo de rechazo y la hora del descarte.
 */
export async function descartarRecepcion(idLocal: number): Promise<void> {
  const r = await db.recepciones.get(idLocal)
  if (!r || r.syncStatus !== 'ERROR') {
    throw new ErrorDominio('NO_DESCARTABLE', 'No se descartó la recepción. Solo se puede descartar una recepción que el servidor rechazó. Actualice la página y revise su estado.')
  }
  await db.recepciones.update(idLocal, { syncStatus: 'DISCARDED', discardedAt: new Date().toISOString() })
}

async function correr(modo: ModoFuente): Promise<number> {
  if (modo !== 'api') return 0

  const pendientes = (await db.recepciones.where('syncStatus').equals('PENDING').sortBy('idLocal')).filter(esDeLaCola)
  let sincronizadas = 0

  for (const lote of pendientes) {
    if (!lote.idLocal) continue

    try {
      const { data } = await axiosClient.post('/receptions', {
        idempotency_key: lote.idempotencyKey,
        farm_id: lote.farmId,
        // la fecha de recepción es solo día; el mediodía UTC evita que la zona horaria la mueva de día
        received_at: `${lote.date}T12:00:00Z`,
        quantity_kg: lote.quantity,
        purchase_total_cop: lote.purchaseTotalCop ?? 0,
        quality_notes: lote.qualityNotes,
      })
      await db.recepciones.update(lote.idLocal, { lotCode: data.lot_code, syncStatus: 'SYNCED', errorMessage: undefined })
      sincronizadas++
    } catch (e) {
      const err = traducirErrorApi(e)
      if (CORTAN_LA_CORRIDA.has(err.codigo)) break
      await db.recepciones.update(lote.idLocal, { syncStatus: 'ERROR', errorMessage: err.message })
    }
  }

  return sincronizadas
}
