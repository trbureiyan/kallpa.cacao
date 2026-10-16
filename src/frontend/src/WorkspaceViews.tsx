import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiRequest, fetchPublicProduct, fetchPublicTraceability, type ApiAlert, type ApiLot, type ApiTransformation, type PublicProduct, type PublicTraceability } from './api'

type Page = 'dashboard' | 'transformacion' | 'trazabilidad' | 'inventario' | 'alertas' | 'publico'
type PendingTransformation = {
  fingerprint: string
  key: string
  payload: Record<string, unknown>
  form: { lotId: string; stage: string; productType: string; input: string; output: string; outputCode: string; cost: string; salePrice: string; incident: string }
}
const pendingTransformationStorageKey = 'cacao-pending-transformation'

function readPendingTransformation(): PendingTransformation | null {
  try {
    const raw = sessionStorage.getItem(pendingTransformationStorageKey)
    return raw ? JSON.parse(raw) as PendingTransformation : null
  } catch { return null }
}
type Analytics = {
  loss_by_origin: Array<{ origin: string; input_kg: number; loss_kg: number; loss_percent: number | null; transformations: number }>
  loss_by_producer: Array<{ producer: string; input_kg: number; loss_kg: number; loss_percent: number | null; transformations: number }>
  lowest_margins: Array<{ lot_code: string; stage: string; margin_on_sale_percent: number; unit_cost_cop: number; sale_price_cop_per_unit: number; unit: string }>
  blocked_lots: Array<{ code: string; origin: string; reason: string | null; available_quantity: number; unit: string }>
  open_alerts: ApiAlert[]
}

const number = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

function ErrorMessage({ value }: { value: string }) {
  return value ? <p className="view-error" role="alert">{value}</p> : null
}

function Loading({ value }: { value: boolean }) {
  return value ? <p className="view-muted" role="status">Consultando datos del servidor…</p> : null
}

export default function WorkspaceViews({ page, token, role }: { page: Page; token: string; role: string }) {
  if (page === 'dashboard') return <DashboardView token={token} role={role} />
  if (page === 'transformacion') return <TransformationView token={token} />
  if (page === 'trazabilidad') return <TraceabilityView token={token} />
  if (page === 'inventario') return <InventoryView token={token} />
  if (page === 'alertas') return <AlertsView token={token} />
  return <PublicProductView />
}

function DashboardView({ token, role }: { token: string; role: string }) {
  const [lots, setLots] = useState<ApiLot[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      apiRequest<ApiLot[]>(token, '/inventory'),
      role === 'admin' ? apiRequest<Analytics>(token, '/analytics/dashboard') : Promise.resolve(null),
    ]).then(([inventory, summary]) => {
      if (!active) return
      setLots(inventory)
      setAnalytics(summary)
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el panel.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [role, token])

  const metrics = useMemo(() => ({
    total: lots.length,
    available: lots.reduce((sum, lot) => sum + Number(lot.available_quantity), 0),
    blocked: lots.filter((lot) => lot.status === 'blocked').length,
  }), [lots])

  return <section className="workspace-page">
    <div className="page-title"><div><span className="eyebrow muted">RESUMEN GENERAL</span><h1>Panel de operaciones</h1><p>Indicadores consultados desde el servidor.</p></div></div>
    <Loading value={loading} /><ErrorMessage value={error} />
    <div className="business-metrics">
      <article><span>Lotes registrados</span><strong>{metrics.total}</strong></article>
      <article><span>Stock disponible</span><strong>{number.format(metrics.available)} kg</strong></article>
      <article><span>Lotes bloqueados</span><strong>{metrics.blocked}</strong></article>
      <article><span>Alertas abiertas</span><strong>{analytics?.open_alerts.length ?? '—'}</strong></article>
    </div>
    {role === 'admin' && analytics && <>
      <div className="workspace-columns">
        <article className="workspace-card"><h2>Merma por municipio</h2>
          {analytics.loss_by_origin.length ? analytics.loss_by_origin.map((item) => <p key={item.origin}><strong>{item.origin}</strong><span>{number.format(item.loss_kg)} kg · {number.format(item.loss_percent ?? 0)} %</span></p>) : <p className="view-muted">Aún no hay transformaciones.</p>}
        </article>
        <article className="workspace-card"><h2>Merma por productor</h2>
          {analytics.loss_by_producer.length ? analytics.loss_by_producer.map((item) => <p key={item.producer}><strong>{item.producer}</strong><span>{number.format(item.loss_kg)} kg · {number.format(item.loss_percent ?? 0)} %</span></p>) : <p className="view-muted">Aún no hay transformaciones.</p>}
        </article>
      </div>
      <div className="workspace-columns">
        <article className="workspace-card"><h2>Lotes con menor margen</h2>
          {analytics.lowest_margins.length ? analytics.lowest_margins.map((item) => <p key={`${item.lot_code}-${item.stage}`}><strong>{item.lot_code} · {item.stage}</strong><span>{number.format(item.margin_on_sale_percent)} % · costo {money.format(item.unit_cost_cop)}/{item.unit}</span></p>) : <p className="view-muted">Sin márgenes calculables por ahora.</p>}
        </article>
        <article className="workspace-card"><h2>Lotes bloqueados y alertas</h2>
          {analytics.blocked_lots.map((item) => <p key={item.code}><strong>{item.code} · Bloqueado</strong><span>{item.reason || 'Sin motivo'} · {item.origin}</span></p>)}
          {analytics.open_alerts.map((item, index) => <p key={`${item.entity}-${index}`}><strong>{item.entity} · {item.rule}</strong><span>{item.cause}</span></p>)}
          {!analytics.blocked_lots.length && !analytics.open_alerts.length && <p className="view-muted">Sin bloqueos ni alertas.</p>}
        </article>
      </div>
    </>}
  </section>
}

