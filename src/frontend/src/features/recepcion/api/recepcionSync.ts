import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import type { ModoFuente } from '@/context/fuente'
import { db } from '@/db/dexieDb'

// Errores que no dependen del registro: seguir enviando solo alargaría la espera y no cambiaría el resultado.
const CORTAN_LA_CORRIDA = new Set(['SESION', 'SIN_RED', 'SERVIDOR'])

// [DECISION] las corridas se encolan en lugar de reutilizar la que está en curso: la página y el formulario pueden
// pedir sincronizar a la vez, y una recepción guardada justo después de que la primera leyó sus pendientes
// quedaría sin enviar si se devolviera esa misma promesa. Cada corrida lee las pendientes cuando le toca.
let cola: Promise<unknown> = Promise.resolve()

/**
 * Envía las recepciones pendientes a /receptions, una por una y en orden de captura.
 * Devuelve cuántas quedaron sincronizadas. Una recepción nunca se borra: o queda SYNCED, o PENDING, o ERROR con mensaje.
 */
export function sincronizarRecepcionesPendientes(modo: ModoFuente): Promise<number> {
  const corrida = cola.catch(() => undefined).then(() => correr(modo))
  cola = corrida
  return corrida
}

async function correr(modo: ModoFuente): Promise<number> {
  if (modo !== 'api') return 0

  const pendientes = await db.recepciones.where('syncStatus').equals('PENDING').sortBy('idLocal')
  let sincronizadas = 0

  for (const lote of pendientes) {
    if (!lote.idLocal) continue

    if (!lote.farmId) {
      await db.recepciones.update(lote.idLocal, {
        syncStatus: 'ERROR',
        errorMessage: 'Este registro se guardó sin finca y el servidor no lo acepta. Vuelva a registrar la recepción eligiendo la finca.',
      })
      continue
    }

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
