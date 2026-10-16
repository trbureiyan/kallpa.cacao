import React, { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PublicFichaCard } from '@/features/ficha-comercial/components/PublicFichaCard';

export const PublicFichaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const codigo = searchParams.get('lote') ?? '';
  const [entrada, setEntrada] = useState(codigo);

  const consultar = (e: FormEvent) => {
    e.preventDefault();
    setSearchParams(entrada.trim() ? { lote: entrada.trim() } : {});
  };

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="flex items-center gap-2 font-black text-lg text-emerald-800">
          <span>AGROCACAO HUILA</span>
        </div>
        <button onClick={() => navigate('/login')} className="btn btn-secondary">
          Acceso de operadores y administradores
        </button>
      </header>

      <form onSubmit={consultar} className="flex gap-2 max-w-xl mx-auto my-6 px-4">
        <input
          className="input"
          aria-label="Código del producto"
          placeholder="Código del producto"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Consultar</button>
      </form>

      {codigo ? (
        <PublicFichaCard codigo={codigo} />
      ) : (
        <p className="text-center text-sm text-slate-500">Ingrese el código del producto que desea consultar.</p>
      )}

      <footer className="public-footer">
        <div>
          <strong>AgroCacao Huila</strong>
          <p>Ficha comercial con datos autorizados. Caso simulado del reto de la hackathon.</p>
        </div>
      </footer>
    </div>
  );
};
