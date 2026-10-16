import type { ReactNode } from "react"
import type { IconName } from "@/types/app"

const paths: Record<IconName, ReactNode> = {
  leaf: (
    <>
      <path d="M5 21c4-8 8-12 14-16" />
      <path d="M5 16C3 9 8 4 20 4c0 12-7 17-15 12Z" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 12.6a10 10 0 0 1 14 0" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <path d="M12 20h.01" />
    </>
  ),
  wifiOff: (
    <>
      <path d="m3 3 18 18" />
      <path d="M8.5 8.5A11 11 0 0 1 19 12.6" />
      <path d="M5 12.6a10 10 0 0 1 1.4-1.2" />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <path d="M12 20h.01" />
    </>
  ),
  sync: (
    <>
      <path d="M20 7h-5V2" />
      <path d="M20 7a9 9 0 0 0-15.5-2" />
      <path d="M4 17h5v5" />
      <path d="M4 17a9 9 0 0 0 15.5 2" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v11h14V10M9 21v-7h6v7" />
    </>
  ),
  box: (
    <>
      <path d="m21 8-9 5-9-5 9-5 9 5Z" />
      <path d="m3 8 9 5 9-5v9l-9 5-9-5V8Z" />
    </>
  ),
  process: (
    <>
      <path d="M4 6h16M4 18h16" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="18" r="2" />
      <path d="M9 8v3a3 3 0 0 0 3 3h3" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M6 17c0-6 12-4 12-10" />
    </>
  ),
  warehouse: (
    <>
      <path d="m3 10 9-7 9 7v11H3V10Z" />
      <path d="M7 21v-7h10v7M7 10h.01M12 10h.01M17 10h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M5 19h14" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  alert: (
    <>
      <path d="M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  x: <path d="m6 6 12 12M18 6 6 18" />,
  sprout: (
    <>
      <path d="M12 22V12" />
      <path d="M7 12c-3 0-5-2-5-6 4 0 7 2 7 6H7ZM17 10c3 0 5-2 5-6-4 0-7 2-7 6h2Z" />
    </>
  ),
  certificate: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8 14-1 8 5-3 5 3-1-8" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
}

export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode
  tone?: "green" | "amber" | "red" | "brown" | "slate"
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="logo-mark">
        <Icon name="leaf" size={24} />
      </div>
      <div>
        <div
          className={`font-extrabold tracking-tight text-lg leading-none ${
            light ? "text-white" : "text-slate-900"
          }`}
        >
          AgroCacao <span className="text-emerald-600">Huila</span>
        </div>
        <div
          className={`text-[10px] font-bold uppercase tracking-[.18em] mt-1 ${
            light ? "text-emerald-200" : "text-slate-400"
          }`}
        >
          Trazabilidad con origen
        </div>
      </div>
    </div>
  )
}