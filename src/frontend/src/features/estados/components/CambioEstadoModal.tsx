import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Field, Icon } from '@/components/ui'
import { cambiarEstadoLote } from '@/api/servicios'
import { mensajeError } from '@/api/axiosClient'
import type { InventarioAdmin } from '@/api/tipos'
import { ESTADOS, type EstadoLote } from '@/shared/etiquetas'

// Solo el administrador ve esta pantalla, pero la regla real (rol y motivo obligatorio) la aplica el servidor.
export function CambioEstadoModal({ lote, onCerrar }: { lote: InventarioAdmin; onCerrar: () => void }) {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<EstadoLote>(lote.status === 'released' ? 'blocked' : 'released')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const cambio = useMutation({
    mutationFn: () => cambiarEstadoLote(lote.id, estado, motivo.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries()
      onCerrar()
    },
    onError: (e) => setError(mensajeError(e)),
  })

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    cambio.mutate()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Cambiar estado del lote">
      <form className="modal" onSubmit={enviar}>
        <div className="modal-head">
          <h3 className="section-title">Cambiar estado de {lote.code}</h3>
          <button type="button" onClick={onCerrar} className="icon-button" aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-body space-y-4">
          <Field label="Nuevo estado">
            <select className="input" value={estado} onChange={(e) => setEstado(e.target.value as EstadoLote)}>
              {(Object.keys(ESTADOS) as EstadoLote[]).map((k) => (
                <option key={k} value={k}>{ESTADOS[k].etiqueta}</option>
              ))}
            </select>
          </Field>
          <Field label="Motivo (obligatorio)" hint="Queda registrado en la auditoría con su usuario y la hora del servidor.">
            <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} required minLength={3} maxLength={500} />
          </Field>
          {error && (
            <div className="validation danger" role="alert">
              <div>
                <strong>No se cambió el estado</strong>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant={estado === 'blocked' ? 'danger' : 'primary'} disabled={cambio.isPending}>
            {cambio.isPending ? 'Guardando...' : 'Confirmar cambio'}
          </Button>
        </div>
      </form>
    </div>
  )
}
