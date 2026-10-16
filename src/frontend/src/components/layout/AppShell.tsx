import { useEffect, type ReactNode } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Badge, Button, Icon, Logo } from "@/components/ui"
import { useAuth } from "@/context/AuthContext"
import { actualizarFincasCache, sincronizarCola } from "@/features/offline/cola"
import { ROLES, type RolApi } from "@/shared/etiquetas"
import { useNetwork } from "@/context/NetworkContext"
import type { IconName } from "@/types/app"

interface NavItem {
  name: string
  path: string
  icon: IconName
  roles: RolApi[]
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, salir } = useAuth()
  const rol: RolApi = usuario?.role ?? "operator"
  const { isOnline } = useNetwork()

  const navigation: NavItem[] = [
    {
      name: "Resumen",
      path: "/dashboard",
      icon: "home",
      roles: ["operator", "admin"],
    },
    {
      name: "Recepción",
      path: "/recepcion",
      icon: "box",
      roles: ["operator", "admin"],
    },
    {
      name: "Transformación",
      path: "/transformacion",
      icon: "process",
      roles: ["operator", "admin"],
    },
    {
      name: "Trazabilidad",
      path: "/trazabilidad",
      icon: "route",
      roles: ["operator", "admin"],
    },
    {
      name: "Inventario",
      path: "/inventario",
      icon: "warehouse",
      roles: ["admin"],
    },
    {
      name: "Auditoría",
      path: "/auditoria",
      icon: "shield",
      roles: ["admin"],
    },
  ]

  // Filtrar ítems de menú según el rol activo
  // Con conexión: refresca el catálogo de fincas y reenvía la cola de recepciones (idempotente).
  useEffect(() => {
    if (!isOnline) return
    void actualizarFincasCache()
    void sincronizarCola()
  }, [isOnline])

  const visibleNav = navigation.filter((item) => item.roles.includes(rol))

  const handleLogout = () => {
    salir()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Barra Lateral Vertical Fija (Desktop) */}
      <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between p-4 shrink-0 hidden md:flex">
        <div>
          {/* Logo del sistema */}
          <div 
            className="cursor-pointer px-2 py-3 mb-6" 
            onClick={() => navigate("/recepcion")}
          >
            <Logo />
          </div>

          <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-3">
            ESPACIO DE TRABAJO
          </div>

          {/* Menú de Navegación Vertical */}
          <nav className="space-y-1">
            {visibleNav.map((item) => {
              const active = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    active
                      ? "bg-emerald-50 text-emerald-700 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} size={18} />
                    <span>{item.name}</span>
                  </div>
                  {active && (
                    <span className="w-1.5 h-5 bg-emerald-600 rounded-full" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

      </aside>

      {/* 2. Área Principal de Trabajo (Header Superior + Contenido) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Superior Corto */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Logo visible solo en pantallas móviles */}
            <div className="md:hidden cursor-pointer" onClick={() => navigate("/recepcion")}>
              <Logo />
            </div>

            <Badge tone={isOnline ? "green" : "amber"}>
              <Icon name={isOnline ? "wifi" : "wifiOff"} size={14} />
              {isOnline ? "En línea" : "Conectividad limitada"}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right text-xs">
              <span className="font-bold text-slate-900">{usuario?.full_name}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{ROLES[rol]}</span>
            </div>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="!p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              title="Cerrar sesión"
            >
              <Icon name="logout" size={18} />
            </Button>
          </div>
        </header>

        {/* Contenido Principal de cada Vista */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* 3. Navegación Móvil Inferior */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 flex justify-around p-2">
        {visibleNav.map((item) => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 p-2 text-[10px] font-bold ${
                active ? "text-emerald-400" : "text-slate-400"
              }`}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}