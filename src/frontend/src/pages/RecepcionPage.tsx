import { useLiveQuery } from "dexie-react-hooks"
import { PageHead } from "@/components/shared"
import { Icon } from "@/components/ui"
import { db } from "@/db/dexieDb"
import { useNetwork } from "@/context/NetworkContext"
import { RecepcionForm } from "@/features/recepcion/components/RecepcionForm"
import { RecentLotsTable } from "@/features/recepcion/components/RecentLotsTable"

export function ReceptionPage() {
  const { isOnline } = useNetwork()
  const items = useLiveQuery(() => db.colaRecepciones.orderBy("creadoEn").reverse().toArray(), [], [])

  return (
    <>
      <PageHead
        eyebrow="RF01 · Recepción"
        title="Recepción de lotes"
        text="Registre el cacao recibido. Con conectividad limitada se guarda en el dispositivo y se envía después."
      />

      <div className="split-layout">
        <RecepcionForm isOnline={isOnline} />

        <aside className="field-tip">
          <div className="tip-icon"><Icon name="sprout" size={28} /></div>
          <div className="eyebrow">Consejo de campo</div>
          <div className="section-title mt-2">Verifique el peso neto</div>
          <p>Confirme que la báscula esté calibrada y descuente el peso del empaque antes de guardar.</p>
          <div className="mini-stat">
            <span>Pendientes de envío</span>
            <strong>{items.filter((i) => i.estado === "PENDING").length}</strong>
          </div>
        </aside>
      </div>

      <RecentLotsTable items={items} />
    </>
  )
}
