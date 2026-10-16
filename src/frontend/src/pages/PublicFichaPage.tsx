import React from 'react';
import { useNavigate } from 'react-router-dom';

export const PublicFichaPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 text-center max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800">Ficha Comercial Pública (RF06)</h1>
      <p className="mt-2 text-slate-600">
        Vista pública accesible para compradores mediante código QR sin requerir inicio de sesión.
      </p>
      <button
        onClick={() => navigate('/login')}
        className="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
      >
        Volver al Login
      </button>
    </div>
  );
};