import { db } from '@/db/dexieDb'
import { disponibleKg } from '@/features/inventario/api/inventarioDb'
import type { IconName } from '@/types/app'
import { formatearKg, formatearPct } from '@/utils/formato'

export interface TimelineStep {
  title: string
  description: string
  date: string
  icon: IconName
}

export interface TraceInfo {
  lotCode: string
  producer: string
  origin: string
  availableQty: number
  status: string
  steps: TimelineStep[]
}

/** Recorrido del lote armado solo con registros guardados: recepción, etapas y cambios de estado. */
export async function obtenerTrazabilidadLote(lotCode: string): Promise<TraceInfo | null> {
  const lote = await db.recepciones.where('lotCode').equals(lotCode).first()
  if (!lote) return null

  const [procesos, auditoria, disponible] = await Promise.all([
    db.procesos.where('lotCode').equals(lotCode).toArray(),
    db.auditLogs.where('lotCode').equals(lotCode).toArray(),
    disponibleKg(lotCode),
  ])

  const etapas: TimelineStep[] = procesos.map((p) => ({
    title: `Transformación (${p.stage})`,
    description: `Entrada: ${formatearKg(p.inputQty)} · Salida: ${formatearKg(p.outputQty)} · Merma: ${
      p.shrinkagePercent === null ? 'no calculable' : formatearPct(p.shrinkagePercent)
    }`,
    date: p.date,
    icon: 'process',
  }))

  const cambios: TimelineStep[] = auditoria
    .filter((a) => a.action === 'BLOQUEO' || a.action === 'LIBERACIÓN')
    .map((a) => ({
      title: `Estado: ${a.newValue}`,
      description: `${a.reason ?? 'Sin motivo registrado'} · ${a.user}`,
      date: a.timestamp.slice(0, 10),
      icon: a.action === 'BLOQUEO' ? 'lock' : 'certificate',
    }))

  // Orden estable por fecha: en un mismo día las etapas van antes que los cambios de estado
  const posteriores = [...etapas, ...cambios].sort((a, b) => a.date.localeCompare(b.date))

  return {
    lotCode: lote.lotCode,
    producer: lote.producer,
    origin: `${lote.origin}, Huila`,
    availableQty: disponible,
    status: lote.status ?? 'PENDIENTE',
    steps: [
      { title: 'Origen en finca', description: `${lote.producer} · ${lote.origin}`, date: lote.date, icon: 'sprout' },
      {
        title: 'Recepción del lote',
        description: `${lote.lotCode} · Peso recibido: ${formatearKg(lote.quantity)}`,
        date: lote.date,
        icon: 'box',
      },
      ...posteriores,
    ],
  }
}
