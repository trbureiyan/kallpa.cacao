import { useState, useEffect, type FormEvent } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Badge, Button, Field, Icon } from "@/components/ui"
import { DataTable, PageHead } from "@/components/shared"
import { db } from "@/db/dexieDb"
import { sincronizarRecepcionesPendientes } from "@/services/syncService"

export function ReceptionPage({
  online,
  addPending,
}: {
  online: boolean
  addPending: () => void
}) {
  // Estado del formulario
  const [lotCode, setLotCode] = useState("CAC129")
  const [producer, setProducer] = useState("Productor A · Ana Torres")
  const [origin, setOrigin] = useState("Rivera")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [qty, setQty] = useState("250")
  const [unit, setUnit] = useState("kg")

  // Estados de control de la interfaz
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  // Consulta reactiva: actualiza la lista cuando cambia IndexedDB
  const lotesLocales = useLiveQuery(
    () => db.recepciones.reverse().toArray(),
    [],
    [],
  )

  const invalid = Number(qty) <= 0 || !lotCode.trim()

  // Sincronizar cuando se recupera la conexión
  useEffect(() => {
    if (!online) return

    void sincronizarRecepcionesPendientes().catch((error) => {
      console.error("Error al sincronizar las recepciones:", error)
    })
  }, [online])

  // Guardar recepción offline u online
  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (invalid || loading) return

    setLoading(true)

    try {
      const idempotencyKey = crypto.randomUUID()

      // Guardar primero en IndexedDB
      await db.recepciones.add({
        idempotencyKey,
        lotCode,
        producer,
        origin,
        date,
        quantity: Number(qty),
        unit,
        syncStatus: "PENDING",
      })

      if (!online) {
        addPending()
      } else {
        // Intentar sincronizar inmediatamente con el servidor
        await sincronizarRecepcionesPendientes()
      }

      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)

      // Sugerir el siguiente código de lote
      const numActual =
        Number.parseInt(lotCode.replace(/\D/g, ""), 10) || 129

      setLotCode(`CAC${numActual + 1}`)
    } catch (error) {
      console.error("Error al guardar recepción:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar los lotes locales
  const lotesFiltrados = lotesLocales.filter(
    (lote) =>
      lote.lotCode.toLowerCase().includes(search.toLowerCase()) ||
      lote.producer.toLowerCase().includes(search.toLowerCase()) ||
      lote.origin.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <PageHead
        eyebrow="RF01 · Recepción"
        title="Recepción de lotes"
        text="Registra cacao en grano desde campo, incluso sin conexión."
      />

      {saved && (
        <div className="success-toast">
          <Icon name="check" /> Lote guardado correctamente{" "}
          {online
            ? "Se intentó sincronizar con el servidor."
            : "en el dispositivo (IndexedDB)."}
        </div>
      )}

      <div className="split-layout">
        <form className="card form-card" onSubmit={save}>
          <div className="card-head">
            <div>
              <div className="section-title">Nuevo lote de cacao</div>
              <p>Información de origen y pesaje</p>
            </div>
            <div className="step-badge">01</div>
          </div>

          <div className="form-grid">
            <Field label="Código del lote">
              <input
                className="input"
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
                required
              />
            </Field>

            <Field label="Productor">
              <select
                className="input"
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
              >
                <option value="Productor A · Ana Torres">
                  Productor A · Ana Torres
                </option>
                <option value="Productor B · Carlos Díaz">
                  Productor B · Carlos Díaz
                </option>
                <option value="Productor C · Luz Peña">
                  Productor C · Luz Peña
                </option>
              </select>
            </Field>

            <Field label="Municipio de origen">
              <select
                className="input"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              >
                <option value="Rivera">Rivera</option>
                <option value="Campoalegre">Campoalegre</option>
                <option value="Algeciras">Algeciras</option>
              </select>
            </Field>

            <Field label="Fecha de recepción">
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Cantidad recibida">
              <div className="input-unit">
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  step="any"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
                <span>kg</span>
              </div>
            </Field>

            <Field label="Unidad">
              <select
                className="input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="kg">Kilogramos (kg)</option>
              </select>
            </Field>
          </div>

          {invalid && (
            <div className="validation danger">
              <Icon name="alert" />
              <div>
                <strong>Datos no válidos</strong>
                <span>
                  La cantidad debe ser mayor a cero y el código del lote no
                  puede estar vacío.
                </span>
              </div>
            </div>
          )}

          {!online && (
            <div className="validation warning">
              <Icon name="wifiOff" />
              <div>
                <strong>Guardado local disponible</strong>
                <span>
                  Este registro quedará almacenado en IndexedDB hasta recuperar
                  la conexión.
                </span>
              </div>
            </div>
          )}

          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQty("0")
                setLotCode("")
              }}
            >
              Limpiar
            </Button>

            <Button type="submit" disabled={invalid || loading}>
              <Icon name={online ? "sync" : "box"} />
              {loading
                ? "Guardando..."
                : online
                  ? "Guardar y Sincronizar"
                  : "Guardar en Dispositivo (Offline)"}
            </Button>
          </div>
        </form>

        <aside className="field-tip">
          <div className="tip-icon">
            <Icon name="sprout" size={28} />
          </div>

          <div className="eyebrow">Consejo de campo</div>
          <div className="section-title mt-2">Verifica el peso neto</div>

          <p>
            Confirma que la báscula esté calibrada y descuenta el peso del
            empaque antes de guardar.
          </p>

          <div className="mini-stat">
            <span>Último registrado</span>
            <strong>{lotesLocales[0]?.lotCode || "Sin registros"}</strong>
          </div>
        </aside>
      </div>

      <section className="card mt-6">
        <div className="card-head">
          <div>
            <div className="section-title">Lotes locales recientes</div>
            <p>Registros guardados en el dispositivo (IndexedDB)</p>
          </div>

          <div className="search-box">
            <Icon name="search" />
            <input
              placeholder="Buscar lote..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <DataTable
          headers={[
            "Código",
            "Productor",
            "Origen",
            "Cantidad",
            "Fecha",
            "Estado",
          ]}
        >
          {lotesFiltrados.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-4 text-slate-500">
                No hay lotes registrados localmente.
              </td>
            </tr>
          ) : (
            lotesFiltrados.map((lote) => (
              <tr key={lote.idLocal ?? lote.idempotencyKey}>
                <td>
                  <strong>{lote.lotCode}</strong>
                </td>
                <td>{lote.producer}</td>
                <td>{lote.origin}</td>
                <td>
                  {lote.quantity} {lote.unit}
                </td>
                <td>{lote.date}</td>
                <td>
                  {lote.syncStatus === "SYNCED" ? (
                    <Badge tone="green">SINCRONIZADO</Badge>
                  ) : lote.syncStatus === "ERROR" ? (
                    <Badge tone="amber">ERROR AL SINCRONIZAR</Badge>
                  ) : (
                    <Badge tone="amber">PENDIENTE DE SINCRONIZAR</Badge>
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