function TransformationView({ token }: { token: string }) {
  const [pendingTransformation, setPendingTransformation] = useState<PendingTransformation | null>(readPendingTransformation)
  const [lots, setLots] = useState<ApiLot[]>([])
  const [items, setItems] = useState<ApiTransformation[]>([])
  const [lotId, setLotId] = useState(pendingTransformation?.form.lotId || '')
  const [stage, setStage] = useState(pendingTransformation?.form.stage || 'Fermentación')
  const [productType, setProductType] = useState(pendingTransformation?.form.productType || 'dried_cocoa')
  const [input, setInput] = useState(pendingTransformation?.form.input || '')
  const [output, setOutput] = useState(pendingTransformation?.form.output || '')
  const [outputCode, setOutputCode] = useState(pendingTransformation?.form.outputCode || '')
  const [cost, setCost] = useState(pendingTransformation?.form.cost || '0')
  const [salePrice, setSalePrice] = useState(pendingTransformation?.form.salePrice || '')
  const [incident, setIncident] = useState(pendingTransformation?.form.incident || '')
  const [message, setMessage] = useState(pendingTransformation ? 'Hay un envío anterior cuyo resultado debe confirmarse. Se conserva la misma clave para reintentar sin duplicar consumo.' : '')
  const [serverAlert, setServerAlert] = useState<ApiTransformation['loss_alert']>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const availableLots = lots.filter((lot) => lot.status !== 'blocked' && Number(lot.available_quantity) > 0)
  const selectedLot = lots.find((lot) => lot.id === Number(lotId))
  const shrinkage = Number(input) > 0 ? ((Number(input) - Number(output || 0)) / Number(input)) * 100 : null

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [inventory, transformations] = await Promise.all([
        apiRequest<ApiLot[]>(token, '/inventory'), apiRequest<ApiTransformation[]>(token, '/transformations'),
      ])
      setLots(inventory)
      setItems(transformations)
      if (!lotId && inventory.length) setLotId(String(inventory[0].id))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los datos.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [token])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setMessage('')
    if (!selectedLot) return setError('Selecciona un lote disponible.')
    if (Number(input) > Number(selectedLot.available_quantity)) return setError(`Stock insuficiente. Disponible: ${selectedLot.available_quantity} ${selectedLot.unit}.`)
    const formSnapshot = { lotId, stage, productType, input, output, outputCode: outputCode.trim().toUpperCase(), cost: cost || '0', salePrice, incident: incident.trim() }
    const fingerprint = JSON.stringify(formSnapshot)
    let pending = pendingTransformation
    if (pending && pending.fingerprint !== fingerprint) {
      return setError('Hay un envío anterior sin confirmar. Mantén sus datos y reinténtalo antes de iniciar otra transformación.')
    }
    if (!pending) {
      const key = crypto.randomUUID()
      const payload = {
        idempotency_key: key, lot_id: selectedLot.id, stage,
        occurred_at: new Date().toISOString(), input_quantity: Number(input), output_quantity: Number(output),
        unit: selectedLot.unit, incident: incident.trim() || null,
        output_code: outputCode.trim().toUpperCase(), product_type: productType,
        outputs: [{ lot_code: outputCode.trim().toUpperCase(), product_type: productType, quantity: Number(output), unit: selectedLot.unit }],
        costs_cop: Number(cost || 0), sale_price_cop_per_unit: salePrice ? Number(salePrice) : null,
      }
      pending = { fingerprint, key, payload, form: formSnapshot }
      sessionStorage.setItem(pendingTransformationStorageKey, JSON.stringify(pending))
      setPendingTransformation(pending)
    }
    try {
      const result = await apiRequest<ApiTransformation>(token, '/transformations', {
        method: 'POST', body: JSON.stringify(pending.payload),
      })
      sessionStorage.removeItem(pendingTransformationStorageKey)
      setPendingTransformation(null)
      setServerAlert(result.loss_alert)
      setMessage(`Transformación ${result.id} guardada. Producto: ${result.output_code ?? result.outputs[0]?.lot_code}. El servidor registró consumo, producción y auditoría.`)
      setInput(''); setOutput(''); setOutputCode(''); setProductType('dried_cocoa'); setCost('0'); setSalePrice(''); setIncident('')
      await refresh()
    } catch (reason) {
      const status = reason instanceof Error && 'status' in reason ? Number(reason.status) : 0
      if (status >= 400 && status < 500) {
        sessionStorage.removeItem(pendingTransformationStorageKey)
        setPendingTransformation(null)
      }
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la transformación.')
    }
  }

  return <section className="workspace-page">
    <div className="page-title"><div><span className="eyebrow muted">RF02 · RF04 · RF08</span><h1>Transformación de cacao</h1><p>El backend valida el inventario y guarda toda la operación en una transacción.</p></div><button className="button button-outline" onClick={() => void refresh()}>Actualizar</button></div>
    <Loading value={loading} /><ErrorMessage value={error} />{message && <p className="business-message" role="status">{message}</p>}
    {serverAlert && <div className="view-warning" role="alert"><strong>Alerta del servidor: {serverAlert.rule}</strong><p>{serverAlert.cause}</p><b>Merma: {number.format(serverAlert.value_percent)} %</b></div>}
    <div className="workspace-columns">
      <form className="workspace-card form-stack" onSubmit={submit}>
        <label>Lote de entrada<select value={lotId} onChange={(event) => setLotId(event.target.value)} required><option value="">Selecciona lote</option>{availableLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.code} · {lot.origin} · {number.format(lot.available_quantity)} kg</option>)}</select></label>
          <label>Etapa<select value={stage} onChange={(event) => setStage(event.target.value)}><option>Fermentación</option><option>Secado</option><option>Almacenamiento</option></select></label>
        <label>Tipo de producto de salida<select value={productType} onChange={(event) => setProductType(event.target.value)}><option value="fermented_cocoa">Cacao fermentado</option><option value="dried_cocoa">Cacao seco</option><option value="processed_cocoa">Cacao procesado</option></select></label>
        <div className="workspace-form-grid">
          <label>Entrada (kg)<input type="number" min="0.001" step="0.001" value={input} onChange={(event) => setInput(event.target.value)} required /></label>
          <label>Salida (kg)<input type="number" min="0.001" step="0.001" value={output} onChange={(event) => setOutput(event.target.value)} required /></label>
          <label>Código del producto<input value={outputCode} onChange={(event) => setOutputCode(event.target.value.toUpperCase())} minLength={2} required /></label>
          <label>Costo de etapa (COP)<input type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} /></label>
          <label>Precio propuesto (COP/kg)<input type="number" min="0" step="0.01" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} /></label>
        </div>
        <label>Incidencias / justificación<textarea value={incident} onChange={(event) => setIncident(event.target.value)} rows={3} /></label>
        {selectedLot && <p className="view-info">Stock actual: {number.format(selectedLot.available_quantity)} kg. La persona responsable se toma de la sesión autenticada.</p>}
        {shrinkage !== null && <p className={shrinkage > 15 ? 'view-warning' : 'view-info'}>Merma calculada para orientar: ({input} − {output || 0}) / {input} × 100 = {number.format(shrinkage)} %. La alerta definitiva proviene del servidor.</p>}
        <button className="button button-primary" type="submit" disabled={loading || !selectedLot}>Guardar transformación</button>
      </form>
      <article className="workspace-card"><h2>Historial de transformaciones</h2>{items.length ? items.map((item) => <div className="history-item" key={item.id}><strong>{item.stage} · {item.outputs.map((out) => out.lot_code).join(', ') || item.output_code}</strong><span>{item.input_quantity} kg → {item.output_quantity} kg · responsable: {item.responsible_name}</span><small>{new Date(item.occurred_at).toLocaleString('es-CO')}</small></div>) : <p className="view-muted">Aún no hay transformaciones en el servidor.</p>}</article>
    </div>
  </section>
}

