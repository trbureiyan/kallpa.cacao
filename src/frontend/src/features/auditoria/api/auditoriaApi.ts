import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import type { AuditEntry } from '@/db/dexieDb'
import { listarFilasApi } from '@/features/inventario/api/inventarioApi'

interface EventoApi {
  id: number
  actor_name: string
  entity_type: string
  entity_id: string
  action: string
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  created_at: string
}

const ESTADO_UI: Record<string, string> = { pending: 'PENDIENTE', released: 'LIBERADO', blocked: 'BLOQUEADO' }

function resumir(v: Record<string, unknown> | null): string {
  if (!v) return 'N/A'
  return Object.entries(v)
    .slice(0, 4)
    .map(([k, x]) => `${k}: ${x}`)
    .join(', ')
}

const estadoDe = (v: Record<string, unknown> | null): string => ESTADO_UI[String(v?.status)] ?? String(v?.status ?? 'N/A')

function accionDe(e: EventoApi): AuditEntry['action'] {
  if (e.action === 'status_changed') {
    const nuevo = e.after_value?.status
    return nuevo === 'blocked' ? 'BLOQUEO' : nuevo === 'released' ? 'LIBERACIÓN' : 'EDICIÓN'
  }
  return e.action === 'inventory_consumed' || e.entity_type === 'transformation' ? 'PROCESO' : 'EDICIÓN'
}

const CAMPO: Record<string, string> = {
  status_changed: 'estado',
  received: 'recepción',
  inventory_consumed: 'disponible',
}

/** Historial global (solo administrador). El servidor lo escribe en la misma transacción que cada operación. */
export async function listarAuditoriaApi(): Promise<AuditEntry[]> {
  let eventos: EventoApi[]
  let codigoPorId: Map<number | undefined, string>
  try {
    eventos = (await axiosClient.get<EventoApi[]>('/audit')).data
    codigoPorId = new Map((await listarFilasApi('ADMINISTRADOR')).map((f) => [f.id, f.codigo]))
  } catch (e) {
    throw traducirErrorApi(e)
  }

  return (
    eventos
      // el servidor registra el cambio de estado dos veces (lote y producto); con el del lote basta
      .filter((e) => e.entity_type !== 'product')
      .map((e): AuditEntry => {
        const cambioEstado = e.action === 'status_changed'
        const lotCode =
          e.entity_type === 'lot'
            ? (codigoPorId.get(Number(e.entity_id)) ?? `Lote ${e.entity_id}`)
            : e.entity_type === 'user'
              ? `Usuario ${e.entity_id}`
              : `Transformación ${e.entity_id}`
        return {
          idLocal: e.id,
          timestamp: e.created_at,
          user: e.actor_name,
          action: accionDe(e),
          lotCode,
          fieldChanged: e.entity_type === 'user' ? 'usuario' : (CAMPO[e.action] ?? (e.entity_type === 'transformation' ? 'transformación' : e.action)),
          previousValue: cambioEstado ? estadoDe(e.before_value) : resumir(e.before_value),
          newValue: cambioEstado ? estadoDe(e.after_value) : resumir(e.after_value),
          reason: typeof e.after_value?.reason === 'string' ? e.after_value.reason : undefined,
        }
      })
  )
}
