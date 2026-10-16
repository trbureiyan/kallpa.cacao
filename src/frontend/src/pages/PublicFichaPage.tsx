import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '@/components/ui';
import { prefetchRuta } from '@/utils/prefetch';
import { LIMITES, normalizarCodigoLote, validarCodigoLote } from '@/utils/validacion';
import { PublicFichaCard } from '@/features/ficha-comercial/components/PublicFichaCard.tsx';

export const PublicFichaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const lotCodeParam = searchParams.get('lote') ?? '';
  const [codigo, setCodigo] = useState(lotCodeParam);
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <div className="public-shell">
      <header className="public-header">
        <Logo />
        <button
          onClick={() => navigate('/login')}
          onMouseEnter={() => prefetchRuta('/login')}
          onFocus={() => prefetchRuta('/login')}
          className="btn btn-secondary"
        >
          Acceso interno
        </button>
      </header>

      <div className="public-main">
      <form
        className="public-search"
        onSubmit={(e) => {
          e.preventDefault();
          const c = normalizarCodigoLote(codigo);
          const invalido = c ? validarCodigoLote(c) : null;
          setAviso(invalido);
          if (!invalido) setSearchParams(c ? { lote: c } : {});
        }}
      >
        <label className="field flex-1">
          <span>Código del lote</span>
          <input
            className="input"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            maxLength={LIMITES.codigoLote}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!aviso}
            aria-describedby="aviso-codigo"
            placeholder="Por ejemplo CAC001"
          />
          {aviso && <small id="aviso-codigo" className="nota-error" role="alert">{aviso}</small>}
        </label>
        <button type="submit" className="btn btn-primary">Consultar</button>
      </form>

      {lotCodeParam ? (
        <PublicFichaCard lotCode={lotCodeParam} />
      ) : (
        <p className="public-empty">Escriba el código del lote para ver su ficha comercial.</p>
      )}

      </div>

      <footer className="public-footer">
        <div>
          <strong>KallpaCacao</strong>
          <p>Trazabilidad del cacao del Huila</p>
        </div>
        <p className="footer-note">
          Esta ficha muestra solo información autorizada para compradores. Datos simulados del reto de la II Hackathon USCO.
        </p>
      </footer>
    </div>
  );
};
