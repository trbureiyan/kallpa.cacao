import { useState } from "react"
import { Button, Icon } from "@/components/ui"
import { ChipEstado, SelloLote } from "@/components/ui/marca"
import { PageHead, Timeline } from "@/components/shared"
import { obtenerTrazabilidadLote, type TraceInfo } from "@/features/trazabilidad/api/trazabilidadDb"
import { formatearKg } from "@/utils/formato"

export function TracePage() {
  const [codigo, setCodigo] = useState("")
  const [consultado, setConsultado] = useState(false)
  const [traza, setTraza] = useState<TraceInfo | null>(null)

  const buscar = async () => {
    setTraza(await obtenerTrazabilidadLote(codigo.trim()))
    setConsultado(true)
  }

  return (
    <>
      <PageHead
        eyebrow="RF03 · Cadena de custodia"
        title="Trazabilidad del lote"
        text="Consulte el recorrido desde la recepción hasta el producto terminado."
        action={
          <form
            className="trace-search flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void buscar()
            }}
          >
            <label className="relative flex-1">
              <span className="sr-only">Código del lote</span>
              <Icon name="search" className="absolute left-3 top-3 text-texto-suave" />
              <input
                className="input pl-9"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Código de lote, por ejemplo CAC001"
              />
            </label>
            <Button type="submit">Consultar</Button>
          </form>
        }
      />

      {!consultado && (
        <section className="card mt-6">
          <p className="p-4 text-texto-suave">Escriba el código de un lote para ver su recorrido.</p>
        </section>
      )}

      {consultado && !traza && (
        <section className="card mt-6" role="alert">
          <p className="p-4">
            No se encontró el lote {codigo.trim() || "indicado"}. El código no existe en el registro. Revise que esté
            bien escrito, por ejemplo CAC001.
          </p>
        </section>
      )}

      {traza && (
        <>
          <div className="trace-summary">
            <div className="lot-emblem">
              <Icon name="leaf" size={30} />
            </div>
            <div>
              <ChipEstado estado={traza.status} />
              <div className="mt-2"><SelloLote codigo={traza.lotCode} /></div>
            </div>
            <div className="trace-meta">
              <span>
                Origen<strong>{traza.origin}</strong>
              </span>
              <span>
                Disponible<strong>{formatearKg(traza.availableQty)}</strong>
              </span>
            </div>
          </div>

          <section className="card mt-6">
            <div className="card-head">
              <div>
                <div className="section-title">Recorrido histórico</div>
                <p>Construido solo con los registros guardados</p>
              </div>
            </div>
            <Timeline steps={traza.steps} />
          </section>
        </>
      )}
    </>
  )
}
