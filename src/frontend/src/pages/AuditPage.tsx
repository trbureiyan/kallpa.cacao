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

    await db.auditLogs.add({
      timestamp: new Date().toLocaleString(),
      user: nombreUsuario,
      action: actionType,
      fieldChanged: `Estado · ${targetLot}`,
      previousValue: actionType === "BLOQUEO" ? "LIBERADO" : "BLOQUEADO",
      newValue: actionType === "BLOQUEO" ? "BLOQUEADO" : "LIBERADO",
      lotCode: targetLot,
      reason: motivo
    })

    const lote = await db.recepciones.where("lotCode").equals(targetLot).first()
    if (lote && lote.idLocal !== undefined) {
      await db.recepciones.update(lote.idLocal, {
        status: actionType === "BLOQUEO" ? "BLOQUEADO" : "LIBERADO"
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
        eyebrow="RF09 · RF10"
        title="Auditoría e incidencias"
        text="Historial inmutable de cambios y decisiones sobre los lotes."
        action={
          <Button onClick={() => setShowModal(true)}>
            <Icon name="lock" /> Gestionar lote
          </Button>
        }
      />

      <div className="audit-notice">
        <Icon name="shield" />
        <div>
          <strong>Registro protegido e inmutable</strong>
          <p>
            Los eventos de auditoría no pueden editarse ni eliminarse. Cada cambio conserva usuario, fecha y valores.
          </p>
        </div>
      </div>

      <section className="card mt-6">
        <div className="card-head">
          <div>
            <div className="section-title">Historial de auditoría</div>
            <p>Actividad registrada en el sistema</p>
          </div>
          <Badge tone="slate">
            <Icon name="clock" size={14} /> Actualizado ahora
          </Badge>
        </div>

        <DataTable
          headers={[
            "Fecha y hora",
            "Usuario",
            "Acción",
            "Campo modificado",
            "Valor anterior",
            "Valor nuevo",
          ]}
        >
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-4 text-slate-500">
                No hay eventos registrados en la auditoría.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.idLocal || log.timestamp}>
                <td>{log.timestamp}</td>
                <td><strong>{log.user}</strong></td>
                <td>
                  {log.action === "BLOQUEO" && <Badge tone="red">BLOQUEO</Badge>}
                  {log.action === "LIBERACIÓN" && <Badge tone="green">LIBERACIÓN</Badge>}
                  {log.action === "PROCESO" && <Badge tone="brown">PROCESO</Badge>}
                  {log.action === "EDICIÓN" && <Badge tone="slate">EDICIÓN</Badge>}
                </td>
                <td>{log.fieldChanged}</td>
                <td>{log.previousValue}</td>
                <td>{log.newValue}</td>
              </tr>
            ))
          )}
        </DataTable>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">Bloquear / Liberar Lote</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={20} />
              </button>
            </div>

            <Field label="Lote de Cacao">
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
                <option value="BLOQUEO">Bloquear Lote (Incidencia)</option>
                <option value="LIBERACIÓN">Liberar Lote (Aprobación)</option>
              </select>
            </Field>

            <Field label="Motivo o Justificación (Obligatorio)">
              <textarea
                className="input min-h-20"
                placeholder="Describe la razón técnica o de calidad..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
              />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="w-full" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>

              <Button
                disabled={!motivo.trim()}
                className={`w-full ${actionType === 'BLOQUEO' ? '!bg-red-600 hover:!bg-red-700' : ''}`}
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