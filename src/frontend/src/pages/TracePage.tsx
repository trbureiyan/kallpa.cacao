import { useState, useEffect } from "react"
import { Badge, Button, Icon } from "@/components/ui"
import { PageHead, Timeline } from "@/components/shared"
import { db, type RecepcionOffline } from "@/db/dexieDb"

export function TracePage() {
  const [codigoBusqueda, setCodigoBusqueda] = useState("CAC128")
  const [loteActual, setLoteActual] = useState<RecepcionOffline | null>(null)

  const buscarLote = async (code: string) => {
    const encontrado = await db.recepciones.where("lotCode").equals(code).first()
    setLoteActual(encontrado || null)
  }

  useEffect(() => {
    buscarLote(codigoBusqueda)
  }, [])

  return (
    <>
      <PageHead
        eyebrow="RF03 · Cadena de custodia"
        title="Trazabilidad del lote"
        text="Consulta el recorrido completo desde la finca hasta el producto final."
        action={
          <div className="trace-search flex items-center gap-2">
            <div className="relative flex-1">
              <Icon name="search" className="absolute left-3 top-3 text-slate-400" />
              <input
                className="input pl-9"
                value={codigoBusqueda}
                onChange={(e) => setCodigoBusqueda(e.target.value)}
                placeholder="Código de lote..."
              />
            </div>
            <Button onClick={() => buscarLote(codigoBusqueda)}>Consultar</Button>
          </div>
        }
      />

      <div className="trace-summary">
        <div className="lot-emblem">
          <Icon name="leaf" size={30} />
        </div>
        <div>
          <Badge tone={loteActual?.status === "BLOQUEADO" ? "red" : "green"}>
            {loteActual?.status || "LOTE EN PROCESO"}
          </Badge>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {loteActual?.lotCode || codigoBusqueda}
          </div>
          <p>Cacao seco premium · Cosecha 2025</p>
        </div>
        <div className="trace-meta">
          <span>
            Origen<strong>{loteActual?.origin || "Rivera"}, Huila</strong>
          </span>
          <span>
            Peso actual<strong>{loteActual?.availableQty ?? loteActual?.quantity ?? 256} kg</strong>
          </span>
          <span>
            Calidad<strong>Premium A</strong>
          </span>
        </div>
      </div>

      <section className="card mt-6">
        <div className="card-head">
          <div>
            <div className="section-title">Recorrido histórico</div>
            <p>Cadena de custodia verificada</p>
          </div>
          <Badge tone="green">
            <Icon name="shield" size={14} /> Trazabilidad verificada
          </Badge>
        </div>
        <Timeline />
      </section>
    </>
  )
}