function TraceabilityView({ token }: { token: string }) {
  const [lots, setLots] = useState<ApiLot[]>([])
  const [lotId, setLotId] = useState('')
  const [trace, setTrace] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { apiRequest<ApiLot[]>(token, '/lots').then((result) => { setLots(result); if (result[0]) setLotId(String(result[0].id)) }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los lotes.')) }, [token])
  useEffect(() => { if (!lotId) return; setTrace(null); apiRequest<Record<string, any>>(token, `/lots/${lotId}/traceability`).then(setTrace).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'No se pudo consultar la trazabilidad.')) }, [lotId, token])
  const sourceLots = trace?.origin_lots || []
  const up = trace?.upstream_transformations || []
  const down = trace?.downstream_transformations || []
  return <section className="workspace-page"><div className="page-title"><div><span className="eyebrow muted">RF03 · HISTORIAL</span><h1>Trazabilidad del lote</h1><p>Recorrido reconstruido desde los registros del servidor.</p></div></div>
    <ErrorMessage value={error} /><label className="trace-select">Seleccionar lote<select value={lotId} onChange={(event) => setLotId(event.target.value)}><option value="">Selecciona</option>{lots.map((lot) => <option value={lot.id} key={lot.id}>{lot.code} · {lot.origin}</option>)}</select></label>
    {trace && <div className="timeline"><article><span className="timeline-dot"/><div><strong>Origen: {sourceLots.map((item: any) => `${item.producer?.name ?? 'Productor'} · ${item.lot?.origin ?? ''}`).join(' / ') || trace.lot.origin}</strong><p>Lote consultado: {trace.lot.code} · {trace.lot.received_quantity} {trace.lot.unit}</p></div></article>
      {up.map((item: any, index: number) => <article key={`up-${index}`}><span className="timeline-dot"/><div><strong>{item.transformation.stage}</strong><p>{item.input_lot?.code} → {item.output_lot?.code} · entrada {item.transformation.input_quantity} {item.transformation.unit}</p></div></article>)}
      {down.map((item: any, index: number) => <article key={`down-${index}`}><span className="timeline-dot"/><div><strong>{item.transformation.stage}</strong><p>{item.input_lot?.code} → {item.outputs.map((output: any) => `${output.lot.code} (${output.quantity} kg)`).join(', ') || 'sin salida'}</p></div></article>)}
      <article><span className="timeline-dot final"/><div><strong>Estado actual: {trace.lot.status}</strong><p>Disponible: {trace.current_inventory} {trace.unit}{trace.lot.status_reason ? ` · Motivo: ${trace.lot.status_reason}` : ''}</p></div></article>
    </div>}</section>
}

