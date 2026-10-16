import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import { listarFilasApi } from '@/features/inventario/api/inventarioApi'
import type { RolUsuario } from '@/types/app'
import { ahoraISO } from '@/utils/clock'
import { ErrorDominio } from '@/utils/errores'
import { validarTransformacion } from '../reglas'
import type { DatosProceso } from './procesoDb'

export interface AlertaProceso {
  tipo: string
  regla: string
  causa: string
}

/** Fila del historial, igual en modo local y en modo API. */
export interface ProcesoUi {
  clave: string | number
  lotCode: string
  stage: string
  inputQty: number
  outputQty: number
  shrinkagePercent: number | null
  responsible: string
  date: string
  alertas: AlertaProceso[]
}

/**
 * Registra la transformación en el servidor. Valida antes para dar un mensaje claro sin viaje de red,
 * pero la existencia y el bloqueo los decide el servidor.
 */
export async function registrarProcesoApi(rol: RolUsuario, d: DatosProceso): Promise<{ outputCode: string }> {
  const lote = (await listarFilasApi(rol)).find((f) => f.codigo === d.lotCode)
  if (!lote?.id) {
    throw new ErrorDominio('LOTE_NO_ENCONTRADO', `No se registró la transformación. El lote ${d.lotCode} no existe. Seleccione un lote registrado en Recepción.`)
  }

  const errores = validarTransformacion({ entradaKg: d.inputQty, salidaKg: d.outputQty, disponibleKg: lote.disponibleKg, justificacion: d.justificacion })
  if (errores.length > 0) {
    const sinExistencia = Number.isFinite(d.inputQty) && d.inputQty > lote.disponibleKg
    throw new ErrorDominio(sinExistencia ? 'EXISTENCIA_INSUFICIENTE' : 'DATO_INVALIDO', errores.join(' '))
  }

  // la API guarda justificación e incidencias en un solo campo
  const incident = [d.justificacion?.trim(), d.incidencias?.trim()].filter(Boolean).join(' · ')

  try {
    const { data } = await axiosClient.post('/transformations', {
      idempotency_key: d.claveIdempotencia,
      lot_id: lote.id,
      stage: d.stage,
      occurred_at: ahoraISO(),
      input_quantity: d.inputQty,
      output_quantity: d.outputQty,
      unit: 'kg',
      // [DECISION] el código del lote de salida sale de la clave: un reintento repite el mismo código y no crea otro lote
      output_code: `${d.lotCode}-${d.claveIdempotencia.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
      // sin costo o precio no se envía nada: un 0 inventado haría "calculable" un costo que no se registró
      ...(d.costoTotalCOP !== undefined && { costs_cop: d.costoTotalCOP }),
      ...(d.precioVentaCOP !== undefined && { sale_price_cop_per_unit: d.precioVentaCOP }),
      ...(incident && { incident }),
    })
    return { outputCode: data.output_code }
  } catch (e) {
    throw traducirErrorApi(e)
  }
}

interface TransformacionApi {
  id: number
  lot_id: number
  stage: string
  occurred_at: string
  input_quantity: number
  output_quantity: number
  loss_percent: number | null
  responsible_name?: string
  loss_alert: { type: string; rule: string; cause: string } | null
}

/** Historial desde el servidor, con el código del lote y la alerta de merma que calculó el backend. */
export async function listarProcesosApi(rol: RolUsuario): Promise<ProcesoUi[]> {
  let filas, lista: TransformacionApi[]
  try {
    filas = await listarFilasApi(rol)
    lista = (await axiosClient.get<TransformacionApi[]>('/transformations')).data
  } catch (e) {
    throw traducirErrorApi(e)
  }
  const codigoPorId = new Map(filas.map((f) => [f.id, f.codigo]))
  return lista.map((t) => ({
    clave: t.id,
    lotCode: codigoPorId.get(t.lot_id) ?? `Lote ${t.lot_id}`,
    stage: t.stage,
    inputQty: t.input_quantity,
    outputQty: t.output_quantity,
    shrinkagePercent: t.loss_percent,
    responsible: t.responsible_name ?? '',
    date: t.occurred_at.slice(0, 10),
    alertas: t.loss_alert ? [{ tipo: t.loss_alert.type, regla: t.loss_alert.rule, causa: t.loss_alert.cause }] : [],
  }))
}
