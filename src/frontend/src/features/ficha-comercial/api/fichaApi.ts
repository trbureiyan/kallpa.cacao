import { isAxiosError } from 'axios'
import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import { estadoDeApi } from '@/api/mapeos'
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

export async function obtenerFichaLocal(lotCode: string): Promise<FichaPublica | null> {
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


interface ProductoPublicoApi {
  code: string
  status: string
  availability: string
  origin: string
  received_on: string
}

interface LineaPublicaApi {
  timeline: { kind: string; stage?: string; date: string }[]
}

// La página pública no tiene sesión, así que no hay "modo": se consulta la API y solo si no hay red se usa el
// respaldo local, y únicamente cuando el despliegue lo permite (la evaluación lo deja apagado).
const LOCAL_POR_DEFECTO = import.meta.env.VITE_PERMITIR_MODO_LOCAL === 'true'

/** Ficha pública desde el servidor. null = el lote no existe. Solo se copian los campos de la lista blanca. */
export async function obtenerFichaPublica(
  lotCode: string,
  { permitirLocal = LOCAL_POR_DEFECTO }: { permitirLocal?: boolean } = {},
): Promise<FichaPublica | null> {
  const codigo = lotCode.trim()
  if (!codigo) return null
  const ruta = `/public/products/${encodeURIComponent(codigo)}`

  try {
    const { data: p } = await axiosClient.get<ProductoPublicoApi>(ruta)
    // las etapas son un adorno de la ficha: si fallan, la ficha se muestra igual
    const etapas = await axiosClient
      .get<LineaPublicaApi>(`${ruta}/traceability`)
      .then(({ data }) =>
        data.timeline
          .filter((t) => t.kind === 'transformation' && t.stage)
          .map((t) => ({ etapa: nombreEtapa(t.stage as string), fecha: t.date.slice(0, 10) })),
      )
      .catch(() => [])
    return {
      codigo: p.code,
      origen: `${p.origin}, Huila, Colombia`,
      fechaRecepcion: p.received_on,
      estado: estadoDeApi(p.status),
      ofrecible: p.availability === 'available',
      etapas,
    }
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null
    const err = traducirErrorApi(e)
    if (err.codigo === 'SIN_RED' && permitirLocal) return obtenerFichaLocal(codigo)
    throw err
  }
}
