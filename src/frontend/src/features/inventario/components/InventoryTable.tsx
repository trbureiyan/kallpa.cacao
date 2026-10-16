import { Badge, Button } from '@/components/ui'
import { DataTable } from '@/components/shared'
import type { InventarioAdmin } from '@/api/tipos'
import { estadoDe } from '@/shared/etiquetas'
import { formatoCop, formatoKg } from '@/shared/formato'

interface Props {
  lotes: InventarioAdmin[]
  onCambiarEstado: (lote: InventarioAdmin) => void
}

export function InventoryTable({ lotes, onCambiarEstado }: Props) {
  return (
    <DataTable headers={['Lote', 'Origen', 'Recibido', 'Consumido', 'Disponible', 'Costos acumulados', 'Estado', 'Acción']}>
      {lotes.length === 0 ? (
        <tr>
          <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem' }}>
            No hay lotes con esos filtros.
          </td>
        </tr>
      ) : (
        lotes.map((l) => {
          const e = estadoDe(l.status)
          return (
            <tr key={l.id}>
              <td><strong>{l.code}</strong></td>
              <td>{l.origin}</td>
              <td>{formatoKg(l.received_quantity)}</td>
              <td>{formatoKg(l.consumed_quantity)}</td>
              <td><strong>{formatoKg(l.available_quantity)}</strong></td>
              <td>{formatoCop(l.costs_cop)}</td>
              <td>
                <Badge tone={e.tono}>{e.etiqueta}</Badge>
                {l.status_reason && <small style={{ display: 'block' }}>{l.status_reason}</small>}
              </td>
              <td>
                <Button variant="secondary" onClick={() => onCambiarEstado(l)}>
                  Cambiar estado
                </Button>
              </td>
            </tr>
          )
        })
      )}
    </DataTable>
  )
}
