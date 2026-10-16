import type { EstadoLote } from '@/types/app'
import { nombreEtapa } from '@/utils/etapas'

// [DECISION] lista blanca de campos — la ficha se arma campo por campo y nunca se reutiliza el registro interno,
// para que costos, productor y notas no puedan filtrarse al agregar columnas nuevas.
// En fase 1 sin backend se carga Dexie de forma diferida (import dinámico) para que el chunk de la ficha
// pública sea ultra liviano y no arrastre la base de datos completa al cargar la página pública.
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

  const [{ db }, { disponibleKg }] = await Promise.all([
    import('@/db/dexieDb'),
    import('@/features/inventario/api/inventarioDb'),
  ])

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
