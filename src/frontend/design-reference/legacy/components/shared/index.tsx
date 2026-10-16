import type { ReactNode } from "react"
import { Icon } from "@/components/ui"
import type { IconName } from "@/types/app"

// Exportamos Badge desde UI para compatibilidad de importación
export { Badge } from "@/components/ui"

export function PageHead({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <div className="page-title">{title}</div>
        <p>{text}</p>
      </div>
      {action}
    </div>
  )
}

export function Timeline() {
  const steps = [
    [
      "Origen en finca",
      "Finca El Porvenir · Rivera, Huila",
      "18 mayo, 2025",
      "sprout",
    ],
    [
      "Recepción del lote",
      "CAC128 · Peso neto: 320 kg",
      "20 mayo · 08:42",
      "box",
    ],
    [
      "Fermentación",
      "6 días · Merma registrada: 8,4%",
      "20–26 mayo",
      "process",
    ],
    ["Secado solar", "Humedad final certificada: 7,2%", "27–30 mayo", "home"],
    [
      "Producto final",
      "Cacao seco premium · Lote liberado",
      "31 mayo, 2025",
      "certificate",
    ],
  ]

  return (
    <div className="timeline">
      {steps.map(([title, text, date, icon], i) => (
        <div className="timeline-step" key={title}>
          <div
            className={`timeline-icon ${
              i === steps.length - 1 ? "current" : ""
            }`}
          >
            <Icon name={icon as IconName} />
          </div>
          <div className="timeline-content">
            <small>Paso {String(i + 1).padStart(2, "0")}</small>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
          <time>{date}</time>
        </div>
      ))}
    </div>
  )
}

export function DataTable({
  headers,
  children,
}: {
  headers: string[]
  children: ReactNode
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}