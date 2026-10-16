import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge, Button, Icon } from "@/components/ui"
import { PageHead } from "@/components/shared"
import { descargarCsvLotes, inventarioAdmin, listarAlertas, listarEconomia, listarLotes } from "@/api/servicios"
import { mensajeError } from "@/api/axiosClient"
import { InventoryTable } from "@/features/inventario/components/InventoryTable"
import { CambioEstadoModal } from "@/features/estados/components/CambioEstadoModal"
import type { InventarioAdmin } from "@/api/tipos"
import { ESTADOS, TIPOS_ALERTA, type EstadoLote } from "@/shared/etiquetas"
import { formatoCop, formatoCopPorKg, formatoKg, formatoPorcentaje } from "@/shared/formato"

export function InventoryPage() {
  const [origen, setOrigen] = useState("")
  const [estado, setEstado] = useState("")
  const [seleccion, setSeleccion] = useState<InventarioAdmin | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [errorCsv, setErrorCsv] = useState<string | null>(null)

  const filtros = { origin: origen || undefined, status: estado || undefined }
  const inventario = useQuery({ queryKey: ["inventario", filtros], queryFn: () => inventarioAdmin(filtros) })
  const alertas = useQuery({ queryKey: ["alertas"], queryFn: listarAlertas })
  const economia = useQuery({ queryKey: ["economia"], queryFn: listarEconomia })

  const todos = useQuery({ queryKey: ["lotes"], queryFn: () => listarLotes() })
  const origenes = [...new Set((todos.data ?? []).map((l) => l.origin))].sort()
  // La búsqueda por código solo filtra lo que ya trajo el servidor; no decide nada.
  const lotes = (inventario.data ?? []).filter((l) => l.code.toLowerCase().includes(busqueda.trim().toLowerCase()))
  const totalDisponible = lotes.reduce((s, l) => s + l.available_quantity, 0)

  const exportar = async () => {
    setErrorCsv(null)
    try {
      await descargarCsvLotes(filtros)
    } catch (e) {
      setErrorCsv(mensajeError(e))
    }
  }

  return (
    <>
      <PageHead
        eyebrow="RF08 · RF05 · RF11 · Inventario"
        title="Inventario, costos y estados"
        text="Existencias derivadas del libro de movimientos, costos por etapa y liberación de lotes."
        action={
          <Button variant="secondary" onClick={() => void exportar()}>
            <Icon name="download" /> Exportar CSV
          </Button>
        }
      />
      {errorCsv && <div className="validation danger mb-4" role="alert"><div><strong>No se exportó el CSV</strong><span>{errorCsv}</span></div></div>}

      <div className="economy-grid">
        <div className="economy-card featured">
          <span>Existencia disponible (según filtros)</span>
          <strong>{formatoKg(totalDisponible)}</strong>
          <small>{lotes.length} lotes</small>
        </div>
        <div className="economy-card">
          <span>Alertas abiertas</span>
          <strong>{alertas.data?.length ?? "—"}</strong>
          <small>Merma y costo, calculadas por el servidor</small>
        </div>
      </div>

      <section className="card mt-6">
        <div className="filterbar">
          <div className="section-title">Existencias por lote</div>
          <div className="filters">
            <select className="input" aria-label="Filtrar por origen" value={origen} onChange={(e) => setOrigen(e.target.value)}>
              <option value="">Todos los orígenes</option>
              {origenes.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <select className="input" aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {(Object.keys(ESTADOS) as EstadoLote[]).map((k) => (
                <option key={k} value={k}>{ESTADOS[k].etiqueta}</option>
              ))}
            </select>
            <div className="search-box">
              <Icon name="search" />
              <input aria-label="Buscar por código de lote" placeholder="Código de lote..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
          </div>
        </div>
        {inventario.isError && (
          <div className="validation danger" role="alert"><div><strong>No se cargó el inventario</strong><span>{mensajeError(inventario.error)}</span></div></div>
        )}
        <InventoryTable lotes={lotes} onCambiarEstado={setSeleccion} />
      </section>

      <section className="card mt-6">
        <div className="card-head">
          <div>
            <div className="section-title">Costo unitario y margen por etapa</div>
            <p>Costo unitario = costo total de la etapa / kg de salida vendible. Margen = (precio − costo unitario) / precio × 100.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Producto</th><th>Etapa</th><th>Salida</th><th>Costo de etapa</th><th>Costo unitario</th><th>Precio</th><th>Margen</th></tr>
            </thead>
            <tbody>
              {(economia.data ?? []).length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "1.5rem" }}>Aún no hay etapas con costos registradas.</td></tr>
              ) : (
                (economia.data ?? []).map((x) => (
                  <tr key={x.transformation_id}>
                    <td><strong>{x.output_code}</strong></td>
                    <td>{x.stage}</td>
                    <td>{formatoKg(x.output_quantity)}</td>
                    <td>{formatoCop(x.total_cost_cop)}</td>
                    <td>{x.unit_cost_cop === null ? "No calculable (salida 0 kg)" : formatoCopPorKg(x.unit_cost_cop)}</td>
                    <td>{x.sale_price_cop_per_unit === null ? "Sin precio" : formatoCopPorKg(x.sale_price_cop_per_unit)}</td>
                    <td>{formatoPorcentaje(x.margin_on_sale_percent)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {economia.data?.[0] && (
          <p className="privacy-note">Supuesto de costos: {economia.data[0].cost_policy}</p>
        )}
      </section>

      <section className="card mt-6">
        <div className="card-head">
          <div>
            <div className="section-title">Alertas</div>
            <p>Regla y causa de cada alerta</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {(alertas.data ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No hay alertas abiertas.</p>
          ) : (
            (alertas.data ?? []).map((a, i) => (
              <div key={i} className="activity-row">
                <div className="activity-icon"><Icon name="alert" /></div>
                <div>
                  <strong>{TIPOS_ALERTA[a.type] ?? a.type} · {a.entity}</strong>
                  <span>{a.rule}. {a.cause}</span>
                </div>
                {a.value_percent !== undefined && <Badge tone="red">{formatoPorcentaje(a.value_percent)}</Badge>}
              </div>
            ))
          )}
        </div>
      </section>

      {seleccion && <CambioEstadoModal lote={seleccion} onCerrar={() => setSeleccion(null)} />}
    </>
  )
}
