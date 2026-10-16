import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Icon } from '@/components/ui'
import type { ModoFuente } from '@/context/fuente'
import { db } from '@/db/dexieDb'
import { ErrorDominio } from '@/utils/errores'
import { formatearKg } from '@/utils/formato'
import { descartarRecepcion, esDeLaCola, reintentarRecepcion } from '../api/recepcionSync'

/**
 * Recepciones que el servidor rechazó. A diferencia de las pendientes (se envían solas al volver la red),
 * estas no se resuelven reintentando a ciegas: el operador decide reintentar o descartar.
 */
export function ErroresSincronizacion({ modo }: { modo: ModoFuente }) {
  const conError = useLiveQuery(
    async () => (await db.recepciones.where('syncStatus').equals('ERROR').sortBy('idLocal')).filter(esDeLaCola),
    [],
    [],
  )
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  if (conError.length === 0) return null

  const ejecutar = async (idLocal: number, accion: () => Promise<void>) => {
    setAviso(null)
    setOcupado(idLocal)
    try {
      await accion()
    } catch (e) {
      setAviso(e instanceof ErrorDominio ? e.message : 'No se completó la acción. Ocurrió un error inesperado y el registro sigue igual. Intente de nuevo.')
    } finally {
      setOcupado(null)
      setConfirmando(null)
    }
  }

  return (
    <section id="errores-sincronizacion" tabIndex={-1} className="card mt-6" aria-labelledby="errores-titulo">
      <div className="card-head">
        <div>
          <h3 id="errores-titulo" className="section-title">Recepciones que requieren atención</h3>
          <p>
            El servidor rechazó {conError.length === 1 ? 'esta recepción' : `estas ${conError.length} recepciones`}. Siguen guardadas en
            este dispositivo. Corrija la causa y reintente, o descarte si el registro estaba mal.
          </p>
        </div>
      </div>

      {aviso && (
        <div className="validation danger mx-4" role="alert">
          <Icon name="alert" />
          <span>{aviso}</span>
        </div>
      )}

      <ul>
        {conError.map((r) => {
          const id = r.idLocal!
          return (
            <li key={id} className="fila-error">
              <div>
                <strong>
                  {r.producer} · {formatearKg(r.quantity)} · {r.date}
                </strong>
                <p className="text-sm text-texto-suave">Código provisional {r.lotCode}</p>
                <p className="nota-error">Motivo: {r.errorMessage ?? 'El servidor no indicó el motivo.'}</p>
              </div>

              {confirmando === id ? (
                <div className="confirmar-descarte" role="group" aria-label="Confirmar descarte">
                  <strong>¿Descartar esta recepción?</strong>
                  <span className="text-sm">
                    No se enviará al servidor y no creará lote. El registro queda en este dispositivo marcado como descartado.
                  </span>
                  <div className="fila-error-acciones">
                    <Button variant="danger" disabled={ocupado === id} onClick={() => void ejecutar(id, () => descartarRecepcion(id))}>
                      Sí, descartar
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmando(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="fila-error-acciones">
                  <Button disabled={ocupado === id} onClick={() => void ejecutar(id, () => reintentarRecepcion(id, modo))}>
                    <Icon name="sync" /> {ocupado === id ? 'Reintentando...' : 'Reintentar'}
                  </Button>
                  <Button variant="ghost" disabled={ocupado === id} onClick={() => setConfirmando(id)}>
                    Descartar
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
