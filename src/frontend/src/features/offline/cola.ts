// Cola local de recepciones. Módulo único de offline: solo la recepción escribe aquí.
// La idempotencia real vive en el servidor (clave única por recepción): reenviar la misma clave
// devuelve el lote original y no vuelve a registrar existencia ni costo.
import { db, type RecepcionCola } from '@/db/dexieDb'
import { listarFincas, enviarRecepcion } from '@/api/servicios'
import type { Finca } from '@/api/tipos'

export async function encolarRecepcion(datos: {
  finca: Finca
  cantidadKg: number
  costoCompraCop: number
  notas?: string
}): Promise<RecepcionCola> {
  const item: RecepcionCola = {
    idempotencyKey: crypto.randomUUID(),
    farmId: datos.finca.id,
    fincaNombre: datos.finca.name,
    municipio: datos.finca.region,
    cantidadKg: datos.cantidadKg,
    costoCompraCop: datos.costoCompraCop,
    notas: datos.notas?.trim() || undefined,
    recibidoEn: new Date().toISOString(),
    creadoEn: Date.now(),
    estado: 'PENDING',
  }
  await db.colaRecepciones.add(item)
  return item
}

// Un solo recorrido a la vez: dos recorridos simultáneos reenviarían la misma clave (el servidor lo
// toleraría, pero el estado local se pisaría).
let enCurso: Promise<ResultadoSync> | null = null

export interface ResultadoSync {
  enviadas: number
  conError: number
  sinRed: boolean
}

export function sincronizarCola(): Promise<ResultadoSync> {
  if (!enCurso) enCurso = recorrerCola().finally(() => (enCurso = null))
  return enCurso
}

async function recorrerCola(): Promise<ResultadoSync> {
  const pendientes = await db.colaRecepciones.where('estado').anyOf('PENDING', 'ERROR').sortBy('creadoEn')
  const resultado: ResultadoSync = { enviadas: 0, conError: 0, sinRed: false }

  for (const item of pendientes) {
    // Un ERROR de validación se reintenta solo si el usuario pulsa "Reintentar" (ver reintentar()).
    if (item.estado === 'ERROR') continue
    try {
      const r = await enviarRecepcion({
        idempotency_key: item.idempotencyKey,
        farm_id: item.farmId,
        received_at: item.recibidoEn,
        quantity_kg: item.cantidadKg,
        purchase_total_cop: item.costoCompraCop,
        quality_notes: item.notas ?? null,
      })
      await db.colaRecepciones.update(item.idempotencyKey, {
        estado: 'SYNCED',
        codigoLote: r.lot_code,
        mensajeError: undefined,
      })
      resultado.enviadas++
    } catch (e) {
      const status = (e as { response?: { status: number; data?: { detail?: unknown } } }).response?.status
      if (status === undefined || status === 401 || status >= 500) {
        // Sin red, sesión vencida o falla del servidor: queda pendiente y se reintenta luego.
        resultado.sinRed = true
        break
      }
      const detalle = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
      await db.colaRecepciones.update(item.idempotencyKey, {
        estado: 'ERROR',
        mensajeError: typeof detalle === 'string' ? detalle : 'El servidor rechazó el registro. Revise los datos.',
      })
      resultado.conError++
    }
  }
  return resultado
}

/** Devuelve un registro rechazado a pendiente (misma clave: si el servidor ya lo tenía, no se duplica). */
export async function reintentar(idempotencyKey: string) {
  await db.colaRecepciones.update(idempotencyKey, { estado: 'PENDING', mensajeError: undefined })
  return sincronizarCola()
}

/** Refresca la copia local del catálogo de fincas para capturar sin conexión. */
export async function actualizarFincasCache(): Promise<void> {
  try {
    const fincas = await listarFincas()
    await db.transaction('rw', db.fincas, async () => {
      await db.fincas.clear()
      await db.fincas.bulkPut(fincas)
    })
  } catch {
    // Sin red o sin sesión: se conserva la copia anterior.
  }
}
