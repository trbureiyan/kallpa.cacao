import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { PageHead } from "@/components/shared"
import { db } from "@/db/dexieDb"
import { sincronizarRecepcionesPendientes } from "@/features/recepcion/api/recepcionSync"
import { RecepcionForm } from "@/features/recepcion/components/RecepcionForm.tsx"
import { RecentLotsTable } from "@/features/recepcion/components/RecentLotsTable"

export function ReceptionPage({
  online,
  addPending,
}: {
  online: boolean
  addPending: () => void
}) {
  const [search] = useState("")

  // Consulta reactiva a Dexie
  const lotesLocales = useLiveQuery(
    () => db.recepciones.reverse().toArray(),
    [],
    [],
  )

  // Sincronización automática cuando cambia el estado de conexión
  useEffect(() => {
    if (!online) return

    void sincronizarRecepcionesPendientes().catch((error) => {
      console.error("Error al sincronizar las recepciones:", error)
    })
  }, [online])

  // Filtrar los lotes locales
  const lotesFiltrados = (lotesLocales || []).filter(
    (lote) =>
      lote.lotCode.toLowerCase().includes(search.toLowerCase()) ||
      lote.producer.toLowerCase().includes(search.toLowerCase()) ||
      lote.origin.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <PageHead
        eyebrow="RF01 · Recepción"
        title="Recepción de lotes"
        text="Registra cacao en grano desde campo, incluso sin conexión."
      />

      <div className="split-layout">
        <RecepcionForm isOnline={online} onSuccess={() => !online && addPending()} />

        <aside className="field-tip">
          <div className="tip-icon">
            <span style={{ fontSize: "1.8rem" }}>🌱</span>
          </div>

          <div className="eyebrow">Consejo de campo</div>
          <div className="section-title mt-2">Verifica el peso neto</div>

          <p>
            Confirma que la báscula esté calibrada y descuenta el peso del
            empaque antes de guardar el registro.
          </p>

          <div className="mini-stat">
            <span>Último registrado</span>
            <strong>{lotesLocales?.[0]?.lotCode || "Sin registros"}</strong>
          </div>
        </aside>
      </div>

      <RecentLotsTable lots={lotesFiltrados} />
    </>
  )
}