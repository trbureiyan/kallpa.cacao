import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Badge, Icon } from "@/components/ui"
import { PageHead, Timeline, type PasoLinea } from "@/components/shared"
import { listarLotes, obtenerTrazabilidad } from "@/api/servicios"
import { mensajeError } from "@/api/axiosClient"
import type { Trazabilidad } from "@/api/tipos"
import { estadoDe } from "@/shared/etiquetas"
import { formatoFecha, formatoFechaHora, formatoKg } from "@/shared/formato"

// Arma los pasos a partir de lo que devolvió el servidor; no se inventa ningún dato.
function pasosDe(t: Trazabilidad): PasoLinea[] {
  const pasos: PasoLinea[] = []
  for (const o of t.origin_lots) {
    pasos.push({
      titulo: "Origen y recepción",
      texto: `${o.lot.code} · ${o.producer?.name ?? "Productor"} · ${o.lot.origin} · ${formatoKg(o.lot.received_quantity)}`,
      fecha: formatoFecha(o.lot.received_on),
      icono: "sprout",
    })
  }
  const vistas = new Set<number>()
  const etapas = [
    ...t.upstream_transformations.map((u) => ({ tr: u.transformation, salida: u.output_lot.code, entrada: u.input_lot.code })),
    ...t.downstream_transformations.map((d) => ({
      tr: d.transformation,
      salida: d.outputs.map((x) => x.lot.code).join(", "),
      entrada: d.input_lot.code,
    })),
  ].sort((a, b) => a.tr.occurred_at.localeCompare(b.tr.occurred_at))
  for (const e of etapas) {
    if (vistas.has(e.tr.id)) continue
    vistas.add(e.tr.id)
    pasos.push({
      titulo: `Transformación: ${e.tr.stage}`,
      texto: `${e.entrada} (${formatoKg(e.tr.input_quantity)}) → ${e.salida}${e.tr.incident ? ` · Incidencia: ${e.tr.incident}` : ""}`,
      fecha: formatoFechaHora(e.tr.occurred_at),
      icono: "process",
    })
  }
  return pasos
}

export function TracePage() {
  const [loteId, setLoteId] = useState("")
  const lotes = useQuery({ queryKey: ["lotes"], queryFn: () => listarLotes() })
  const traza = useQuery({
    queryKey: ["traza", loteId],
    queryFn: () => obtenerTrazabilidad(Number(loteId)),
    enabled: loteId !== "",
  })
  const t = traza.data

  return (
    <>
      <PageHead
        eyebrow="RF03 · Cadena de custodia"
        title="Trazabilidad del lote"
        text="Recorrido desde la recepción hasta los productos derivados, con todos los orígenes conservados."
        action={
          <div className="trace-search">
            <select className="input" aria-label="Lote" value={loteId} onChange={(e) => setLoteId(e.target.value)}>
              <option value="">Seleccione un lote</option>
              {(lotes.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.code}</option>
              ))}
            </select>
          </div>
        }
      />

      {traza.isError && (
        <div className="validation danger mb-4" role="alert"><div><strong>No se cargó la trazabilidad</strong><span>{mensajeError(traza.error)}</span></div></div>
      )}

      {!t ? (
        <p className="text-sm text-slate-500">Seleccione un lote para ver su recorrido.</p>
      ) : (
        <>
          <div className="trace-summary">
            <div className="lot-emblem"><Icon name="leaf" size={30} /></div>
            <div>
              <Badge tone={estadoDe(t.lot.status).tono}>{estadoDe(t.lot.status).etiqueta}</Badge>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">{t.lot.code}</div>
              <p>{t.lot.product_type === "raw_cocoa" ? "Cacao recibido" : "Producto transformado"}</p>
            </div>
            <div className="trace-meta">
              <span>Origen<strong>{t.lot.origin}</strong></span>
              <span>Existencia actual<strong>{formatoKg(t.current_inventory)}</strong></span>
              <span>Productor<strong>{t.producer?.name ?? "—"}</strong></span>
            </div>
          </div>

          <section className="card mt-6">
            <div className="card-head">
              <div>
                <div className="section-title">Recorrido</div>
                <p>Datos devueltos por el servidor</p>
              </div>
            </div>
            <Timeline pasos={pasosDe(t)} />
          </section>
        </>
      )}
    </>
  )
}
