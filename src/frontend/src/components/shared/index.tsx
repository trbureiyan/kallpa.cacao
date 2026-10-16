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

export function Timeline({ steps }: { steps: { title: string; description: string; date: string; icon: IconName }[] }) {
  return (
    <div className="timeline">
      {steps.map((step, i) => (
        <div className="timeline-step" key={`${step.title}-${i}`}>
          <div className={`timeline-icon ${i === steps.length - 1 ? "current" : ""}`}>
            <Icon name={step.icon} />
          </div>
          <div className="timeline-content">
            <small>Paso {String(i + 1).padStart(2, "0")}</small>
            <strong>{step.title}</strong>
            <p>{step.description}</p>
          </div>
          {step.date && <time>{step.date}</time>}
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