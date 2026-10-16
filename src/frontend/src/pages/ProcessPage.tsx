import { useState, useEffect, type FormEvent } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Badge, Button, Field, Icon } from "@/components/ui"
import { DataTable, PageHead } from "@/components/shared"
import { db, type RecepcionOffline } from "@/db/dexieDb"
import { useAuth } from "@/context/AuthContext"

export function ProcessPage() {
  const { nombreUsuario } = useAuth()

  // Consulta reactiva a IndexedDB mediante Dexie hooks
  const lotes = useLiveQuery(() => db.recepciones.toArray(), [], [])
  const procesosHistorial = useLiveQuery(() => db.procesos.reverse().toArray(), [], [])

  const [selectedLotCode, setSelectedLotCode] = useState("CAC128")
  const [etapa, setEtapa] = useState("Fermentación")
  const [inputQty, setInputQty] = useState(250)
  const [outputQty, setOutputQty] = useState(200)
  const [responsable, setResponsable] = useState(() => nombreUsuario)
  const [incidencias, setIncidencias] = useState("")
  const [saved, setSaved] = useState(false)

  // Asignar primer lote disponible al cargar
  useEffect(() => {
    if (lotes && lotes.length > 0 && !selectedLotCode) {
      setSelectedLotCode(lotes[0].lotCode)
      setInputQty(lotes[0].availableQty ?? lotes[0].quantity)
    }
  }, [lotes, selectedLotCode])

  const loteSeleccionado = lotes?.find((l) => l.lotCode === selectedLotCode)
  const maxAvailable = loteSeleccionado
    ? (loteSeleccionado.availableQty ?? loteSeleccionado.quantity)
    : 320

  const shrink = inputQty > 0 ? ((inputQty - outputQty) / inputQty) * 100 : 0
  const overStock = inputQty > maxAvailable
  const critical = shrink > 15

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (overStock || inputQty <= 0) return

    const fechaActual = new Date().toLocaleDateString("es-CO")

    // 1. Guardar proceso en Dexie
    await db.procesos.add({
      lotCode: selectedLotCode,
      stage: etapa,
      inputQty,
      outputQty,
      shrinkagePercent: shrink,
      responsible: responsable || nombreUsuario,
      date: fechaActual,
      notes: incidencias,
    })

    // 2. Actualizar stock del lote
    if (loteSeleccionado?.idLocal !== undefined) {
      await db.recepciones.update(loteSeleccionado.idLocal, {
        availableQty: Math.max(0, maxAvailable - (inputQty - outputQty)),
      })
    }

    // 3. Registrar auditoría si la merma > 15% (RF04/RF09)
    if (critical) {
      await db.auditLogs.add({
        timestamp: new Date().toLocaleString("es-CO"),
        user: responsable || nombreUsuario,
        action: "PROCESO",
        fieldChanged: `Merma Crítica (${shrink.toFixed(1)}%)`,
        previousValue: `${inputQty} kg`,
        newValue: `${outputQty} kg`,
        lotCode: selectedLotCode,
        reason: incidencias || "Alerta de merma superior al umbral del 15%",
      })
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <PageHead
        eyebrow="RF02 · Transformación"
        title="Transformación y control de merma"
        text="Registra cada etapa y detecta desviaciones en tiempo real."
      />

      {saved && (
        <div className="success-toast">
          <Icon name="check" /> Proceso registrado para el lote {selectedLotCode}
        </div>
      )}

      <div className="process-layout">
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="card-head">
            <div>
              <div className="section-title">Nuevo proceso</div>
              <p>Datos de entrada y resultado</p>
            </div>
            <Badge tone="brown">EN PROCESO</Badge>
          </div>

          <div className="form-grid">
            <Field label="Lote de entrada">
              <select
                className="input"
                value={selectedLotCode}
                onChange={(e) => {
                  const code = e.target.value
                  setSelectedLotCode(code)
                  const l = lotes?.find((item) => item.lotCode === code)
                  if (l) setInputQty(l.availableQty ?? l.quantity)
                }}
              >
                {!lotes || lotes.length === 0 ? (
                  <option value="CAC128">CAC128 · 320 kg disponibles</option>
                ) : (
                  lotes.map((l: RecepcionOffline) => (
                    <option key={l.lotCode} value={l.lotCode}>
                      {l.lotCode} · {l.availableQty ?? l.quantity} {l.unit} disponibles ({l.origin})
                    </option>
                  ))
                )}
              </select>
            </Field>

            <Field label="Etapa del proceso">
              <select
                className="input"
                value={etapa}
                onChange={(e) => setEtapa(e.target.value)}
              >
                <option value="Fermentación">Fermentación</option>
                <option value="Secado">Secado</option>
              </select>
            </Field>

            <Field label="Cantidad de entrada">
              <div className="input-unit">
                <input
                  type="number"
                  value={inputQty}
                  onChange={(e) => setInputQty(Number(e.target.value))}
                />
                <span>kg</span>
              </div>
            </Field>

            <Field label="Cantidad de salida">
              <div className="input-unit">
                <input
                  type="number"
                  value={outputQty}
                  onChange={(e) => setOutputQty(Number(e.target.value))}
                />
                <span>kg</span>
              </div>
            </Field>

            <Field label="Responsable">
              <input
                className="input"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
              />
            </Field>

            <Field label="Fecha">
              <input
                className="input"
                type="text"
                value={new Date().toLocaleDateString("es-CO")}
                readOnly
              />
            </Field>

            <div className="col-span-full">
              <Field label="Incidencias u observaciones">
                <textarea
                  className="input min-h-24"
                  placeholder="Describe novedades del proceso..."
                  value={incidencias}
                  onChange={(e) => setIncidencias(e.target.value)}
                />
              </Field>
            </div>
          </div>

          {overStock && (
            <div className="validation danger">
              <Icon name="lock" />
              <div>
                <strong>Stock insuficiente</strong>
                <span>
                  La cantidad solicitada supera los {maxAvailable} kg disponibles en bodega.
                </span>
              </div>
            </div>
          )}

          <div className="form-actions">
            <Button variant="ghost" type="button" onClick={() => setIncidencias("")}>
              Cancelar
            </Button>
            <Button disabled={overStock} type="submit">
              <Icon name="check" /> Registrar transformación
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className={`shrink-card ${critical ? "critical" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="eyebrow">Merma calculada</div>
              <Icon name="process" />
            </div>
            <strong>{shrink.toFixed(1).replace(".", ",")}%</strong>
            <div className="shrink-formula">
              (({inputQty} − {outputQty}) / {inputQty}) × 100
            </div>
            <div className="threshold">
              <span>Umbral permitido</span>
              <b>15%</b>
            </div>
            <div className="meter">
              <span style={{ width: `${Math.min(shrink * 4, 100)}%` }} />
            </div>
          </div>

          {critical ? (
            <div className="critical-alert">
              <Icon name="alert" size={24} />
              <div>
                <strong>Alerta crítica de merma</strong>
                <p>
                  La merma del {shrink.toFixed(0)}% supera el umbral máximo permitido del 15%.
                </p>
              </div>
            </div>
          ) : (
            <div className="validation success">
              <Icon name="check" />
              <div>
                <strong>Merma dentro del rango</strong>
                <span>El resultado cumple con el umbral configurado.</span>
              </div>
            </div>
          )}

          <div className="stock-card">
            <div className="flex items-center gap-3">
              <div className="stock-icon">
                <Icon name="warehouse" />
              </div>
              <div>
                <small>Stock actual · {selectedLotCode}</small>
                <strong>{maxAvailable} kg</strong>
              </div>
            </div>
            <Badge tone="green">DISPONIBLE</Badge>
          </div>
        </aside>
      </div>

      <section className="card mt-6">
        <div className="card-head">
          <div>
            <div className="section-title">Procesos recientes</div>
            <p>Historial de mermas registradas</p>
          </div>
        </div>

        <DataTable headers={["Lote", "Etapa", "Entrada", "Salida", "Merma %", "Estado"]}>
          {!procesosHistorial || procesosHistorial.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-4 text-slate-500">
                No hay procesos registrados.
              </td>
            </tr>
          ) : (
            procesosHistorial.map((p) => (
              <tr key={p.idLocal ?? p.lotCode}>
                <td><strong>{p.lotCode}</strong></td>
                <td>{p.stage}</td>
                <td>{p.inputQty} kg</td>
                <td>{p.outputQty} kg</td>
                <td>{p.shrinkagePercent.toFixed(1)}%</td>
                <td>
                  {p.shrinkagePercent > 15 ? (
                    <Badge tone="red">ALERTA (&gt;15%)</Badge>
                  ) : (
                    <Badge tone="green">NORMAL</Badge>
                  )}
                </td>
              </tr>
            ))
          )}
        </DataTable>
      </section>
    </>
  )
}