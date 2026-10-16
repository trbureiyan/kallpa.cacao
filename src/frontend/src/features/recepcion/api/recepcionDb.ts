import { db, type RecepcionOffline } from '@/db/dexieDb'
import { registrarAuditoria } from '@/features/auditoria/api/auditoriaDb'
import { registrarMovimientoRecibido } from '@/features/inventario/api/inventarioDb'
import { ErrorDominio } from '@/utils/errores'

export async function obtenerTodasRecepciones(): Promise<RecepcionOffline[]> {
  return await db.recepciones.orderBy('idLocal').reverse().toArray()
}

const invalido = (que: string, hacer: string) =>
  new ErrorDominio('DATO_INVALIDO', `No se guardó el lote. ${que} Corrija el dato: ${hacer}`)

async function siguienteCodigo(): Promise<string> {
  const codigos = await db.recepciones.toArray()
  const max = codigos.reduce((m, l) => Math.max(m, Number(/^CAC(\d+)$/.exec(l.lotCode)?.[1] ?? 0)), 0)
  return `CAC${String(max + 1).padStart(3, '0')}`
}

/** Único camino de escritura de recepciones: lote, movimiento y auditoría juntos o nada. */
export async function guardarRecepcionLocal(datos: {
  lotCode?: string
  producer: string
  origin: string
  date: string
  quantity: number
  unit: string
  usuario?: string
}): Promise<RecepcionOffline> {
  if (!datos.producer.trim()) throw invalido('Falta el productor.', 'seleccione un productor.')
  if (!datos.origin.trim()) throw invalido('Falta el municipio de origen.', 'seleccione el origen.')
  if (!datos.date) throw invalido('Falta la fecha de recepción.', 'indique la fecha.')
  if (!Number.isFinite(datos.quantity) || datos.quantity <= 0) {
    throw invalido('La cantidad recibida debe ser un número mayor a 0 kg.', 'escriba el peso neto, por ejemplo 100 o 12,5.')
  }

  return db.transaction('rw', db.recepciones, db.movimientos, db.auditLogs, async () => {
    const lotCode = datos.lotCode?.trim() || (await siguienteCodigo())
    if (await db.recepciones.where('lotCode').equals(lotCode).first()) {
      throw new ErrorDominio(
        'LOTE_DUPLICADO',
        `No se guardó el lote. El código ${lotCode} ya existe y duplicaría el registro. Use otro código o deje el campo vacío para asignarlo automáticamente.`,
      )
    }

    const lote: RecepcionOffline = {
      idempotencyKey: crypto.randomUUID(),
      lotCode,
      producer: datos.producer.trim(),
      origin: datos.origin.trim(),
      date: datos.date,
      quantity: datos.quantity,
      unit: datos.unit || 'kg',
      syncStatus: 'PENDING',
      status: 'PENDIENTE',
    }
    lote.idLocal = await db.recepciones.add(lote)
    await registrarMovimientoRecibido(lotCode, datos.quantity)
    await registrarAuditoria({
      user: datos.usuario ?? 'Operador Campo',
      action: 'EDICIÓN',
      fieldChanged: 'recepciones',
      previousValue: 'N/A',
      newValue: `Lote ${lotCode} (${datos.quantity} ${lote.unit})`,
      lotCode,
      reason: 'Recepción de lote',
    })
    return lote
  })
}


/**
 * Modo API: solo se encola la captura. El servidor crea lote, movimiento, costo y auditoría al sincronizar,
 * así que aquí no se escribe movimiento ni auditoría local (duplicarían lo del servidor).
 */
export async function encolarRecepcionApi(datos: {
  farmId: number
  farmName: string
  region?: string
  date: string
  quantity: number
  purchaseTotalCop: number
  qualityNotes?: string
}): Promise<RecepcionOffline> {
  if (!datos.farmId) throw invalido('Falta la finca.', 'seleccione una finca.')
  if (!datos.date) throw invalido('Falta la fecha de recepción.', 'indique la fecha.')
  if (!Number.isFinite(datos.quantity) || datos.quantity <= 0) {
    throw invalido('La cantidad recibida debe ser un número mayor a 0 kg.', 'escriba el peso neto, por ejemplo 100 o 12,5.')
  }
  if (!Number.isFinite(datos.purchaseTotalCop) || datos.purchaseTotalCop < 0) {
    throw invalido('El costo de compra no puede ser negativo.', 'escriba 0 o un valor en COP.')
  }

  const idempotencyKey = crypto.randomUUID()
  const lote: RecepcionOffline = {
    idempotencyKey,
    // provisional: el servidor asigna el código CACxxx al sincronizar
    lotCode: `PEND-${idempotencyKey.slice(0, 8).toUpperCase()}`,
    producer: datos.farmName,
    origin: datos.region ?? '',
    date: datos.date,
    quantity: datos.quantity,
    unit: 'kg',
    syncStatus: 'PENDING',
    status: 'PENDIENTE',
    farmId: datos.farmId,
    purchaseTotalCop: datos.purchaseTotalCop,
    qualityNotes: datos.qualityNotes?.trim() || undefined,
  }
  lote.idLocal = await db.recepciones.add(lote)
  return lote
}
