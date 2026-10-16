import React, { useState, type FormEvent } from "react"
import { db } from "@/db/dexieDb"
import { sincronizarRecepcionesPendientes } from "../api/recepcionSync"
import { Button, Field, Icon } from "@/components/ui"

interface RecepcionFormProps {
  isOnline?: boolean
  onSuccess?: () => void
}

export function RecepcionForm({ isOnline = false, onSuccess }: RecepcionFormProps) {
  const [lotCode, setLotCode] = useState("CAC129")
  const [producer, setProducer] = useState("Productor A · Ana Torres")
  const [origin, setOrigin] = useState("Rivera")
  const [date, setDate] = useState(() => new Date().toLocaleDateString("sv-SE"))
  const [qty, setQty] = useState("250")
  const [unit, setUnit] = useState("kg")

  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalid = Number(qty) <= 0 || !lotCode.trim()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (invalid) {
      setError("La cantidad debe ser mayor a cero y el código del lote es obligatorio.")
      return
    }

    setLoading(true)

    try {
      const idempotencyKey = crypto.randomUUID()
      const quantityNum = Number(qty)

      // 1. Guardar en Dexie (IndexedDB)
      await db.recepciones.add({
        idempotencyKey,
        lotCode,
        producer,
        origin,
        date,
        quantity: quantityNum,
        availableQty: quantityNum,
        unit,
        syncStatus: "PENDING",
        status: "PENDIENTE",
      })

      // 2. Registrar evento de auditoría
      await db.auditLogs.add({
        timestamp: new Date().toISOString(),
        user: producer || "Operador Campo",
        action: "EDICIÓN",
        fieldChanged: "recepciones",
        previousValue: "N/A",
        newValue: `Lote ${lotCode} (${quantityNum} ${unit})`,
        lotCode,
        reason: "Registro de recepción en campo",
      })

      // 3. Si está en línea, intentar sincronizar de inmediato
      if (isOnline) {
        await sincronizarRecepcionesPendientes()
      }

      if (onSuccess) onSuccess()

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      // Sugerir siguiente código correlativo de lote
      const numActual = Number.parseInt(lotCode.replace(/\D/g, ""), 10) || 129
      setLotCode(`CAC${numActual + 1}`)
      setQty("250")
    } catch (err: any) {
      console.error("Error al guardar recepción:", err)
      setError(err?.message || "Error al guardar el lote en el dispositivo.")
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

      {saved && (
        <div className="success-toast mb-4">
          <Icon name="check" /> Lote guardado correctamente{" "}
          {isOnline
            ? "e intento de sincronización enviado."
            : "en el dispositivo (IndexedDB)."}
        </div>
      )}

      {error && (
        <div className="validation danger mb-4">
          <Icon name="alert" />
          <div>
            <strong>Error de validación</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

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
          onClick={() => {
            setQty("0")
            setLotCode("")
          }}
        >
          Limpiar
        </Button>

        <Button type="submit" disabled={invalid || loading}>
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