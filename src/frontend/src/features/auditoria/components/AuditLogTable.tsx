import { Badge } from '@/components/ui'
import { DataTable } from '@/components/shared'
import type { EventoAuditoria } from '@/api/tipos'
import { ACCIONES_AUDITORIA, estadoDe } from '@/shared/etiquetas'
import { formatoFechaHora } from '@/shared/formato'

// Resume un valor anterior/nuevo del servidor en una línea legible. Los estados se muestran con su etiqueta.
function resumen(valor: Record<string, unknown> | null): string {
  if (!valor) return '—'
  return Object.entries(valor)
    .filter(([, v]) => v !== null && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${k === 'status' ? estadoDe(String(v)).etiqueta : String(v)}`)
    .join(' · ')
}

export function AuditLogTable({ eventos }: { eventos: EventoAuditoria[] }) {
  return (
    <DataTable headers={['Fecha y hora (servidor)', 'Usuario', 'Acción', 'Entidad', 'Valor anterior', 'Valor nuevo', 'Motivo']}>
      {eventos.length === 0 ? (
        <tr>
          <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
            No hay eventos registrados para este lote.
          </td>
        </tr>
      ) : (
        eventos.map((ev) => (
          <tr key={ev.id}>
            <td>{formatoFechaHora(ev.created_at)}</td>
            <td><strong>{ev.actor_name}</strong></td>
            <td><Badge tone={ev.action === 'status_changed' ? 'brown' : 'slate'}>{ACCIONES_AUDITORIA[ev.action] ?? ev.action}</Badge></td>
            <td>{ev.entity_type} {ev.entity_id}</td>
            <td><small>{resumen(ev.before_value)}</small></td>
            <td><small>{resumen(ev.after_value)}</small></td>
            <td>{typeof ev.after_value?.reason === 'string' ? ev.after_value.reason : '—'}</td>
          </tr>
        ))
      )}
    </DataTable>
  )
}
