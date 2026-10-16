import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PublicFichaCard } from '@/features/ficha-comercial/components/PublicFichaCard.tsx';

export const PublicFichaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lotCodeParam = searchParams.get('lote') || 'CAC128';

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="flex items-center gap-2 font-black text-lg text-emerald-800">
          <span>AGROCACAO HUILA</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="btn btn-secondary"
        >
          Acceso Administrador / Operador
        </button>
      </header>

      <PublicFichaCard lotCode={lotCodeParam} />

      <footer className="public-footer">
        <div>
          <strong>AgroCacao Huila PWA</strong>
          <p>Trazabilidad e Identidad para la Cadena de Cacao del Huila</p>
        </div>
        <div>
          <span>Certificación de Origen y Deforestación Cero</span>
        </div>
      </footer>
    </div>
  );
};