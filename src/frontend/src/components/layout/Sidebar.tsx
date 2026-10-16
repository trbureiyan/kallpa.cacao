import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  PackageInput, 
  Workflow, 
  GitCommit, 
  Boxes, 
  ShieldAlert, 
  Users, 
  HelpCircle,
  Sprout
} from 'lucide-react'

export const Sidebar: React.FC = () => {
  const menuItems = [
    { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
    { to: '/recepcion', label: 'Recepción', icon: PackageInput },
    { to: '/transformacion', label: 'Transformación', icon: Workflow },
    { to: '/trazabilidad', label: 'Trazabilidad', icon: GitCommit },
    { to: '/inventario', label: 'Inventario', icon: Boxes },
    { to: '/auditoria', label: 'Auditoría', icon: ShieldAlert },
    { to: '/usuarios', label: 'Usuarios', icon: Users },
  ]

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between p-4 shrink-0">
      <div>
        {/* Logo y Nombre */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
            <Sprout size={24} />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-base leading-tight">
              AgroCacao <span className="text-emerald-600">Huila</span>
            </h1>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
              Trazabilidad con origen
            </span>
          </div>
        </div>

        <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-3">
          Espacio de trabajo
        </div>

        {/* Enlaces de Navegación */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const IconComponent = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-r-4 border-emerald-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <IconComponent size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* Tarjeta de Ayuda Inferior */}
      <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <HelpCircle size={18} />
        </div>
        <div>
          <strong className="text-xs font-bold text-emerald-950 block">¿Necesitas ayuda?</strong>
          <span className="text-[11px] text-emerald-700 block">Guía rápida de campo</span>
        </div>
      </div>
    </aside>
  )
}