import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useNetwork } from '@/context/NetworkContext'
import { useAuth } from '@/context/AuthContext'
import { Wifi, WifiOff, LogOut, Sprout } from 'lucide-react'

export const Header: React.FC = () => {
  const { isOnline } = useNetwork()
  const { rol, nombreUsuario, setRol } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    setRol('OPERADOR')
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* IsoLogo visible solo en móviles */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Sprout size={18} />
          </div>
          <span className="font-extrabold text-slate-900 text-sm">AgroCacao</span>
        </div>

        {/* Indicador de estado Offline/Online */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isOnline ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'En línea' : 'Sin conexión'}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <strong className="block text-xs text-slate-900 font-bold">{nombreUsuario || 'Operador Campo'}</strong>
          <span className="text-[10px] text-slate-500 uppercase font-semibold">{rol}</span>
        </div>

        <button 
          onClick={handleLogout} 
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}