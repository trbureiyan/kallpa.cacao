import React from 'react'
import { useNetwork } from '@/context/NetworkContext'
import { useAuth } from '@/context/AuthContext'
import { Wifi, WifiOff, LogOut } from 'lucide-react'

export const Header: React.FC = () => {
  const { isOnline } = useNetwork()
  const { rol, nombreUsuario, logout } = useAuth()

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
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

        <button onClick={logout} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}