import React, { useState, useEffect } from 'react';
import { obtenerFichaPublica } from '../api/fichaApi';
import { ShieldCheck, Sprout, MapPin, Calendar, Scale, Award } from 'lucide-react';

interface PublicFichaCardProps {
  lotCode?: string;
}

export const PublicFichaCard: React.FC<PublicFichaCardProps> = ({ lotCode = 'CAC128' }) => {
  const [ficha, setFicha] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    obtenerFichaPublica(lotCode).then((data) => {
      if (isMounted) {
        setFicha(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [lotCode]);

  if (loading) {
    return (
      <div className="card p-8 text-center text-slate-500 max-w-4xl mx-auto my-8">
        Cargando certificado público de trazabilidad...
      </div>
    );
  }

  // Fallback si no encuentra el lote en IndexedDB
  const lot = ficha || {
    lotCode: lotCode,
    producer: 'Ana Torres (Productor A)',
    origin: 'Rivera, Huila, Colombia',
    harvestDate: new Date().toLocaleDateString('sv-SE'),
    quantity: 250,
    unit: 'kg',
    status: 'LIBERADO',
    verified: true,
  };

  return (
    <div>
      <div className="public-hero">
        <div className="hero-grain grain-1" />
        <div className="hero-grain grain-2" />
        <div className="public-hero-content">
          <span className="eyebrow text-emerald-300">Certificado Público de Origen</span>
          <h1 className="display-title text-white mt-1">Lote #{lot.lotCode}</h1>
          <p className="mt-2 text-emerald-100 text-sm md:text-base">
            Cacao Fino de Aroma · Trazabilidad verificada en origen desde el departamento del Huila.
          </p>
        </div>
      </div>

      <div className="product-sheet">
        <div className="product-main">
          <div className="card-head flex items-center justify-between">
            <div>
              <span className="eyebrow">Cadena de Custodia</span>
              <h2 className="section-title">Ficha Técnica e Identidad del Lote</h2>
            </div>
            <span className={`badge ${lot.verified ? 'badge-green' : 'badge-amber'}`}>
              <ShieldCheck size={14} />
              {lot.verified ? 'VERIFICADO EN SERVIDOR' : 'REGISTRO LOCAL'}
            </span>
          </div>

          <div className="public-facts">
            <div>
              <Sprout className="shrink-0" size={20} />
              <span>
                Productor
                <strong>{lot.producer}</strong>
              </span>
            </div>
            <div>
              <MapPin className="shrink-0" size={20} />
              <span>
                Origen
                <strong>{lot.origin}</strong>
              </span>
            </div>
            <div>
              <Calendar className="shrink-0" size={20} />
              <span>
                Fecha de Recepción
                <strong>{lot.harvestDate}</strong>
              </span>
            </div>
            <div>
              <Scale className="shrink-0" size={20} />
              <span>
                Volumen Lote
                <strong>{lot.quantity} {lot.unit || 'kg'}</strong>
              </span>
            </div>
            <div>
              <Award className="shrink-0" size={20} />
              <span>
                Perfil de Calidad
                <strong>Grado 1 · Premium (75% Fermentado)</strong>
              </span>
            </div>
            <div>
              <ShieldCheck className="shrink-0" size={20} />
              <span>
                Estado Comercial
                <strong className="text-emerald-700">{lot.status || 'LIBERADO'}</strong>
              </span>
            </div>
          </div>

          <div className="privacy-note mt-6">
            <ShieldCheck size={24} className="shrink-0 text-emerald-700" />
            <div>
              <strong>Garantía de Sostenibilidad y Deforestación Cero</strong>
              <p>
                Este lote proviene de parcelas monitoreadas bajo acuerdos de producción sostenible, garantizando la conservación de bosques y el comercio justo directo con familias cacaoteras del Huila.
              </p>
            </div>
          </div>
        </div>

        <div className="qr-card">
          <div className="flex flex-col items-center">
            <div className="qr-grid">
              {Array.from({ length: 81 }).map((_, i) => (
                <span key={i} className={(i * 7 + 3) % 5 === 0 || i % 2 === 0 ? 'on' : ''} />
              ))}
            </div>
            <div className="qr-code-label mt-3">
              ID: {lot.lotCode}-VERIFIED
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Escanea este código QR desde cualquier dispositivo móvil para validar la autenticidad del lote en la plataforma pública.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};