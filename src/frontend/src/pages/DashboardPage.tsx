import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetwork } from '@/context/NetworkContext';
import { useAuth } from '@/context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { isOnline } = useNetwork();
  const { rol } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Panel Principal — Rol: <span className="text-emerald-600 uppercase">{rol}</span>
        </h1>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-medium transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
      <p className="text-slate-600">
        Estado de Red: {isOnline ? '🟢 En línea' : '🟠 Sin Conexión (Modo Offline Activo)'}
      </p>
    </div>
  );
};