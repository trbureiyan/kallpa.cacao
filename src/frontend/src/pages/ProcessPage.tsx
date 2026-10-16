import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Badge, PageHead } from "@/components/shared"
import { db, type ProcesoOffline } from "@/db/dexieDb"
import { alertasDeProceso, camposFaltantes } from "@/features/alertas/reglas"
import { indicadoresDeProceso } from "@/features/economia/reglas"
import { IndicadoresEconomicos } from "@/features/economia/IndicadoresEconomicos"
import { disponibleKg } from "@/features/inventario/api/inventarioDb"
import { ProcessForm, type Borrador } from "@/features/transformacion/components/ProcessForm"
import { ShrinkageAlertCard } from "@/features/transformacion/components/ShrinkageAlertCard.tsx"
import { esMermaCritica } from "@/utils/calculations"
import { formatearKg, formatearPct } from "@/utils/formato"

const BORRADOR_VACIO: Borrador = { inputQty: NaN, outputQty: NaN }

export function ProcessPage() {
  const [borrador, setBorrador] = useState<Borrador>(BORRADOR_VACIO)

  const lotes = useLiveQuery(
    async () => {
      const todos = await db.recepciones.toArray()
      return Promise.all(todos.map(async (l) => ({ code: l.lotCode, disponibleKg: await disponibleKg(l.lotCode) })))
    },
    [],
    [],
  )
  const procesosHistorial = useLiveQuery(() => db.procesos.reverse().toArray(), [], [])

  const totalDisponible = lotes.reduce((acc, l) => acc + l.disponibleKg, 0)

  return (
    <>
      <PageHead
        eyebrow="RF02 · Transformación"
        title="Transformación y control de merma"
        text="Registra cada etapa y detecta desviaciones de peso en tiempo real."
      />

      <div className="process-layout">
        {/* key: si cambia el conjunto de lotes, el formulario vuelve a tomar el primero disponible */}
        <ProcessForm
          key={lotes.map((l) => l.code).join()}
          lotes={lotes}
          onBorrador={setBorrador}
          onSuccess={() => setBorrador(BORRADOR_VACIO)}
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
                  <td colSpan={8} className="text-center py-4 text-slate-500">
                    No hay procesos de transformación registrados aún.
                  </td>
                </tr>
              ) : (
                procesosHistorial.map((p: ProcesoOffline) => (
                  <tr key={p.idLocal ?? p.lotCode}>
                    <td><strong>{p.lotCode}</strong></td>
                    <td>{p.stage}</td>
                    <td>{formatearKg(p.inputQty)}</td>
                    <td>{formatearKg(p.outputQty)}</td>
                    <td>
                      {p.shrinkagePercent === null ? (
                        "—"
                      ) : (
                        <span className={`badge ${esMermaCritica(p.shrinkagePercent) ? "badge-red" : "badge-green"}`}>
                          {formatearPct(p.shrinkagePercent)}
                        </span>
                      )}
                    </td>
                    <td>{p.responsible}</td>
                    <td>
                      {alertasDeProceso({
                        mermaPct: p.shrinkagePercent,
                        costoUnitario: indicadoresDeProceso(p).costoUnitario,
                        camposFaltantes: camposFaltantes(p),
                      }).map((a) => (
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
