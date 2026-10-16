import { useState, useEffect } from "react"
import { Badge, Button, Field, Icon } from "@/components/ui"
import { DataTable, PageHead } from "@/components/shared"
import { db, type AuditEntry } from "@/db/dexieDb"
import { useAuth } from "@/context/AuthContext"

export function AuditPage({ onAction }: { onAction?: () => void }) {
  const { nombreUsuario } = useAuth()
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [showModal, setShowModal] = useState(false)
  
  const [targetLot, setTargetLot] = useState("CAC128")
  const [actionType, setActionType] = useState<"BLOQUEO" | "LIBERACIÓN">("BLOQUEO")
  const [motivo, setMotivo] = useState("")

  const cargarLogs = async () => {
    const guardados = await db.auditLogs.reverse().toArray()
    setLogs(guardados)
  }

  useEffect(() => {
    cargarLogs()
  }, [])

  const handleEjecutarAccion = async () => {
    if (!motivo.trim()) return

    const lote = await db.recepciones.where("lotCode").equals(targetLot).first()

    // Registrar en auditoría inmutable
    await db.auditLogs.add({
      timestamp: new Date().toISOString(),
      user: nombreUsuario || "Administrador",
      action: actionType,
      fieldChanged: "status",
      previousValue: lote?.status || "PENDIENTE",
      newValue: actionType === "BLOQUEO" ? "BLOQUEADO" : "LIBERADO",
      lotCode: targetLot,
      reason: motivo,
    })

    if (lote && lote.idLocal !== undefined) {
      await db.recepciones.update(lote.idLocal, {
        status: actionType === "BLOQUEO" ? "BLOQUEADO" : "LIBERADO",
      })
    }

    setShowModal(false)
    setMotivo("")
    await cargarLogs()
    if (onAction) onAction()
  }

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
              <td colSpan={8} className="text-center py-4 text-slate-500">
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

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-head">
              <h3 className="section-title">Gestionar estado del lote</h3>
              <button onClick={() => setShowModal(false)} className="icon-button">
                ✕
              </button>
            </div>

            <div className="modal-body space-y-4">
              <Field label="Código del lote">
                <input
                  className="input"
                  value={targetLot}
                  onChange={(e) => setTargetLot(e.target.value)}
                />
              </Field>

              <Field label="Acción a realizar">
                <select
                  className="input"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                >
                  <option value="BLOQUEO">Bloquear Lote (Incidencia de Calidad)</option>
                  <option value="LIBERACIÓN">Liberar Lote (Conforme para venta)</option>
                </select>
              </Field>

              <Field label="Motivo o Justificación (Obligatorio)">
                <textarea
                  className="input min-h-20"
                  placeholder="Describe la razón técnica o la observación..."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>

              <Button
                disabled={!motivo.trim()}
                className={actionType === 'BLOQUEO' ? 'btn-danger' : 'btn-primary'}
                onClick={handleEjecutarAccion}
              >
                Confirmar {actionType}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}