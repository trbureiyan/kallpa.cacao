import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useLiveQuery } from "dexie-react-hooks"
import { PageHead } from "@/components/shared"
import { Icon } from "@/components/ui"
import { useAuth } from "@/context/AuthContext"
import { db } from "@/db/dexieDb"
import { esDeLaCola, sincronizarRecepcionesPendientes } from "@/features/recepcion/api/recepcionSync"
import { ErroresSincronizacion } from "@/features/recepcion/components/ErroresSincronizacion"
import { RecepcionForm } from "@/features/recepcion/components/RecepcionForm.tsx"
import { RecentLotsTable } from "@/features/recepcion/components/RecentLotsTable"

export function ReceptionPage({
  online,
  addPending,
}: {
  online: boolean
  addPending: () => void
}) {
  const { modo } = useAuth()
  const { hash } = useLocation()

  // En modo API la tabla muestra la cola del servidor; en modo local, los lotes del dispositivo. Nunca ambas.
  const lotesLocales = useLiveQuery(
    async () => (await db.recepciones.reverse().toArray()).filter((r) => esDeLaCola(r) === (modo === "api")),
    [modo],
    [],
  )
  const hayErrores = lotesLocales.some((r) => r.syncStatus === "ERROR")

  // El aviso de la cabecera lleva aquí: se enfoca la lista para que el lector de pantalla la anuncie
  useEffect(() => {
    if (hash !== "#errores-sincronizacion" || !hayErrores) return
    const lista = document.getElementById("errores-sincronizacion")
    lista?.focus()
    lista?.scrollIntoView?.({ block: "start" })
  }, [hash, hayErrores])

  // Sincronización automática cuando cambia el estado de conexión
  useEffect(() => {
    if (!online) return

    void sincronizarRecepcionesPendientes(modo).catch((error) => {
      console.error("Error al sincronizar las recepciones:", error)
    })
  }, [online, modo])

  return (
    <>
      <PageHead
        eyebrow="RF01 · Recepción"
        title="Recepción de lotes"
        text="Registre cacao en grano desde campo, con conectividad limitada."
      />

      <div className="split-layout">
        <RecepcionForm isOnline={online} onSuccess={() => !online && addPending()} />

        <aside className="field-tip">
          <div className="tip-icon">
            <Icon name="sprout" size={28} />
          </div>

          <div className="eyebrow">Consejo de campo</div>
          <div className="section-title mt-2">Verifique el peso neto</div>

          <p>
            Confirme que la báscula esté calibrada y descuente el peso del
            empaque antes de guardar el registro.
          </p>

          <div className="mini-stat">
            <span>Último registrado</span>
            <strong>{lotesLocales?.[0]?.lotCode || "Sin registros"}</strong>
          </div>
        </aside>
      </div>

      <ErroresSincronizacion modo={modo} />

      <RecentLotsTable lots={lotesLocales} />
    </>
  )
}