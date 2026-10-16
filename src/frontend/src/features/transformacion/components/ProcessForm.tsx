import { useRef, useState, type FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ahoraISO } from '@/utils/clock'
import { ErrorDominio } from '@/utils/errores'
import { formatearKg } from '@/utils/formato'
import { LIMITES, PATRON_CIFRA, parsearDecimal } from '@/utils/validacion'
import { validarCifrasProceso, type CampoCifra } from '../reglas'
import { registrarProcesoApi } from '../api/procesoApi'
import { registrarProcesoLocal } from '../api/procesoDb'

export interface Borrador {
  inputQty: number
  outputQty: number
  costoTotalCOP?: number
  precioVentaCOP?: number
}

interface ProcessFormProps {
  lotes: { code: string; disponibleKg: number }[]
  onBorrador?: (b: Borrador) => void
  onSuccess?: () => void
}

const VACIO = {
  lotCode: '',
  stage: 'FERMENTACION',
  entrada: '',
  salida: '',
  costo: '',
  precio: '',
  justificacion: '',
  incidencias: '',
  notes: '',
}

// vista previa mientras se escribe: lo que no es cifra válida queda como NaN y la tarjeta no calcula
const kg = (t: string) => parsearDecimal(t, { decimales: 3 }) ?? NaN
const cop = (t: string) => (t.trim() === '' ? undefined : (parsearDecimal(t, { decimales: 2, miles: true }) ?? NaN))

function aBorrador(v: typeof VACIO): Borrador {
  return { inputQty: kg(v.entrada), outputQty: kg(v.salida), costoTotalCOP: cop(v.costo), precioVentaCOP: cop(v.precio) }
}

function ErrorCampo({ id, texto }: { id: string; texto?: string }) {
  return texto ? <small id={id} className="nota-error">{texto}</small> : null
}

