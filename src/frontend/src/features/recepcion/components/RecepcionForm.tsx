import { useEffect, useState, type FormEvent } from "react"
import { useAuth } from "@/context/AuthContext"
import { sincronizarRecepcionesPendientes } from "../api/recepcionSync"
import { encolarRecepcionApi, guardarRecepcionLocal } from "../api/recepcionDb"
import { cargarFincas } from "../api/fincasApi"
import type { Finca } from "@/db/dexieDb"
import { Button, Field, Icon } from "@/components/ui"
import { ErrorDominio } from "@/utils/errores"
import { LIMITES, PATRON_CIFRA, validarCOP, validarKg } from "@/utils/validacion"

interface RecepcionFormProps {
  isOnline?: boolean
  onSuccess?: () => void
}

export function RecepcionForm({ isOnline = false, onSuccess }: RecepcionFormProps) {
  const { nombreUsuario, modo } = useAuth()
  const esApi = modo === "api"
  const [fincas, setFincas] = useState<Finca[]>([])
  const [fincaId, setFincaId] = useState("")
  const [costo, setCosto] = useState("")
  const [producer, setProducer] = useState("Productor A · Ana Torres")
  const [origin, setOrigin] = useState("Rivera")
  const [date, setDate] = useState(() => new Date().toLocaleDateString("sv-SE"))
  const [qty, setQty] = useState("")
  const [unit, setUnit] = useState("kg")

  const [savedCode, setSavedCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // En modo API la finca sale del catálogo del servidor (o de su copia local si no hay red)
  useEffect(() => {
    if (!esApi) return
    cargarFincas()
      .then((lista) => {
        setFincas(lista)
        setFincaId((actual) => actual || String(lista[0]?.id ?? ""))
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo de fincas."))
  }, [esApi])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const cantidad = validarKg(qty, "La cantidad recibida")
    const compra = validarCOP(costo, { opcional: true, campo: "El costo de compra" })
    if ("error" in cantidad || "error" in compra) {
      setError("error" in cantidad ? cantidad.error : "error" in compra ? compra.error : "")
      return
    }
    const hoy = new Date().toLocaleDateString("sv-SE")
    if (!date || date > hoy) {
      setError("La fecha de recepción no puede ser futura. Se registraría un lote que aún no llegó. Elija la fecha de hoy o una anterior.")
      return
    }
    setLoading(true)

    try {
      let lote
      if (esApi) {
        const finca = fincas.find((f) => String(f.id) === fincaId)
        lote = await encolarRecepcionApi({
          farmId: finca?.id ?? 0,
          farmName: finca?.name ?? "",
          region: finca?.region,
          date,
          quantity: cantidad.valor,
          // vacío = 0: la recepción del servidor exige un costo de compra (comportamiento previo)
          purchaseTotalCop: compra.valor ?? 0,
        })
      } else {
        lote = await guardarRecepcionLocal({
          producer,
          origin,
          date,
          quantity: cantidad.valor,
          unit,
          usuario: nombreUsuario,
        })
      }

      // Si hay conexión se intenta sincronizar; si falla, el lote queda pendiente sin perderse
      if (isOnline) await sincronizarRecepcionesPendientes(modo).catch(() => undefined)

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
        {esApi ? (
          <Field label="Finca">
            <select className="input" value={fincaId} onChange={(e) => setFincaId(e.target.value)} required>
              {fincas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.region}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <>
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
          </>
        )}

        <Field label="Fecha de recepción">
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toLocaleDateString("sv-SE")}
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
              pattern={PATRON_CIFRA}
              maxLength={LIMITES.cifra}
              aria-label="Cantidad recibida en kg"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
            <span>kg</span>
          </div>
        </Field>

        {esApi && (
          <Field label="Costo total de compra">
            <div className="input-unit">
              <input
                className="input"
                type="text"
                inputMode="decimal"
                placeholder="Ej. 1.200.000"
                pattern={PATRON_CIFRA}
                maxLength={LIMITES.cifra}
                aria-label="Costo total de compra en COP"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
              />
              <span>COP</span>
            </div>
          </Field>
        )}

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