function InventoryView({ token }: { token: string }) {
  const [lots, setLots] = useState<ApiLot[]>([])
  const [error, setError] = useState('')
  useEffect(() => { apiRequest<ApiLot[]>(token, '/inventory').then(setLots).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'No se pudo cargar inventario.')) }, [token])
  return <section className="workspace-page"><div className="page-title"><div><span className="eyebrow muted">RF08</span><h1>Inventario disponible</h1><p>Existencias consultadas desde la API; las operaciones se validan en el servidor.</p></div></div><ErrorMessage value={error} />
    <div className="business-table-wrap"><table className="business-table"><thead><tr><th>Lote</th><th>Producto</th><th>Origen</th><th>Disponible</th><th>Estado</th></tr></thead><tbody>{lots.map((lot) => <tr key={lot.id}><td><strong>{lot.code}</strong></td><td>{lot.product_type}</td><td>{lot.origin}</td><td>{number.format(lot.available_quantity)} {lot.unit}</td><td><span className={`business-status status-${lot.status}`}>{lot.status}</span></td></tr>)}</tbody></table>{!lots.length && <p className="business-empty">No hay lotes.</p>}</div>
  </section>
}

function AlertsView({ token }: { token: string }) {
  const [alerts, setAlerts] = useState<ApiAlert[]>([])
  const [error, setError] = useState('')
  useEffect(() => { apiRequest<ApiAlert[]>(token, '/alerts').then(setAlerts).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las alertas.')) }, [token])
  return <section className="workspace-page"><div className="page-title"><div><span className="eyebrow muted">RF04</span><h1>Alertas operativas</h1><p>Regla y causa entregadas por el backend.</p></div></div><ErrorMessage value={error} />{alerts.length ? <div className="workspace-columns">{alerts.map((alert, index) => <article className="workspace-card alert-card" key={`${alert.entity}-${index}`}><span className="business-status status-blocked">{alert.type}</span><h2>{alert.entity}</h2><strong>{alert.rule}</strong><p>{alert.cause}</p>{alert.value_percent !== undefined && <b>Merma: {number.format(alert.value_percent)} %</b>}</article>)}</div> : <p className="view-muted">No hay alertas con las reglas configuradas.</p>}</section>
}

function PublicProductView() {
  const queryCode = new URLSearchParams(window.location.search).get('producto') || ''
  const [code, setCode] = useState(queryCode)
  const [product, setProduct] = useState<PublicProduct | null>(null)
  const [publicTrace, setPublicTrace] = useState<PublicTraceability | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function lookup(event?: FormEvent) {
    event?.preventDefault(); setError(''); setProduct(null); setLoading(true)
    try {
      const value = code.trim().toUpperCase()
      const [profile, timeline] = await Promise.all([fetchPublicProduct(value), fetchPublicTraceability(value)])
      setProduct(profile); setPublicTrace(timeline)
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se encontró la ficha.') }
    finally { setLoading(false) }
  }
  useEffect(() => { if (queryCode) void lookup() }, [])
  return <section className="workspace-page public-product"><div className="page-title"><div><span className="eyebrow muted">FICHA COMERCIAL PÚBLICA</span><h1>Origen del cacao, con historia</h1><p>Consulta sin iniciar sesión. La ficha solo muestra campos aprobados para compradores.</p></div></div>
    <form className="public-lookup" onSubmit={lookup}><label>Código del lote<input value={code} onChange={(event) => setCode(event.target.value)} placeholder="CAC001" required /></label><button className="button button-primary" disabled={loading}>{loading ? 'Buscando…' : 'Consultar ficha'}</button></form><ErrorMessage value={error} />
    {product && <article className="public-card"><div className="public-card-head"><div><span className="eyebrow muted">PRODUCTO</span><h2>{product.code}</h2></div><span className={`business-status status-${product.status}`}>{product.status === 'released' ? 'Liberado' : product.status === 'blocked' ? 'Bloqueado' : 'Pendiente'}</span></div><dl><div><dt>Tipo de producto</dt><dd>{product.product_type}</dd></div><div><dt>Origen</dt><dd>{product.origin}</dd></div><div><dt>Fecha</dt><dd>{new Date(product.received_on).toLocaleDateString('es-CO')}</dd></div><div><dt>Cantidad</dt><dd>{number.format(product.output_quantity)} {product.unit}</dd></div><div><dt>Etapa registrada</dt><dd>{product.stage}</dd></div></dl>{product.status === 'blocked' && <p className="view-warning">Producto retenido. No está disponible para compra.{product.status_reason ? ` Motivo: ${product.status_reason}` : ''}</p>}{product.status === 'pending' && <p className="view-info">Estado pendiente de liberación; no está disponible para compra.</p>}<h3>Recorrido de trazabilidad</h3><div className="public-timeline">{publicTrace?.timeline.map((item, index) => <p key={`${item.kind}-${index}`}><strong>{item.kind === 'reception' ? `Recepción ${item.lot_code} · ${item.origin}` : `${item.stage} · ${item.output_code}`}</strong><span>{new Date(item.date).toLocaleString('es-CO')} · {item.kind === 'reception' ? item.quantity : `${item.input_quantity} → ${item.output_quantity}`} {item.unit}</span></p>)}</div><p className="privacy-note">Esta vista no incluye costos, márgenes ni datos privados del productor.</p><button className="button button-outline" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}?producto=${encodeURIComponent(product.code)}`)}>Copiar enlace público</button></article>}
  </section>
}
