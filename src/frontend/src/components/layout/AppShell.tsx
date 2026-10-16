import type { ReactNode } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Button, Icon, Logo } from "@/components/ui"
import { estadoConexion } from "@/components/ui/conexion"
import { IndicadorConexion } from "@/components/ui/marca"
import { useAuth } from "@/context/AuthContext"
import { rutasPermitidas } from "@/context/rutas"
import { useNetwork } from "@/context/NetworkContext"
import { useEstadoCola } from "@/features/recepcion/useEstadoCola"
import { prefetchRuta } from "@/utils/prefetch"
import type { IconName } from "@/types/app"

interface NavItem {
  name: string
  path: string
  icon: IconName
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { rol, nombreUsuario, modo, cerrarSesion } = useAuth()
  const { estadoServidor } = useNetwork()
  const { pendientes, errores } = useEstadoCola()

  const navigation: NavItem[] = [
    {
      name: "Recepción",
      path: "/recepcion",
      icon: "box",
    },
    {
      name: "Transformación",
      path: "/transformacion",
      icon: "process",
    },
    {
      name: "Trazabilidad",
      path: "/trazabilidad",
      icon: "route",
    },
    {
      name: "Inventario",
      path: "/inventario",
      icon: "warehouse",
    },
    {
      name: "Auditoría",
      path: "/auditoria",
      icon: "shield",
    },
  ]

  // Filtrar ítems de menú según el rol activo
  const visibleNav = navigation.filter((item) => rutasPermitidas(rol).includes(item.path))

  const handleLogout = () => {
    cerrarSesion()
    navigate("/login")
  }

  return (
    <div className="min-h-screen bg-fondo flex">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      {/* 1. Barra Lateral Vertical Fija (Desktop) */}
      <aside className="w-64 bg-superficie border-r border-borde sticky top-0 h-screen overflow-y-auto flex-col justify-between p-4 shrink-0 hidden md:flex">
        <div>
          {/* Logo del sistema */}
          <button
            type="button"
            className="px-2 py-3 mb-6 text-left"
            onClick={() => navigate("/recepcion")}
            onMouseEnter={() => prefetchRuta("/recepcion")}
            onFocus={() => prefetchRuta("/recepcion")}
            aria-label="KallpaCacao, ir a Recepción"
          >
            <Logo />
          </button>

          <div className="text-xs font-bold tracking-wider text-texto-suave uppercase px-3 mb-3">
            ESPACIO DE TRABAJO
          </div>

          {/* Menú de Navegación Vertical */}
          <nav aria-label="Principal" className="space-y-1">
            {visibleNav.map((item) => {
              const active = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  onMouseEnter={() => prefetchRuta(item.path)}
                  onFocus={() => prefetchRuta(item.path)}
                  aria-current={active ? "page" : undefined}
                  className={`w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-md font-semibold text-base ${
                    active
                      ? "bg-acento-suave text-acento-suave-texto"
                      : "text-texto-suave hover:bg-hundido hover:text-texto"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={item.icon} size={18} />
                    <span>{item.name}</span>
                  </div>
                  {active && (
                    <span className="w-1.5 h-5 bg-acento rounded-full" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <p className="px-3 pt-4 text-xs text-texto-tenue border-t border-borde">
          Datos simulados. II Hackathon USCO.
        </p>
      </aside>

      {/* 2. Área Principal de Trabajo (Header Superior + Contenido) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Superior Corto */}
        <header className="bg-superficie border-b border-borde px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Logo visible solo en pantallas móviles */}
            <button
              type="button"
              className="md:hidden text-left"
              onClick={() => navigate("/recepcion")}
              onMouseEnter={() => prefetchRuta("/recepcion")}
              onFocus={() => prefetchRuta("/recepcion")}
              aria-label="KallpaCacao, ir a Recepción"
            >
              <Logo />
            </button>

            <IndicadorConexion estado={estadoConexion({ servidor: estadoServidor, pendientes })} pendientes={pendientes} />
            {errores > 0 && modo === "api" && (
              <button
                type="button"
                className="aviso-errores"
                onClick={() => navigate("/recepcion#errores-sincronizacion")}
                aria-label={`${errores === 1 ? "Una recepción" : `${errores} recepciones`} con error de sincronización. Revisar en Recepción.`}
              >
                <Icon name="alert" size={16} />
                {errores} con error
                <span className="hidden sm:inline">· Revisar</span>
              </button>
            )}
            {modo === "local" && (
              <span className="badge" title="Los datos de este modo viven solo en este dispositivo">
                Modo local
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right text-xs">
              <span className="font-bold text-texto">{nombreUsuario}</span>
              <span className="text-xs text-texto-suave uppercase tracking-wider">{rol}</span>
            </div>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="!p-2 text-texto-suave hover:text-texto hover:bg-hundido"
              title="Cerrar sesión"
            >
              <Icon name="logout" size={18} />
            </Button>
          </div>
        </header>

        {/* Contenido Principal de cada Vista */}
        <main id="contenido" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>

        <footer className="app-footer">
          <span>KallpaCacao · Trazabilidad del cacao del Huila</span>
          <span>Datos simulados</span>
        </footer>
      </div>

      {/* 3. Navegación Móvil Inferior */}
      <nav aria-label="Principal móvil" className="md:hidden fixed bottom-0 left-0 right-0 bg-superficie border-t border-borde-fuerte z-50 flex justify-around p-2">
        {visibleNav.map((item) => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              onMouseEnter={() => prefetchRuta(item.path)}
              onFocus={() => prefetchRuta(item.path)}
              aria-current={active ? "page" : undefined}
              className={`min-h-11 min-w-11 flex flex-col items-center gap-1 p-2 text-xs font-semibold ${
                active ? "text-acento-suave-texto bg-acento-suave rounded-md" : "text-texto-suave"
              }`}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.name}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}