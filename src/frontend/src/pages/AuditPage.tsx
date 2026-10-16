import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Icon } from "@/components/ui"
import { PageHead } from "@/components/shared"
import { auditoriaDeLote, listarLotes } from "@/api/servicios"
import { mensajeError } from "@/api/axiosClient"
import { AuditLogTable } from "@/features/auditoria/components/AuditLogTable"

export function AuditPage() {
  const [loteId, setLoteId] = useState("")
  const lotes = useQuery({ queryKey: ["lotes"], queryFn: () => listarLotes() })
  const eventos = useQuery({
    queryKey: ["auditoria", loteId],
    queryFn: () => auditoriaDeLote(Number(loteId)),
    enabled: loteId !== "",
  })

  return (
    <>
      <PageHead
        eyebrow="RF10 · Auditoría"
        title="Historial de cambios"
        text="Quién, cuándo, qué cambió, valor anterior y nuevo. La hora la fija el servidor."
      />

      <div className="audit-notice">
        <Icon name="shield" />
        <div>
          <strong>Registro de solo inserción</strong>
          <p>Los eventos no se editan ni se borran. Un bloqueo es un cambio de estado auditado, no un borrado.</p>
        </div>
      </div>

      <section className="card mt-6">
        <div className="filterbar">
          <div className="section-title">Eventos del lote</div>
          <div className="filters">
            <select className="input" aria-label="Lote" value={loteId} onChange={(e) => setLoteId(e.target.value)}>
              <option value="">Seleccione un lote</option>
              {(lotes.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.code}</option>
              ))}
            </select>
          </div>
        </div>
        {eventos.isError && (
          <div className="validation danger" role="alert"><div><strong>No se cargó el historial</strong><span>{mensajeError(eventos.error)}</span></div></div>
        )}
        {loteId === "" ? (
          <p className="p-4 text-sm text-slate-500">Seleccione un lote para ver su historial.</p>
        ) : (
          <AuditLogTable eventos={eventos.data ?? []} />
        )}
      </section>
    </>
  )
}
