import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck, MapPin, Calendar, Layers } from 'lucide-react'
import { obtenerFichaPublica, type FichaPublica } from '../api/fichaApi'

const ETIQUETA_ESTADO = {
  PENDIENTE: 'En revisión',
  LIBERADO: 'Disponible',
  BLOQUEADO: 'No disponible',
} as const

export function PublicFichaCard({ lotCode }: { lotCode: string }) {
  // undefined = cargando; null = no encontrado
  const [ficha, setFicha] = useState<FichaPublica | null | undefined>(undefined)

  useEffect(() => {
    let vigente = true
    void obtenerFichaPublica(lotCode).then((f) => {
      if (vigente) setFicha(f)
    })
    return () => {
      vigente = false
    }
  }, [lotCode])

  if (ficha === undefined) {
    return <div className="card p-8 text-center text-slate-500 max-w-4xl mx-auto my-8">Cargando ficha del lote...</div>
  }

  if (ficha === null) {
    return (
      <div className="card p-8 text-center max-w-4xl mx-auto my-8" role="alert">
        <strong>No encontramos ese lote.</strong>
        <p className="mt-2 text-slate-600">
          El código {lotCode} no está en el registro. Revise que esté bien escrito o escanee de nuevo el código QR.
        </p>
      </div>
    )
  }

  const urlFicha = `${window.location.origin}/ficha-publica?lote=${encodeURIComponent(ficha.codigo)}`

  return (
    <div>
      <div className="public-hero">
        <div className="hero-grain grain-1" />
        <div className="hero-grain grain-2" />
        <div className="public-hero-content">
          <span className="eyebrow text-emerald-300">Ficha comercial del lote</span>
          <h1 className="display-title text-white mt-1">Lote {ficha.codigo}</h1>
          <p className="mt-2 text-emerald-100 text-sm md:text-base">Cacao seco · Origen {ficha.origen}</p>
        </div>
      </div>

      <div className="product-sheet">
        <div className="product-main">
          {!ficha.ofrecible && (
            <div className="validation danger mb-4" role="status">
              <div>
                <strong>{ficha.estado === 'BLOQUEADO' ? 'Lote no disponible' : 'Lote aún no disponible para la venta'}</strong>
                <span>
                  {ficha.estado === 'BLOQUEADO'
                    ? 'El lote fue retenido por la asociación y no se ofrece. Consulte con la asociación.'
                    : 'El lote todavía no fue autorizado o no tiene existencia. Consulte con la asociación.'}
                </span>
              </div>
            </div>
          )}

          <div className="public-facts">
            <div>
              <MapPin className="shrink-0" size={20} />
              <span>
                Origen<strong>{ficha.origen}</strong>
              </span>
            </div>
            <div>
              <Calendar className="shrink-0" size={20} />
              <span>
                Fecha de recepción<strong>{ficha.fechaRecepcion}</strong>
              </span>
            </div>
            <div>
              <ShieldCheck className="shrink-0" size={20} />
              <span>
                Estado comercial<strong>{ETIQUETA_ESTADO[ficha.estado]}</strong>
              </span>
            </div>
          </div>

          <div className="mt-6">
            <span className="eyebrow">
              <Layers size={14} /> Etapas de transformación
            </span>
            {ficha.etapas.length === 0 ? (
              <p className="text-slate-500 mt-2">Aún no hay etapas registradas.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {ficha.etapas.map((e, i) => (
                  <li key={`${e.etapa}-${i}`}>
                    <strong>{e.etapa}</strong> · {e.fecha}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="qr-card">
          <div className="flex flex-col items-center">
            <QRCodeSVG value={urlFicha} size={160} role="img" aria-label={`Código QR de la ficha del lote ${ficha.codigo}`} />
            <div className="qr-code-label mt-3">{ficha.codigo}</div>
            <p className="mt-3 text-xs text-slate-500">Escanee este código para abrir la ficha del lote desde cualquier dispositivo.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
