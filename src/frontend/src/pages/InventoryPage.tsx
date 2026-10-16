import { useState } from "react"
import { Button, Icon } from "@/components/ui"
import { ChipEstado, SelloLote } from "@/components/ui/marca"
import { DataTable, PageHead } from "@/components/shared"
import { useAuth } from "@/context/AuthContext"
import { ModalCambioEstado } from "@/features/estados/components/ModalCambioEstado"
import { useFilasInventario } from "@/features/inventario/useFilasInventario"
import { filtrarFilas, generarCsv } from "@/features/reportes/csv"
import type { EstadoLote } from "@/types/app"
import { ahoraISO } from "@/utils/clock"
import { formatearCOP, formatearKg } from "@/utils/formato"

const TODOS = ""

export function InventoryPage() {
  const { rol, modo } = useAuth()
  const esLocal = modo === "local"
  const esAdmin = rol === "ADMINISTRADOR"
  const [origenFiltro, setOrigenFiltro] = useState(TODOS)
  const [estadoFiltro, setEstadoFiltro] = useState<"" | EstadoLote>(TODOS)
  const [busqueda, setBusqueda] = useState("")
  const [cambio, setCambio] = useState<{ lotCode: string; nuevo: "LIBERADO" | "BLOQUEADO" } | null>(null)

  const { filas: todas, cargando, error } = useFilasInventario(modo, rol)

  const origenes = [...new Set(todas.map((f) => f.origen))].sort()
  const filas = filtrarFilas(todas, { origen: origenFiltro || undefined, estado: estadoFiltro || undefined }).filter((f) =>
    f.codigo.toLowerCase().includes(busqueda.toLowerCase()),
  )

  const totalDisponible = filas.reduce((a, f) => a + f.disponibleKg, 0)
  const conCosto = filas.filter((f) => f.costoUnitario !== null)
  const costoPromedio = conCosto.length ? conCosto.reduce((a, f) => a + (f.costoUnitario ?? 0), 0) / conCosto.length : null
  const valorStock = conCosto.reduce((a, f) => a + f.disponibleKg * (f.costoUnitario ?? 0), 0)

  const exportarCSV = () => {
    const blob = new Blob([generarCsv(filas)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `inventario_${ahoraISO().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHead
        eyebrow="RF08 · RF11 · Inventario"
        title="Inventario y balance económico"
        text="Existencias derivadas del libro de movimientos, con costos calculados."
        action={
          esAdmin ? (
            <Button variant="secondary" onClick={exportarCSV}>
              <Icon name="download" /> Exportar CSV
            </Button>
          ) : undefined
        }
      />

      <div className="economy-grid">
        <div className="economy-card">
          <span>Costo unitario promedio</span>
          <strong>{costoPromedio === null ? "—" : `${formatearCOP(costoPromedio)}/kg`}</strong>
          <small>
            Promedio simple de la etapa más reciente con costo de cada lote. Fórmula por lote: costo total de la etapa /
            kg de salida vendible.
          </small>
        </div>
        <div className="economy-card">
          <span>Lotes con costo calculado</span>
          <strong>{conCosto.length} de {filas.length}</strong>
          <small>Un lote sin costo total registrado o con salida 0 kg no tiene costo unitario.</small>
        </div>
        <div className="economy-card featured">
          <span>Valor del stock con costo conocido</span>
          <strong>{formatearCOP(valorStock)}</strong>
          <small>{formatearKg(totalDisponible)} disponibles · valor = kg disponibles × costo unitario</small>
        </div>
      </div>

      {error && (
        <div className="validation danger mt-6" role="alert">
          <Icon name="alert" />
          <div>
            <strong>No se pudo cargar el inventario</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <section className="card mt-6">
        <div className="filterbar">
          <div className="section-title">Existencias por lote</div>
          <div className="filters">
            <label>
              <span className="sr-only">Origen</span>
              <select className="input" value={origenFiltro} onChange={(e) => setOrigenFiltro(e.target.value)}>
                <option value={TODOS}>Todos los orígenes</option>
                {origenes.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Estado</span>
              <select className="input" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as "" | EstadoLote)}>
                <option value={TODOS}>Todos los estados</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="LIBERADO">LIBERADO</option>
                <option value="BLOQUEADO">BLOQUEADO</option>
              </select>
            </label>
            <label className="search-box">
              <span className="sr-only">Código de lote</span>
              <Icon name="search" />
              <input placeholder="Código de lote..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </label>
          </div>
        </div>

        <DataTable
          headers={["Lote", ...(esLocal ? ["Productor"] : []), "Origen", "Recibido", "Consumido", "Disponible", "Estado", "Costo unitario", ...(esAdmin && esLocal ? ["Acciones"] : [])]}
        >
          {filas.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center py-4 text-texto-suave">
                {cargando ? "Cargando existencias…" : "No se encontraron lotes con esos filtros."}
              </td>
            </tr>
          ) : (
            filas.map((f) => (
              <tr key={f.codigo}>
                <td><SelloLote codigo={f.codigo} /></td>
                {esLocal && <td>{f.productor}</td>}
                <td>{f.origen}</td>
                <td>{f.recibidoKg === null ? "—" : formatearKg(f.recibidoKg)}</td>
                <td>{f.consumidoKg === null ? "—" : formatearKg(f.consumidoKg)}</td>
                <td>{formatearKg(f.disponibleKg)}</td>
                <td>
                  <ChipEstado estado={f.estado} />
                </td>
                <td>{f.costoUnitario === null ? "—" : `${formatearCOP(f.costoUnitario)}/kg`}</td>
                {/* [DECISION] en modo API el cambio de estado se reactiva con la tarea de estados; hasta entonces escribiría en Dexie */}
                {esAdmin && esLocal && (
                  <td>
                    <div className="row-actions">
                      {f.estado !== "LIBERADO" && (
                        <button onClick={() => setCambio({ lotCode: f.codigo, nuevo: "LIBERADO" })}>Liberar</button>
                      )}
                      {f.estado !== "BLOQUEADO" && (
                        <button className="danger" onClick={() => setCambio({ lotCode: f.codigo, nuevo: "BLOQUEADO" })}>
                          Bloquear
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </DataTable>
      </section>

      {cambio && (
        <ModalCambioEstado
          lotes={todas.map((f) => f.codigo)}
          loteInicial={cambio.lotCode}
          nuevoInicial={cambio.nuevo}
          onClose={() => setCambio(null)}
          onDone={() => setCambio(null)}
        />
      )}
    </>
  )
}
