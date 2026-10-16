import { db, type ProcesoOffline } from '@/db/dexieDb'
import { registrarAuditoria } from '@/features/auditoria/api/auditoriaDb'
import { consumirExistencia, disponibleKg } from '@/features/inventario/api/inventarioDb'
import { ahoraISO } from '@/utils/clock'
import { calcularMerma } from '@/utils/calculations'
import { ErrorDominio } from '@/utils/errores'
import { validarTransformacion } from '../reglas'

export interface DatosProceso {
  lotCode: string
  stage: string
  inputQty: number
  outputQty: number
  responsible: string
  costoTotalCOP?: number
  precioVentaCOP?: number
  justificacion?: string
  incidencias?: string
  notes?: string
  claveIdempotencia: string
}

/**
 * Registra una transformación: valida, consume existencia, guarda y audita en una transacción.
 * Misma claveIdempotencia = misma operación: devuelve el proceso original sin consumir otra vez.
 */
export async function registrarProcesoLocal(d: DatosProceso): Promise<ProcesoOffline> {
  return db.transaction('rw', db.recepciones, db.procesos, db.movimientos, db.auditLogs, async () => {
    const previo = await db.procesos.where('claveIdempotencia').equals(d.claveIdempotencia).first()
    if (previo) return previo

    const lote = await db.recepciones.where('lotCode').equals(d.lotCode).first()
    if (!lote) {
      throw new ErrorDominio(
        'LOTE_NO_ENCONTRADO',
        `No se registró la transformación. El lote ${d.lotCode} no existe. Seleccione un lote registrado en Recepción.`,
      )
    }

    const disponible = await disponibleKg(d.lotCode)
    const errores = validarTransformacion({
      entradaKg: d.inputQty,
      salidaKg: d.outputQty,
      disponibleKg: disponible,
      justificacion: d.justificacion,
    })
    if (errores.length > 0) {
      const sinExistencia = Number.isFinite(d.inputQty) && d.inputQty > disponible
      throw new ErrorDominio(sinExistencia ? 'EXISTENCIA_INSUFICIENTE' : 'DATO_INVALIDO', errores.join(' '))
    }

    await consumirExistencia({ lotCode: d.lotCode, kg: d.inputQty, claveIdempotencia: d.claveIdempotencia })

    const proceso: ProcesoOffline = {
      lotCode: d.lotCode,
      stage: d.stage,
      inputQty: d.inputQty,
      outputQty: d.outputQty,
      shrinkagePercent: calcularMerma(d.inputQty, d.outputQty),
      responsible: d.responsible.trim(),
      date: ahoraISO().slice(0, 10),
      notes: d.notes,
      claveIdempotencia: d.claveIdempotencia,
      costoTotalCOP: d.costoTotalCOP,
      precioVentaCOP: d.precioVentaCOP,
      justificacion: d.justificacion?.trim() || undefined,
      incidencias: d.incidencias?.trim() || undefined,
    }
    proceso.idLocal = await db.procesos.add(proceso)

    await registrarAuditoria({
      user: proceso.responsible || 'Operador',
      action: 'PROCESO',
      fieldChanged: 'disponible',
      previousValue: `${disponible} kg`,
      newValue: `${disponible - d.inputQty} kg`,
      lotCode: d.lotCode,
      reason: `Etapa ${d.stage}: entrada ${d.inputQty} kg, salida ${d.outputQty} kg`,
    })
    return proceso
  })
}
