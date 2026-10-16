import { useState } from "react"
import { Badge, PageHead } from "@/components/shared"
import { useAuth } from "@/context/AuthContext"
import { IndicadoresEconomicos } from "@/features/economia/IndicadoresEconomicos"
import { useFilasInventario } from "@/features/inventario/useFilasInventario"
import { ProcessForm, type Borrador } from "@/features/transformacion/components/ProcessForm"
import { ShrinkageAlertCard } from "@/features/transformacion/components/ShrinkageAlertCard.tsx"
import { useProcesos } from "@/features/transformacion/useProcesos"
import { formatearKg, formatearPct } from "@/utils/formato"

const BORRADOR_VACIO: Borrador = { inputQty: NaN, outputQty: NaN }

export function ProcessPage() {
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO)

  const { modo, rol } = useAuth()
  const { filas, recargar: recargarInventario, error: errorInventario } = useFilasInventario(modo, rol)
  const { procesos: procesosHistorial, error: errorHistorial, recargar: recargarHistorial } = useProcesos(modo, rol)
  // un lote bloqueado no se ofrece para transformar
  const lotes = filas.filter((f) => f.estado !== "BLOQUEADO").map((f) => ({ code: f.codigo, disponibleKg: f.disponibleKg }))

  const totalDisponible = lotes.reduce((acc, l) => acc + l.disponibleKg, 0)

  return (
    <>
      <PageHead
        eyebrow="RF02 · Transformación"
        title="Transformación y control de merma"
        text="Registre cada etapa y detecte desviaciones de peso en tiempo real."
      />

      <div className="process-layout">
        {/* key: si cambia el conjunto de lotes, el formulario vuelve a tomar el primero disponible */}
        <ProcessForm
          key={lotes.map((l) => l.code).join()}
          lotes={lotes}
          onBorrador={setBorrador}
          onSuccess={() => {
            setBorrador(BORRADOR_VACIO)
            recargarInventario()
            recargarHistorial()
          }}
        />

        <aside className="space-y-4">
          <ShrinkageAlertCard inputQty={borrador.inputQty} outputQty={borrador.outputQty} />
          <IndicadoresEconomicos {...borrador} />

          <div className="stock-card">
            <div>
              <small>Existencia disponible para transformar</small>
              <strong>{formatearKg(totalDisponible)}</strong>
            </div>
            <Badge tone="green">DISPONIBLE</Badge>
          </div>
        </aside>
      </div>

      {(errorInventario || errorHistorial) && (
        <div className="validation danger mt-6" role="alert">
          <div>
            <strong>No se pudo cargar la información</strong>
            <span>{errorInventario ?? errorHistorial}</span>
          </div>
        </div>
      )}

      <section className="card mt-6">
        <div className="card-head">
          <div>
            <div className="section-title">Procesos recientes</div>
            <p>Historial de mermas e incidencias en planta</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lote</th>
                <th>Etapa</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Merma %</th>
                <th>Responsable</th>
                <th>Alertas</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {procesosHistorial.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-texto-suave">
                    No hay procesos de transformación registrados aún.
                  </td>
                </tr>
              ) : (
                procesosHistorial.map((p) => (
                  <tr key={p.clave}>
                    <td><strong>{p.lotCode}</strong></td>
                    <td>{p.stage}</td>
                    <td>{formatearKg(p.inputQty)}</td>
                    <td>{formatearKg(p.outputQty)}</td>
                    <td>
                      {p.shrinkagePercent === null ? (
                        "—"
                      ) : (
                        <span className={`badge ${p.alertas.some((a) => a.tipo === "merma") ? "badge-red" : "badge-green"}`}>
                          {formatearPct(p.shrinkagePercent)}
                        </span>
                      )}
                    </td>
                    <td>{p.responsible}</td>
                    <td>
                      {p.alertas.map((a) => (
                        <span key={a.tipo} className="badge badge-amber" title={`${a.regla}. ${a.causa}`}>
                          {a.tipo}
                        </span>
                      ))}
                    </td>
                    <td>{p.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
