import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiUrl } from './api'

type Lot = {
  id: number
  code: string
  origin: string
  received_quantity: number
  consumed_quantity: number
  available_quantity: number
  unit: string
  status: string
  status_reason: string | null
  costs_cop: number
}

type AuditEvent = {
  id: number
  actor_id: number
  actor_name: string
  actor_username: string
  entity_type: string
  entity_id: string
  action: string
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  created_at: string
}

type Economy = {
  transformation_id: number
  output_code: string
  stage: string
  output_quantity: number
  unit: string
  total_cost_cop: number
  unit_cost_cop: number | null
  sale_price_cop_per_unit: number | null
  margin_on_sale_percent: number | null
  formula: string
  included_costs: string[]
  cost_policy: string
}

type View = 'inventory' | 'economics' | 'audit'

const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 })

const statusLabels: Record<string, string> = { pending: 'Pendiente', released: 'Liberado', blocked: 'Bloqueado' }

function formatValue(value: unknown) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function BusinessViews({ token, initialView = 'inventory' }: { token: string; initialView?: View }) {
  const [view, setView] = useState<View>(initialView)
  const [lots, setLots] = useState<Lot[]>([])
  const [economics, setEconomics] = useState<Economy[]>([])
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [origin, setOrigin] = useState('')
  const [status, setStatus] = useState('')
  const [auditLotId, setAuditLotId] = useState('')
  const [reasonByLot, setReasonByLot] = useState<Record<number, string>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setView(initialView) }, [initialView])

  const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(apiUrl(path), {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...init.headers },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { detail?: string }
      throw new Error(body.detail || `La solicitud falló (${response.status}).`)
    }
    return response.json() as Promise<T>
  }, [token])

  const loadLots = useCallback(async () => {
    const params = new URLSearchParams()
    if (origin) params.set('origin', origin)
    if (status) params.set('status', status)
    const result = await request<Lot[]>(`/inventory/admin${params.size ? `?${params}` : ''}`)
    setLots(result)
    if (!auditLotId && result.length) setAuditLotId(String(result[0].id))
  }, [auditLotId, origin, request, status])

  const loadEconomics = useCallback(async () => {
    setEconomics(await request<Economy[]>('/economics'))
  }, [request])

  const loadAudit = useCallback(async () => {
    if (!auditLotId) {
      setEvents([])
      return
    }
    setEvents(await request<AuditEvent[]>(`/lots/${auditLotId}/audit`))
  }, [auditLotId, request])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadLots(), loadEconomics()])
      setMessage('Información actualizada desde el servidor.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo consultar la información.')
    } finally {
      setLoading(false)
    }
  }, [loadEconomics, loadLots])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { void loadAudit().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'No se pudo cargar la auditoría.')) }, [loadAudit])

  const metrics = useMemo(() => ({
    count: lots.length,
    stock: lots.reduce((sum, lot) => sum + Number(lot.available_quantity), 0),
    blocked: lots.filter((lot) => lot.status === 'blocked').length,
  }), [lots])

  async function exportCsv() {
    setError('')
    try {
      const params = new URLSearchParams()
      if (origin) params.set('origin', origin)
      if (status) params.set('status', status)
      const response = await fetch(apiUrl(`/exports/lots.csv${params.size ? `?${params}` : ''}`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string }
        throw new Error(body.detail || `No se pudo exportar (${response.status}).`)
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'lotes.csv'
      link.click()
      URL.revokeObjectURL(url)
      setMessage('El CSV se descargó con los filtros seleccionados.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo exportar el CSV.')
    }
  }

  async function changeStatus(lot: Lot, nextStatus: string) {
    const reason = (reasonByLot[lot.id] || '').trim()
    if (reason.length < 3) {
      setError(`Escriba el motivo para cambiar el estado de ${lot.code}.`)
      return
    }
    setError('')
    try {
      await request(`/lots/${lot.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, reason }),
      })
      setMessage(`El lote ${lot.code} cambió a ${nextStatus}. El cambio quedó auditado.`)
      setReasonByLot((current) => ({ ...current, [lot.id]: '' }))
      await Promise.all([loadLots(), loadAudit()])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cambiar el estado.')
    }
  }

  return (
    <section className="business-panel" aria-labelledby="business-title">
      <div className="business-heading">
        <div><span className="eyebrow muted">ADMINISTRACIÓN</span><h2 id="business-title">Inventario, economía y auditoría</h2></div>
        <button className="button button-outline" onClick={() => void refresh()} disabled={loading}>{loading ? 'Actualizando…' : 'Actualizar'}</button>
      </div>
      <div className="business-metrics">
        <article><span>Lotes consultados</span><strong>{metrics.count}</strong></article>
        <article><span>Stock disponible</span><strong>{number.format(metrics.stock)} kg</strong></article>
        <article><span>Lotes bloqueados</span><strong>{metrics.blocked}</strong></article>
      </div>
      <nav className="business-tabs" aria-label="Vistas de administración">
        {([['inventory', 'Inventario y CSV'], ['economics', 'Balance económico'], ['audit', 'Auditoría']] as const).map(([key, label]) =>
          <button key={key} className={view === key ? 'business-tab active' : 'business-tab'} onClick={() => setView(key)}>{label}</button>)}
      </nav>
      {message && <p className="business-message" role="status">{message}</p>}
      {error && <p className="business-error" role="alert">{error}</p>}

      {view === 'inventory' && <>
        <div className="business-filters">
          <label>Origen<input value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder="Rivera, Campoalegre…" /></label>
          <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="pending">Pendiente</option><option value="released">Liberado</option><option value="blocked">Bloqueado</option></select></label>
          <button className="button button-outline" onClick={() => void loadLots()}>Aplicar filtros</button>
          <button className="button button-dark" onClick={() => void exportCsv()}>Exportar CSV</button>
        </div>
        <div className="business-table-wrap"><table className="business-table">
          <thead><tr><th>Lote</th><th>Origen</th><th>Recibido</th><th>Consumido</th><th>Disponible</th><th>Estado</th><th>Costos COP</th><th>Motivo y estado</th></tr></thead>
          <tbody>{lots.map((lot) => <tr key={lot.id}>
            <td><strong>{lot.code}</strong></td><td>{lot.origin}</td><td>{number.format(lot.received_quantity)} {lot.unit}</td>
            <td>{number.format(lot.consumed_quantity)} {lot.unit}</td><td>{number.format(lot.available_quantity)} {lot.unit}</td>
            <td><span className={`business-status status-${lot.status}`}>{statusLabels[lot.status] || lot.status}</span></td>
            <td>{currency.format(lot.costs_cop)}</td>
            <td><div className="business-status-action"><input aria-label={`Motivo del cambio para ${lot.code}`} value={reasonByLot[lot.id] || ''} onChange={(event) => setReasonByLot((current) => ({ ...current, [lot.id]: event.target.value }))} placeholder="Motivo obligatorio" />
              <select aria-label={`Nuevo estado para ${lot.code}`} value={lot.status} onChange={(event) => void changeStatus(lot, event.target.value)}>
                <option value={lot.status}>{statusLabels[lot.status] || lot.status}</option>{['pending', 'released', 'blocked'].filter((item) => item !== lot.status).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
              </select></div></td>
          </tr>)}</tbody>
        </table>{lots.length === 0 && <p className="business-empty">No hay lotes para esos filtros.</p>}</div>
      </>}

      {view === 'economics' && <>
        <p className="business-explanation">El costo unitario y el margen se calculan con los costos de etapa registrados en el libro de costos. El costo de compra queda en la recepción y se muestra aparte; no se suma a este indicador.</p>
        <div className="business-table-wrap"><table className="business-table">
          <thead><tr><th>Producto</th><th>Etapa</th><th>Salida</th><th>Costo de etapa</th><th>Costo unitario</th><th>Precio propuesto</th><th>Margen sobre venta</th></tr></thead>
          <tbody>{economics.map((item) => <tr key={item.transformation_id}>
            <td><strong>{item.output_code}</strong></td><td>{item.stage}</td><td>{number.format(item.output_quantity)} {item.unit}</td>
            <td>{currency.format(item.total_cost_cop)}</td><td>{item.unit_cost_cop === null ? 'No calculable: salida 0' : `${currency.format(item.unit_cost_cop)} / ${item.unit}`}</td>
            <td>{item.sale_price_cop_per_unit === null ? 'Sin precio' : `${currency.format(item.sale_price_cop_per_unit)} / ${item.unit}`}</td>
            <td>{item.margin_on_sale_percent === null ? 'No calculable' : `${number.format(item.margin_on_sale_percent)} %`}</td>
          </tr>)}</tbody>
        </table>{economics.length === 0 && <p className="business-empty">Aún no hay transformaciones con indicadores económicos.</p>}</div>
        {economics[0] && <div className="business-formula"><strong>Fórmulas aplicadas</strong><p>{economics[0].formula}</p><p>{economics[0].cost_policy}</p><p>Categorías usadas: {economics[0].included_costs.join(', ') || 'sin costos registrados'}.</p></div>}
      </>}

      {view === 'audit' && <>
        <div className="business-filters"><label>Lote<select value={auditLotId} onChange={(event) => setAuditLotId(event.target.value)}>{lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.code} · {lot.origin}</option>)}</select></label></div>
        <div className="business-table-wrap"><table className="business-table">
          <thead><tr><th>Fecha del servidor</th><th>Usuario ID</th><th>Entidad</th><th>Acción</th><th>Valor anterior</th><th>Valor nuevo</th></tr></thead>
          <tbody>{events.map((event) => <tr key={event.id}><td>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(event.created_at))}</td><td>{event.actor_name} ({event.actor_username}) · #{event.actor_id}</td><td>{event.entity_type} {event.entity_id}</td><td>{event.action}</td><td>{formatValue(event.before_value)}</td><td>{formatValue(event.after_value)}</td></tr>)}</tbody>
        </table>{events.length === 0 && <p className="business-empty">No hay eventos de auditoría para ese lote.</p>}</div>
        <p className="business-explanation">El historial es de solo lectura. Cada evento conserva actor, hora, acción y valores anterior/nuevo cuando aplica.</p>
      </>}
    </section>
  )
}
