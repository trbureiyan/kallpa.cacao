import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/ui';
import { PublicFichaCard } from '@/features/ficha-comercial/components/PublicFichaCard.tsx';

export const PublicFichaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const lotCodeParam = searchParams.get('lote') ?? '';
  const [codigo, setCodigo] = useState(lotCodeParam);

  return (
    <div className="public-shell">
      <header className="public-header">
        <Logo />
        <button onClick={() => navigate('/login')} className="btn btn-secondary">
          Acceso interno
        </button>
      </header>

      <form
        className="max-w-4xl mx-auto my-4 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearchParams(codigo.trim() ? { lote: codigo.trim() } : {});
        }}
      >
        <label className="field flex-1">
          <span>Código del lote</span>
          <input className="input" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Por ejemplo CAC001" />
        </label>
        <button type="submit" className="btn btn-primary">Consultar</button>
      </form>

      {lotCodeParam ? (
        <PublicFichaCard lotCode={lotCodeParam} />
      ) : (
        <p className="max-w-4xl mx-auto text-texto-suave">Escriba el código del lote para ver su ficha comercial.</p>
      )}

      <footer className="public-footer">
        <div>
          <strong>KallpaCacao</strong>
          <p>Trazabilidad del cacao del Huila</p>
        </div>
      </footer>
    </div>
  );
};
