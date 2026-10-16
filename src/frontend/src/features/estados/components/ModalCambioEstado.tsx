import { useEffect, useRef, useState } from 'react'
import { Button, Field, Icon } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { ErrorDominio } from '@/utils/errores'
import { cambiarEstadoLote } from '../api/estadosDb'

type Accion = 'LIBERADO' | 'BLOQUEADO'

interface Props {
  lotes: string[]
  loteInicial: string
  nuevoInicial: Accion
  onClose: () => void
  onDone: () => void
}

// Único formulario de cambio de estado: lo usan Inventario y Auditoría.
export function ModalCambioEstado({ lotes, loteInicial, nuevoInicial, onClose, onDone }: Props) {
  const { rol, nombreUsuario } = useAuth()
  const [lotCode, setLotCode] = useState(loteInicial)
  const [nuevo, setNuevo] = useState<Accion>(nuevoInicial)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)

  // [DECISION] <dialog> nativo con showModal() — el navegador resuelve foco atrapado, Esc y fondo inerte sin código propio.
  // close() al desmontar devuelve el foco al botón que abrió el modal.
  useEffect(() => {
    const d = dialogo.current
    d?.showModal()
    return () => d?.close()
  }, [])

  const confirmar = async () => {
    setError(null)
    try {
      await cambiarEstadoLote({ lotCode, nuevo, motivo, rol: rol ?? 'OPERADOR', usuario: nombreUsuario })
      onDone()
    } catch (e) {
      setError(
        e instanceof ErrorDominio
          ? e.message
          : 'No se cambió el estado. Ocurrió un error inesperado y no se guardó ningún cambio. Intente de nuevo.',
      )
    }
  }

  return (
    <dialog
      ref={dialogo}
      className="modal"
      aria-labelledby="titulo-cambio-estado"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div>
        <div className="modal-head">
          <h3 id="titulo-cambio-estado" className="section-title">Gestionar estado del lote</h3>
          <button type="button" onClick={onClose} className="icon-button" aria-label="Cerrar">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">
          {error && (
            <div className="validation danger" role="alert">
              <Icon name="alert" />
              <div>
                <strong>No se pudo cambiar el estado</strong>
                <span>{error}</span>
              </div>
            </div>
          )}
          <Field label="Lote">
            <select className="input" value={lotCode} onChange={(e) => setLotCode(e.target.value)}>
              {lotes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Acción">
            <select className="input" value={nuevo} onChange={(e) => setNuevo(e.target.value as Accion)}>
              <option value="BLOQUEADO">Bloquear lote (no se ofrece como disponible)</option>
              <option value="LIBERADO">Liberar lote (autorizado para ofrecer)</option>
            </select>
          </Field>
          <Field label="Motivo (obligatorio)">
            <textarea
              className="input min-h-20"
              placeholder="Describa la razón del cambio..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </Field>
        </div>

        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!motivo.trim()} variant={nuevo === 'BLOQUEADO' ? 'danger' : 'primary'} onClick={confirmar}>
            Confirmar {nuevo === 'BLOQUEADO' ? 'bloqueo' : 'liberación'}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
