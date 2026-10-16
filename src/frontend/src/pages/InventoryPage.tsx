import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Badge, Button, Icon } from "@/components/ui"
import { DataTable, PageHead } from "@/components/shared"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/db/dexieDb"
import { ModalCambioEstado } from "@/features/estados/components/ModalCambioEstado"
import { filtrarLotes, generarCsv } from "@/features/reportes/csv"
import { construirFilas } from "@/features/reportes/resumen"
import type { EstadoLote } from "@/types/app"
import { ahoraISO } from "@/utils/clock"
import { formatearCOP, formatearKg } from "@/utils/formato"

const TODOS = ""

export function InventoryPage() {
  const { rol } = useAuth()
  const esAdmin = rol === "ADMINISTRADOR"
  const [origenFiltro, setOrigenFiltro] = useState(TODOS)
  const [estadoFiltro, setEstadoFiltro] = useState<"" | EstadoLote>(TODOS)
  const [busqueda, setBusqueda] = useState("")
  const [cambio, setCambio] = useState<{ lotCode: string; nuevo: "LIBERADO" | "BLOQUEADO" } | null>(null)

  const lotes = useLiveQuery(() => db.recepciones.toArray(), [], [])
  const movimientos = useLiveQuery(() => db.movimientos.toArray(), [], [])
  const procesos = useLiveQuery(() => db.procesos.toArray(), [], [])

  const origenes = [...new Set(lotes.map((l) => l.origin))].sort()
  const filtrados = filtrarLotes(lotes, { origen: origenFiltro || undefined, estado: estadoFiltro || undefined }).filter(
    (l) => l.lotCode.toLowerCase().includes(busqueda.toLowerCase()),
  )
  const filas = construirFilas(filtrados, movimientos, procesos)
  const estadoPorCodigo = new Map(filas.map((f) => [f.codigo, f]))

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
          headers={["Lote", "Productor", "Origen", "Recibido", "Consumido", "Disponible", "Estado", "Costo unitario", ...(esAdmin ? ["Acciones"] : [])]}
        >
          {filtrados.length === 0 ? (
            <tr>
              <td colSpan={esAdmin ? 9 : 8} className="text-center py-4 text-slate-500">
                No se encontraron lotes con esos filtros.
              </td>
            </tr>
          ) : (
            filtrados.map((lote) => {
              const f = estadoPorCodigo.get(lote.lotCode)!
              return (
                <tr key={lote.lotCode}>
                  <td><strong>{lote.lotCode}</strong></td>
                  <td>{lote.producer}</td>
                  <td>{lote.origin}</td>
                  <td>{formatearKg(f.recibidoKg)}</td>
                  <td>{formatearKg(f.consumidoKg)}</td>
                  <td>{formatearKg(f.disponibleKg)}</td>
                  <td>
                    {f.estado === "LIBERADO" && <Badge tone="green">LIBERADO</Badge>}
                    {f.estado === "PENDIENTE" && <Badge tone="amber">PENDIENTE</Badge>}
                    {f.estado === "BLOQUEADO" && <Badge tone="red">BLOQUEADO</Badge>}
                  </td>
                  <td>{f.costoUnitario === null ? "—" : `${formatearCOP(f.costoUnitario)}/kg`}</td>
                  {esAdmin && (
                    <td>
                      <div className="row-actions">
                        {f.estado !== "LIBERADO" && (
                          <button onClick={() => setCambio({ lotCode: lote.lotCode, nuevo: "LIBERADO" })}>Liberar</button>
                        )}
                        {f.estado !== "BLOQUEADO" && (
                          <button className="danger" onClick={() => setCambio({ lotCode: lote.lotCode, nuevo: "BLOQUEADO" })}>
                            Bloquear
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })
          )}
        </DataTable>
      </section>

      {cambio && (
        <ModalCambioEstado
          lotes={lotes.map((l) => l.lotCode)}
          loteInicial={cambio.lotCode}
          nuevoInicial={cambio.nuevo}
          onClose={() => setCambio(null)}
          onDone={() => setCambio(null)}
        />
      )}
    </>
  )
}
