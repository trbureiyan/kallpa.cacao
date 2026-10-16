import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Field, Icon } from '@/components/ui'
import { listarLotes, registrarTransformacion } from '@/api/servicios'
import { mensajeError } from '@/api/axiosClient'
import type { TransformacionResultado } from '@/api/tipos'
import { estadoDe } from '@/shared/etiquetas'
import { formatoKg } from '@/shared/formato'

const ETAPAS = ['Fermentación', 'Secado', 'Limpieza y selección', 'Tostado', 'Molienda']

const VACIO = { loteId: '', etapa: ETAPAS[0], entrada: '', salida: '', codigoSalida: '', costo: '', precio: '', incidente: '' }

export function ProcessForm({ onResultado }: { onResultado: (r: TransformacionResultado) => void }) {
  const queryClient = useQueryClient()
  const { data: lotes = [] } = useQuery({ queryKey: ['lotes'], queryFn: () => listarLotes() })
  const [f, setF] = useState(VACIO)
  // La clave identifica la operación: si el usuario cambia datos tras un error, es otra operación.
  const [clave, setClave] = useState(() => crypto.randomUUID())
  const [error, setError] = useState<string | null>(null)

  const cambiar = (campo: keyof typeof VACIO, valor: string) => {
    setF((prev) => ({ ...prev, [campo]: valor }))
    setClave(crypto.randomUUID())
  }

  const lote = lotes.find((l) => String(l.id) === f.loteId)
  const transformables = lotes.filter((l) => l.available_quantity > 0 && l.status !== 'blocked')
  const salidaMayor = Number(f.salida) > Number(f.entrada) && f.entrada !== ''

  const elegirLote = (id: string) => {
    const l = lotes.find((x) => String(x.id) === id)
    setF((prev) => ({
      ...prev,
      loteId: id,
      entrada: l ? String(l.available_quantity) : '',
      codigoSalida: l ? `${l.code}-${prev.etapa.slice(0, 3).toUpperCase()}` : '',
    }))
    setClave(crypto.randomUUID())
  }

  const registrar = useMutation({
    mutationFn: () =>
      registrarTransformacion({
        idempotency_key: clave,
        lot_id: Number(f.loteId),
        stage: f.etapa,
        occurred_at: new Date().toISOString(),
        input_quantity: Number(f.entrada),
        output_quantity: Number(f.salida),
        unit: 'kg',
        output_code: f.codigoSalida.trim(),
        incident: f.incidente.trim() || null,
        costs_cop: Number(f.costo || 0),
        sale_price_cop_per_unit: f.precio === '' ? null : Number(f.precio),
      }),
    onSuccess: (r) => {
      setError(null)
      onResultado(r)
      setF(VACIO)
      setClave(crypto.randomUUID())
      void queryClient.invalidateQueries()
    },
    onError: (e) => setError(mensajeError(e)),
  })

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    registrar.mutate()
  }

  return (
    <form className="card form-card" onSubmit={enviar}>
      <div className="card-head">
        <div>
          <div className="section-title">Registrar etapa de transformación</div>
          <p>Una etapa transforma un solo lote. Requiere conexión con el servidor.</p>
        </div>
        <div className="step-badge">02</div>
      </div>

      {error && (
        <div className="validation danger mb-4" role="alert">
          <Icon name="alert" />
          <div>
            <strong>No se registró la etapa</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="form-grid">
        <Field label="Lote de entrada">
          <select className="input" value={f.loteId} onChange={(e) => elegirLote(e.target.value)} required>
            <option value="">Seleccione un lote</option>
            {transformables.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} · {formatoKg(l.available_quantity)} disponibles · {estadoDe(l.status).etiqueta}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Etapa">
          <select className="input" value={f.etapa} onChange={(e) => cambiar('etapa', e.target.value)}>
            {ETAPAS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>

        <Field label="Cantidad de entrada (kg)" hint={lote ? `Disponible: ${formatoKg(lote.available_quantity)}` : undefined}>
          <div className="input-unit">
            <input className="input" type="number" min="0.001" step="any" value={f.entrada} onChange={(e) => cambiar('entrada', e.target.value)} required />
            <span>kg</span>
          </div>
        </Field>

        <Field label="Salida vendible (kg)">
          <div className="input-unit">
            <input className="input" type="number" min="0" step="any" value={f.salida} onChange={(e) => cambiar('salida', e.target.value)} required />
            <span>kg</span>
          </div>
        </Field>

        <Field label="Código del lote de salida" hint="Identifica el producto resultante; debe ser único.">
          <input className="input" value={f.codigoSalida} onChange={(e) => cambiar('codigoSalida', e.target.value)} required minLength={2} />
        </Field>

        <Field label="Costo total de la etapa (COP)" hint="Incluye los costos de procesamiento de la etapa; no incluye la compra del cacao.">
          <div className="input-unit">
            <input className="input" type="number" min="0" step="any" value={f.costo} onChange={(e) => cambiar('costo', e.target.value)} />
            <span>COP</span>
          </div>
        </Field>

        <Field label="Precio de venta (COP/kg, opcional)">
          <div className="input-unit">
            <input className="input" type="number" min="0" step="any" value={f.precio} onChange={(e) => cambiar('precio', e.target.value)} />
            <span>COP/kg</span>
          </div>
        </Field>

        <Field label={salidaMayor ? 'Justificación (obligatoria: la salida supera la entrada)' : 'Incidencia o nota (opcional)'}>
          <input className="input" value={f.incidente} onChange={(e) => cambiar('incidente', e.target.value)} required={salidaMayor} />
        </Field>
      </div>

      <div className="form-actions">
        <Button type="submit" disabled={registrar.isPending || !f.loteId}>
          <Icon name="process" />
          {registrar.isPending ? 'Registrando...' : 'Registrar etapa'}
        </Button>
      </div>
    </form>
  )
}
