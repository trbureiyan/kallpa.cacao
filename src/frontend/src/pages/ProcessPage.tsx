import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageHead } from "@/components/shared"
import { Badge } from "@/components/ui"
import { listarLotes } from "@/api/servicios"
import type { TransformacionResultado } from "@/api/tipos"
import { ProcessForm } from "@/features/transformacion/components/ProcessForm"
import { ShrinkageAlertCard } from "@/features/transformacion/components/ShrinkageAlertCard"
import { estadoDe } from "@/shared/etiquetas"
import { formatoFecha, formatoKg } from "@/shared/formato"

export function ProcessPage() {
  const [ultimo, setUltimo] = useState<TransformacionResultado | null>(null)
  const { data: lotes = [] } = useQuery({ queryKey: ["lotes"], queryFn: () => listarLotes() })
  // Los lotes de salida (productos) son los que no son materia prima recibida.
  const productos = lotes.filter((l) => l.product_type !== "raw_cocoa")

  return (
    <>
      <PageHead
        eyebrow="RF02 · Transformación"
        title="Transformación y control de merma"
        text="Registre cada etapa. El servidor calcula la merma, descuenta el inventario y genera el lote de salida."
      />

      <div className="process-layout">
        <ProcessForm onResultado={setUltimo} />
        <aside className="space-y-4">
          <ShrinkageAlertCard resultado={ultimo} />
        </aside>
      </div>

      <section className="card mt-6">
        <div className="card-head">
          <div>
            <div className="section-title">Lotes de salida</div>
            <p>Productos generados por transformaciones</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Origen</th>
                <th>Cantidad</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "1.5rem" }}>
                    Aún no hay transformaciones registradas.
                  </td>
                </tr>
              ) : (
                productos.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{l.code}</strong></td>
                    <td>{l.origin}</td>
                    <td>{formatoKg(l.received_quantity)}</td>
                    <td>{formatoFecha(l.received_on)}</td>
                    <td><Badge tone={estadoDe(l.status).tono}>{estadoDe(l.status).etiqueta}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
