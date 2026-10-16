import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { Badge, Button, Icon } from "@/components/ui"
import { DataTable, PageHead } from "@/components/shared"
import { db } from "@/db/dexieDb"
import { obtenerLogsAuditoria } from "@/features/auditoria/api/auditoriaDb"
import { ModalCambioEstado } from "@/features/estados/components/ModalCambioEstado"

export function AuditPage() {
  const [showModal, setShowModal] = useState(false)

  // Consultas reactivas: al cambiar un estado la tabla se actualiza sola
  const logs = useLiveQuery(() => obtenerLogsAuditoria(), [], [])
  const lotes = useLiveQuery(async () => (await db.recepciones.toArray()).map((l) => l.lotCode), [], [])

  return (
    <>
      <PageHead
        eyebrow="RF09 · RF10 · Auditoría"
        title="Auditoría e incidencias"
        text="Historial inmutable de cambios y decisiones operativas sobre los lotes."
        action={
          <Button onClick={() => setShowModal(true)}>
            <Icon name="lock" /> Bloquear / Liberar Lote
          </Button>
        }
      />

      <div className="audit-notice">
        <Icon name="shield" />
        <div>
          <strong>Registro protegido e inmutable</strong>
          <p>
            Los eventos de auditoría no se pueden modificar. Cada cambio conserva responsable, marca temporal y valores previo/nuevo.
          </p>
        </div>
      </div>

      <section className="card mt-6">
        <div className="card-head">
          <div>
            <div className="section-title">Historial de cambios e incidencias</div>
            <p>Actividad registrada en IndexedDB / Servidor</p>
          </div>
          <Badge tone="slate">
            <Icon name="clock" size={14} /> Actualizado
          </Badge>
        </div>

        <DataTable
          headers={[
            "Fecha y hora",
            "Usuario",
            "Acción",
            "Lote",
            "Campo",
            "Valor anterior",
            "Valor nuevo",
            "Motivo / Razón",
          ]}
        >
          {logs.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-4 text-texto-suave">
                No hay eventos registrados en la auditoría.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.idLocal || log.timestamp}>
                <td>{new Date(log.timestamp).toLocaleString('es-CO')}</td>
                <td><strong>{log.user}</strong></td>
                <td>
                  {log.action === "BLOQUEO" && <Badge tone="red">BLOQUEO</Badge>}
                  {log.action === "LIBERACIÓN" && <Badge tone="green">LIBERACIÓN</Badge>}
                  {log.action === "PROCESO" && <Badge tone="brown">PROCESO</Badge>}
                  {log.action === "EDICIÓN" && <Badge tone="slate">EDICIÓN</Badge>}
                </td>
                <td><strong>{log.lotCode}</strong></td>
                <td>{log.fieldChanged}</td>
                <td><small>{log.previousValue}</small></td>
                <td><small>{log.newValue}</small></td>
                <td>{log.reason || 'N/A'}</td>
              </tr>
            ))
          )}
        </DataTable>
      </section>

      {showModal && lotes.length > 0 && (
        <ModalCambioEstado
          lotes={lotes}
          loteInicial={lotes[0]}
          nuevoInicial="BLOQUEADO"
          onClose={() => setShowModal(false)}
          onDone={() => setShowModal(false)}
        />
      )}
    </>
  )
}