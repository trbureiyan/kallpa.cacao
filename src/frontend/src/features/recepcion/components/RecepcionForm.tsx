import { useState, type FormEvent } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/db/dexieDb"
import { encolarRecepcion, sincronizarCola } from "@/features/offline/cola"
import { Button, Field, Icon } from "@/components/ui"

interface Props {
  isOnline: boolean
}

export function RecepcionForm({ isOnline }: Props) {
  const fincas = useLiveQuery(() => db.fincas.orderBy("region").toArray(), [], [])
  const [fincaId, setFincaId] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [costo, setCosto] = useState("")
  const [notas, setNotas] = useState("")
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const finca = fincas.find((f) => String(f.id) === fincaId)
  const invalido = !finca || !(Number(cantidad) > 0) || cantidad === "" || costo === "" || Number(costo) < 0

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMensaje(null)
    if (invalido || !finca) {
      setError("Seleccione la finca, indique una cantidad mayor a 0 kg y el costo de compra en COP (0 si no aplica).")
      return
    }
    setGuardando(true)
    try {
      await encolarRecepcion({ finca, cantidadKg: Number(cantidad), costoCompraCop: Number(costo), notas })
      setCantidad("")
      setCosto("")
      setNotas("")
      if (isOnline) {
        const r = await sincronizarCola()
        setMensaje(
          r.enviadas > 0
            ? "Lote registrado en el servidor. El código CAC se muestra en la tabla."
            : "Guardado en el dispositivo. Se enviará cuando haya conexión con el servidor.",
        )
      } else {
        setMensaje("Guardado en el dispositivo. Se enviará cuando haya conexión.")
      }
    } catch {
      setError("No se pudo guardar en el dispositivo. Libere espacio del navegador e intente de nuevo.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="card form-card" onSubmit={enviar}>
      <div className="card-head">
        <div>
          <div className="section-title">Nuevo lote de cacao</div>
          <p>El servidor asigna el código CAC cuando recibe el registro.</p>
        </div>
        <div className="step-badge">01</div>
      </div>

      {mensaje && (
        <div className="success-toast mb-4">
          <Icon name="check" /> {mensaje}
        </div>
      )}
      {error && (
        <div className="validation danger mb-4">
          <Icon name="alert" />
          <div>
            <strong>No se guardó el lote</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="form-grid">
        <Field label="Finca y municipio de origen" hint={fincas.length === 0 ? "Inicie sesión con conexión al menos una vez para cargar las fincas." : undefined}>
          <select className="input" value={fincaId} onChange={(e) => setFincaId(e.target.value)} required>
            <option value="">Seleccione una finca</option>
            {fincas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {f.region}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cantidad recibida (kg)">
          <div className="input-unit">
            <input className="input" type="number" min="0.001" step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
            <span>kg</span>
          </div>
        </Field>

        <Field label="Costo de compra (COP)">
          <div className="input-unit">
            <input className="input" type="number" min="0" step="any" value={costo} onChange={(e) => setCosto(e.target.value)} required />
            <span>COP</span>
          </div>
        </Field>

        <Field label="Observaciones de calidad (opcional)">
          <input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} />
        </Field>
      </div>

      {!isOnline && (
        <div className="validation warning mt-4">
          <Icon name="wifiOff" />
          <div>
            <strong>Conectividad limitada</strong>
            <span>El registro queda en este dispositivo y se envía solo al volver la conexión. No recargue la página sin conexión.</span>
          </div>
        </div>
      )}

      <div className="form-actions">
        <Button type="submit" disabled={guardando}>
          <Icon name={isOnline ? "sync" : "box"} />
          {guardando ? "Guardando..." : isOnline ? "Guardar y enviar" : "Guardar en el dispositivo"}
        </Button>
      </div>
    </form>
  )
}
