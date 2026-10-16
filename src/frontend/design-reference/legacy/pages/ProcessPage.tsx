import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Badge, PageHead } from "@/components/shared"
import { db, type ProcesoOffline } from "@/db/dexieDb"
import { ProcessForm } from "@/features/transformacion/components/ProcessForm"
import { ShrinkageAlertCard } from "@/features/transformacion/components/ShrinkageAlertCard.tsx"

export function ProcessPage() {
  const [lastInputQty, setLastInputQty] = useState(250)
  const [lastOutputQty, setLastOutputQty] = useState(200)

  // Consultas reactivas
  const lotes = useLiveQuery(() => db.recepciones.toArray(), [], [])
  const procesosHistorial = useLiveQuery(() => db.procesos.reverse().toArray(), [], [])

  const lotesDisponibles = (lotes || []).map((l) => l.lotCode)

  return (
    <>
      <PageHead
        eyebrow="RF02 · Transformación"
        title="Transformación y control de merma"
        text="Registra cada etapa y detecta desviaciones de peso en tiempo real."
      />

      <div className="process-layout">
        <ProcessForm
          availableLots={lotesDisponibles.length > 0 ? lotesDisponibles : ["CAC128"]}
          onSuccess={() => {}}
        />

        <aside className="space-y-4">
          <ShrinkageAlertCard inputQty={lastInputQty} outputQty={lastOutputQty} thresholdPercent={15} />

          <div className="stock-card">
            <div>
              <small>Lotes en proceso de fermentación/secado</small>
              <strong>{lotesDisponibles.length} Lotes</strong>
            </div>
            <Badge tone="green">DISPONIBLE</Badge>
          </div>
        </aside>
      </div>

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
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {!procesosHistorial || procesosHistorial.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-slate-500">
                    No hay procesos de transformación registrados aún.
                  </td>
                </tr>
              ) : (
                procesosHistorial.map((p: ProcesoOffline) => (
                  <tr key={p.idLocal ?? p.lotCode}>
                    <td><strong>{p.lotCode}</strong></td>
                    <td>{p.stage}</td>
                    <td>{p.inputQty} kg</td>
                    <td>{p.outputQty} kg</td>
                    <td>
                      <span className={`badge ${p.shrinkagePercent > 15 ? "badge-red" : "badge-green"}`}>
                        {p.shrinkagePercent.toFixed(1)}%
                      </span>
                    </td>
                    <td>{p.responsible}</td>
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