import { db } from '@/db/dexieDb'
import { disponibleKg } from '@/features/inventario/api/inventarioDb'
import type { EstadoLote } from '@/types/app'
import { nombreEtapa } from '@/utils/etapas'

// [DECISION] lista blanca de campos — la ficha se arma campo por campo y nunca se reutiliza el registro interno,
// para que costos, productor y notas no puedan filtrarse al agregar columnas nuevas.
export interface FichaPublica {
  codigo: string
  origen: string
  fechaRecepcion: string
  estado: EstadoLote
  ofrecible: boolean
  etapas: { etapa: string; fecha: string }[]
}

export async function obtenerFichaPublica(lotCode: string): Promise<FichaPublica | null> {
  const codigo = lotCode.trim()
  if (!codigo) return null
  const lote = await db.recepciones.where('lotCode').equals(codigo).first()
  if (!lote) return null

  const [procesos, disponible] = await Promise.all([
    db.procesos.where('lotCode').equals(codigo).toArray(),
    disponibleKg(codigo),
  ])
  const estado: EstadoLote = lote.status ?? 'PENDIENTE'

  return {
    codigo: lote.lotCode,
    origen: `${lote.origin}, Huila, Colombia`,
    fechaRecepcion: lote.date,
    estado,
    ofrecible: estado === 'LIBERADO' && disponible > 0,
    etapas: procesos.map((p) => ({ etapa: nombreEtapa(p.stage), fecha: p.date })),
  }
}
