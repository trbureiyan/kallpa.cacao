import { useState, type FormEvent } from "react"
import { useAuth } from "@/context/AuthContext"
import { sincronizarRecepcionesPendientes } from "../api/recepcionSync"
import { guardarRecepcionLocal } from "../api/recepcionDb"
import { Button, Field, Icon } from "@/components/ui"
import { ErrorDominio } from "@/utils/errores"
import { parsearNumero } from "@/utils/formato"

interface RecepcionFormProps {
  isOnline?: boolean
  onSuccess?: () => void
}

export function RecepcionForm({ isOnline = false, onSuccess }: RecepcionFormProps) {
  const { nombreUsuario } = useAuth()
  const [producer, setProducer] = useState("Productor A · Ana Torres")
  const [origin, setOrigin] = useState("Rivera")
  const [date, setDate] = useState(() => new Date().toLocaleDateString("sv-SE"))
  const [qty, setQty] = useState("")
  const [unit, setUnit] = useState("kg")

  const [savedCode, setSavedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const lote = await guardarRecepcionLocal({
        producer,
        origin,
        date,
        quantity: parsearNumero(qty),
        unit,
        usuario: nombreUsuario,
      })

      // Si hay conexión se intenta sincronizar; si falla, el lote queda pendiente sin perderse
      if (isOnline) await sincronizarRecepcionesPendientes().catch(() => undefined)

      onSuccess?.()
      setSavedCode(lote.lotCode)
      setTimeout(() => setSavedCode(null), 4000)
      setQty("")
    } catch (err) {
      setError(
        err instanceof ErrorDominio
          ? err.message
          : "No se guardó el lote. Ocurrió un error inesperado y no se registró nada. Intente de nuevo.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <div className="card-head">
        <div>
          <div className="section-title">Nuevo lote de cacao</div>
          <p>Información de origen y pesaje</p>
        </div>
        <div className="step-badge">01</div>
      </div>

      {savedCode && (
        <div className="success-toast mb-4" role="status">
          <Icon name="check" /> Lote {savedCode} guardado correctamente{" "}
          {isOnline
            ? "e intento de sincronización enviado."
            : "en el dispositivo (IndexedDB)."}
        </div>
      )}

      {error && (
        <div className="validation danger mb-4" role="alert">
          <Icon name="alert" />
          <div>
            <strong>No se guardó el lote</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="form-grid">
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
            <option value="Gigante">Gigante</option>
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
              type="text"
              inputMode="decimal"
              placeholder="Ej. 100 o 12,5"
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

      {!isOnline && (
        <div className="validation warning mt-4">
          <Icon name="wifiOff" />
          <div>
            <strong>Guardado local activo</strong>
            <span>
              Este registro quedará almacenado en IndexedDB hasta recuperar la conexión.
            </span>
          </div>
        </div>
      )}

      <div className="form-actions">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setQty("")}
        >
          Limpiar
        </Button>

        <Button type="submit" disabled={loading}>
          <Icon name={isOnline ? "sync" : "box"} />
          {loading
            ? "Guardando..."
            : isOnline
              ? "Guardar y Sincronizar"
              : "Guardar en Dispositivo (Offline)"}
        </Button>
      </div>
    </form>
  )
}