export function ProcessForm({ lotes, onBorrador, onSuccess }: ProcessFormProps) {
  const { nombreUsuario, modo, rol } = useAuth()
  const [v, setV] = useState({ ...VACIO, lotCode: lotes[0]?.code ?? '' })
  // Una clave y una hora por intento: reenviar tras perder la respuesta debe enviar lo MISMO, o el servidor lo toma
  // como otra operación. Se crean en el primer envío (no al abrir el formulario) y se descartan cuando el resultado
  // es definitivo: éxito o rechazo. Tras sin red o error del servidor el resultado es incierto y se conservan.
  const intento = useRef<{ clave: string; ocurridoEn: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [errCampo, setErrCampo] = useState<Partial<Record<CampoCifra, string>>>({})

  const lotCode = v.lotCode || lotes[0]?.code || ''
  const disponible = lotes.find((l) => l.code === lotCode)?.disponibleKg

  const cambiar = (campo: keyof typeof VACIO, valor: string) => {
    const nuevo = { ...v, [campo]: valor }
    setV(nuevo)
    onBorrador?.(aBorrador(nuevo))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(false)
    const { errores } = validarCifrasProceso(v)
    setErrCampo(errores)
    if (Object.keys(errores).length > 0) {
      setError('Hay cifras que no son válidas. No se envió nada para no registrar datos distintos de los reales. Corrija los campos marcados.')
      return
    }
    setLoading(true)
    try {
      const b = aBorrador(v)
      const actual = (intento.current ??= { clave: crypto.randomUUID(), ocurridoEn: ahoraISO() })
      const datos = {
        lotCode,
        stage: v.stage,
        inputQty: b.inputQty,
        outputQty: b.outputQty,
        responsible: nombreUsuario,
        costoTotalCOP: b.costoTotalCOP,
        precioVentaCOP: b.precioVentaCOP,
        justificacion: v.justificacion,
        incidencias: v.incidencias,
        notes: v.notes,
        claveIdempotencia: actual.clave,
        ocurridoEn: actual.ocurridoEn,
      }
      if (modo === 'api' && rol) await registrarProcesoApi(rol, datos)
      else await registrarProcesoLocal(datos)
      setOk(true)
      intento.current = null
      setV({ ...VACIO, lotCode })
      onSuccess?.()
    } catch (err) {
      const incierto = err instanceof ErrorDominio && (err.codigo === 'SIN_RED' || err.codigo === 'SIN_RESPUESTA' || err.codigo === 'SERVIDOR')
      if (!incierto) intento.current = null
      setError(
        err instanceof ErrorDominio
          ? err.message
          : 'No se registró la transformación. Ocurrió un error inesperado y no se guardó nada. Intente de nuevo.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (lotes.length === 0) {
    return (
      <div className="card form-card">
        <p>No hay lotes registrados. Registre un lote en Recepción antes de transformar.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card form-card">
      <div className="card-head">
        <div>
          <span className="eyebrow">RF02 · Transformación</span>
          <h3 className="section-title">Etapas y control de merma</h3>
        </div>
      </div>

      {ok && (
        <div className="success-toast mb-4" role="status">
          Transformación registrada correctamente.
        </div>
      )}
      {error && (
        <div className="validation danger mb-4" role="alert">
          <div>
            <strong>No se registró la transformación</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="form-grid">
        <label className="field">
          <span className="field-label">Lote de entrada</span>
          <select className="input" value={lotCode} onChange={(e) => cambiar('lotCode', e.target.value)}>
            {lotes.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code} · {formatearKg(l.disponibleKg)} disponibles
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">Etapa del proceso</span>
          <select className="input" value={v.stage} onChange={(e) => cambiar('stage', e.target.value)}>
            <option value="FERMENTACION">Fermentación</option>
            <option value="SECADO">Secado en marquesina</option>
            <option value="SELECCION">Selección y empaque</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">Cantidad de entrada (kg)</span>
          <input
            className="input"
            inputMode="decimal"
            value={v.entrada}
            onChange={(e) => cambiar('entrada', e.target.value)}
            placeholder={disponible === undefined ? '' : `Máximo ${disponible}`}
            pattern={PATRON_CIFRA}
            maxLength={LIMITES.cifra}
            aria-invalid={!!errCampo.entrada}
            aria-describedby="err-entrada"
            required
          />
          <ErrorCampo id="err-entrada" texto={errCampo.entrada} />
        </label>

        <label className="field">
          <span className="field-label">Salida vendible (kg)</span>
          <input className="input" inputMode="decimal" value={v.salida} onChange={(e) => cambiar('salida', e.target.value)} pattern={PATRON_CIFRA} maxLength={LIMITES.cifra} aria-invalid={!!errCampo.salida} aria-describedby="err-salida" required />
          <ErrorCampo id="err-salida" texto={errCampo.salida} />
        </label>

        <label className="field">
          <span className="field-label">Costo total de la etapa (COP)</span>
          <input className="input" inputMode="decimal" value={v.costo} onChange={(e) => cambiar('costo', e.target.value)} pattern={PATRON_CIFRA} maxLength={LIMITES.cifra} aria-invalid={!!errCampo.costo} aria-describedby="err-costo" />
          <ErrorCampo id="err-costo" texto={errCampo.costo} />
        </label>

        <label className="field">
          <span className="field-label">Precio de venta hipotético (COP/kg)</span>
          <input className="input" inputMode="decimal" value={v.precio} onChange={(e) => cambiar('precio', e.target.value)} pattern={PATRON_CIFRA} maxLength={LIMITES.cifra} aria-invalid={!!errCampo.precio} aria-describedby="err-precio" />
          <ErrorCampo id="err-precio" texto={errCampo.precio} />
        </label>

        <label className="field col-span-full">
          <span className="field-label">Justificación (obligatoria si la salida supera la entrada)</span>
          <input
            className="input"
            value={v.justificacion}
            onChange={(e) => cambiar('justificacion', e.target.value)}
            maxLength={LIMITES.justificacion}
            placeholder="Por ejemplo: adición de insumos"
          />
        </label>

        <label className="field col-span-full">
          <span className="field-label">Incidencias</span>
          <textarea
            className="input"
            rows={2}
            value={v.incidencias}
            onChange={(e) => cambiar('incidencias', e.target.value)}
            maxLength={LIMITES.incidencias}
            placeholder="Hechos ocurridos durante la etapa"
          />
        </label>

        <label className="field col-span-full">
          <span className="field-label">Notas de observación</span>
          <textarea className="input" rows={2} value={v.notes} onChange={(e) => cambiar('notes', e.target.value)} maxLength={LIMITES.notas} />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : 'Registrar proceso'}
        </button>
      </div>
    </form>
  )
}
