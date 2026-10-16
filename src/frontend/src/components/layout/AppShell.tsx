import type { ReactNode } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Badge, Button, Icon, Logo } from "@/components/ui"
import { useAuth, type RolUsuario } from "@/context/AuthContext"
import { useNetwork } from "@/context/NetworkContext"
import type { IconName } from "@/types/app"

interface NavItem {
  name: string
  path: string
  icon: IconName
  roles: RolUsuario[]
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { rol, nombreUsuario, setRol } = useAuth()
  const { isOnline } = useNetwork()

  const navigation: NavItem[] = [
    {
      name: "Recepción",
      path: "/recepcion",
      icon: "box",
      roles: ["OPERADOR", "ADMINISTRADOR"],
    },
    {
      name: "Transformación",
      path: "/transformacion",
      icon: "process",
      roles: ["OPERADOR", "ADMINISTRADOR"],
    },
    {
      name: "Trazabilidad",
      path: "/trazabilidad",
      icon: "route",
      roles: ["OPERADOR", "ADMINISTRADOR"],
    },
    {
      name: "Inventario",
      path: "/inventario",
      icon: "warehouse",
      roles: ["ADMINISTRADOR"],
    },
    {
      name: "Auditoría",
      path: "/auditoria",
      icon: "shield",
      roles: ["ADMINISTRADOR"],
    },
  ]

  // Filtrar ítems de menú según el rol activo
  const visibleNav = navigation.filter((item) => item.roles.includes(rol))

  const handleLogout = () => {
    setRol("OPERADOR")
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Topbar Navigation */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="cursor-pointer" onClick={() => navigate("/recepcion")}>
            <Logo light />
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {visibleNav.map((item) => {
              const active = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon name={item.icon} size={16} />
                  {item.name}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Badge tone={isOnline ? "green" : "amber"}>
              <Icon name={isOnline ? "wifi" : "wifiOff"} size={14} />
              {isOnline ? "En línea" : "Offline"}
            </Badge>

            <div className="hidden sm:flex flex-col text-right text-xs">
              <span className="font-bold text-slate-200">{nombreUsuario}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{rol}</span>
            </div>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="!p-2 text-slate-400 hover:text-white"
              title="Cerrar sesión"
            >
              <Icon name="logout" size={18} />
            </Button>
          </div>
        </div>
      </header>

      {/* Navegación móvil inferior (Mobile Bottom Nav) */}
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

      {/* Contenido principal de las vistas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  )
}