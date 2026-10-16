import { useState, useEffect } from "react"
import { Badge, Button, Icon } from "@/components/ui"
import { DataTable, PageHead } from "@/components/shared"
import { db, type RecepcionOffline } from "@/db/dexieDb"
import { useAuth } from "@/context/AuthContext"

export function InventoryPage({ onBlock }: { onBlock?: (lotCode: string) => void }) {
  const { nombreUsuario } = useAuth()
  const [lotes, setLotes] = useState<RecepcionOffline[]>([])
  const [origenFiltro, setOrigenFiltro] = useState("Todos los orígenes")
  const [estadoFiltro, setEstadoFiltro] = useState("Todos los estados")
  const [busqueda, setBusqueda] = useState("")

  const cargarInventario = async () => {
    const todos = await db.recepciones.toArray()
    setLotes(todos)
  }

  useEffect(() => {
    cargarInventario()
  }, [])

  const toggleEstadoLote = async (lote: RecepcionOffline, nuevoEstado: 'LIBERADO' | 'BLOQUEADO') => {
    if (lote.idLocal !== undefined) {
      await db.recepciones.update(lote.idLocal, { status: nuevoEstado })
      await db.auditLogs.add({
        timestamp: new Date().toLocaleString(),
        user: nombreUsuario,
        action: nuevoEstado === 'BLOQUEADO' ? 'BLOQUEO' : 'LIBERACIÓN',
        fieldChanged: `Estado · ${lote.lotCode}`,
        previousValue: lote.status || 'PENDIENTE',
        newValue: nuevoEstado,
        lotCode: lote.lotCode,
        reason: `Cambio manual desde panel de inventario`
      })
      await cargarInventario()
    }
  }

  const lotesFiltrados = lotes.filter((l) => {
    const coincideOrigen = origenFiltro === "Todos los orígenes" || l.origin === origenFiltro
    const coincideEstado = estadoFiltro === "Todos los estados" || (l.status || "PENDIENTE") === estadoFiltro
    const coincideCodigo = l.lotCode.toLowerCase().includes(busqueda.toLowerCase())
    return coincideOrigen && coincideEstado && coincideCodigo
  })

  const totalStockKg = lotes.reduce((acc, curr) => acc + (curr.availableQty ?? curr.quantity), 0)
  const COSTO_KG = 20000
  const valorTotalStock = totalStockKg * COSTO_KG

  const exportarCSV = () => {
    const headers = ["Codigo", "Origen", "Ingreso_kg", "Disponible_kg", "Estado", "Valor_COP"]
    const rows = lotesFiltrados.map((l) => [
      l.lotCode,
      l.origin,
      l.quantity,
      l.availableQty ?? l.quantity,
      l.status || "PENDIENTE",
      (l.availableQty ?? l.quantity) * COSTO_KG
    ])
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Inventario_AgroCacao_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <PageHead
        eyebrow="RF08 · RF11 · Inventario"
        title="Inventario y balance económico"
        text="Controla existencias, disponibilidad y proyección comercial."
        action={
          <Button variant="secondary" onClick={exportarCSV}>
            <Icon name="download" /> Exportar Reporte CSV
          </Button>
        }
      />

      <div className="economy-grid">
        <div className="economy-card">
          <span>Costo unitario promedio</span>
          <strong>${COSTO_KG.toLocaleString('es-CO')}</strong>
          <small>COP / kg procesado</small>
        </div>
        <div className="economy-card">
          <span>Margen estimado de venta</span>
          <strong className="text-emerald-600">20%</strong>
          <small>Proyección sobre costo</small>
        </div>
        <div className="economy-card featured">
          <span>Valor total del stock</span>
          <strong>${valorTotalStock.toLocaleString('es-CO')}</strong>
          <small>{totalStockKg} kg disponibles</small>
        </div>
      </div>

      <section className="card mt-6">
        <div className="filterbar">
          <div className="section-title">Existencias por lote</div>
          <div className="filters">
            <select
              className="input"
              value={origenFiltro}
              onChange={(e) => setOrigenFiltro(e.target.value)}
            >
              <option>Todos los orígenes</option>
              <option>Rivera</option>
              <option>Campoalegre</option>
              <option>Algeciras</option>
            </select>
            <select
              className="input"
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
            >
              <option>Todos los estados</option>
              <option>PENDIENTE</option>
              <option>LIBERADO</option>
              <option>BLOQUEADO</option>
            </select>
            <div className="search-box">
              <Icon name="search" />
              <input
                placeholder="Código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DataTable
          headers={[
            "Lote",
            "Origen",
            "Ingreso",
            "Disponible",
            "Estado",
            "Valor estimado",
            "Acciones",
          ]}
        >
          {lotesFiltrados.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-4 text-slate-500">
                No se encontraron lotes en el inventario.
              </td>
            </tr>
          ) : (
            lotesFiltrados.map((lote) => {
              const disp = lote.availableQty ?? lote.quantity
              const est = lote.status || "PENDIENTE"
              const valor = disp * COSTO_KG

              return (
                <tr key={lote.idLocal || lote.lotCode}>
                  <td><strong>{lote.lotCode}</strong></td>
                  <td>{lote.origin}</td>
                  <td>{lote.quantity} kg</td>
                  <td>{disp} kg</td>
                  <td>
                    {est === "LIBERADO" && <Badge tone="green">LIBERADO</Badge>}
                    {est === "PENDIENTE" && <Badge tone="amber">PENDIENTE</Badge>}
                    {est === "BLOQUEADO" && <Badge tone="red">BLOQUEADO</Badge>}
                  </td>
                  <td>${valor.toLocaleString('es-CO')}</td>
                  <td>
                    <div className="row-actions">
                      {est !== "LIBERADO" && (
                        <button onClick={() => toggleEstadoLote(lote, 'LIBERADO')}>
                          Liberar
                        </button>
                      )}
                      {est !== "BLOQUEADO" && (
                        <button
                          onClick={() => {
                            if (onBlock) onBlock(lote.lotCode)
                            else toggleEstadoLote(lote, 'BLOQUEADO')
                          }}
                          className="danger"
                        >
                          Bloquear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </DataTable>
      </section>
    </>
  )
}