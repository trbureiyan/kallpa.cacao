import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, MapPin, Calendar, Scale, Layers } from 'lucide-react';
import { obtenerFichaPublica } from '@/api/servicios';
import { estadoDe } from '@/shared/etiquetas';
import { formatoFecha, formatoFechaHora, formatoKg } from '@/shared/formato';

// Solo muestra los campos de la lista blanca del servidor (/public/products/{code}): sin costos,
// sin productor ni datos internos. Un lote no liberado nunca se presenta como disponible.
export function PublicFichaCard({ codigo }: { codigo: string }) {
  const { data: ficha, isLoading, isError } = useQuery({
    queryKey: ['ficha', codigo],
    queryFn: () => obtenerFichaPublica(codigo),
    retry: false,
  });

  if (isLoading) {
    return <div className="card p-8 text-center text-slate-500 max-w-4xl mx-auto my-8">Consultando la ficha...</div>;
  }

  if (isError || !ficha) {
    return (
      <div className="card p-8 text-center max-w-4xl mx-auto my-8" role="alert">
        <strong>No encontramos ese producto</strong>
        <p className="text-sm text-slate-500 mt-1">
          Verifique el código ({codigo}). La ficha pública existe solo para productos ya transformados.
        </p>
      </div>
    );
  }

  const estado = estadoDe(ficha.status);
  const disponible = ficha.availability === 'available';
  const urlFicha = `${window.location.origin}/ficha-publica?lote=${encodeURIComponent(ficha.code)}`;

  return (
    <div>
      <div className="public-hero">
        <div className="hero-grain grain-1" />
        <div className="hero-grain grain-2" />
        <div className="public-hero-content">
          <span className="eyebrow text-emerald-300">Ficha comercial pública</span>
          <h1 className="display-title text-white mt-1">Producto {ficha.code}</h1>
          <p className="mt-2 text-emerald-100 text-sm md:text-base">
            {ficha.stage} · Origen {ficha.origin}, Huila
          </p>
        </div>
      </div>

      <div className="product-sheet">
        <div className="product-main">
          <div className="card-head flex items-center justify-between">
            <div>
              <span className="eyebrow">Información autorizada</span>
              <h2 className="section-title">Ficha del producto</h2>
            </div>
            <span className={`badge ${disponible ? 'badge-green' : 'badge-red'}`}>
              <ShieldCheck size={14} />
              {disponible ? 'DISPONIBLE' : 'NO DISPONIBLE'}
            </span>
          </div>

          <div className="public-facts">
            <div>
              <MapPin className="shrink-0" size={20} />
              <span>Origen<strong>{ficha.origin}</strong></span>
            </div>
            <div>
              <Calendar className="shrink-0" size={20} />
              <span>Recepción del cacao<strong>{formatoFecha(ficha.received_on)}</strong></span>
            </div>
            <div>
              <Layers className="shrink-0" size={20} />
              <span>Etapa<strong>{ficha.stage} · {formatoFechaHora(ficha.occurred_at)}</strong></span>
            </div>
            <div>
              <Scale className="shrink-0" size={20} />
              <span>Cantidad<strong>{formatoKg(ficha.output_quantity)}</strong></span>
            </div>
            <div>
              <ShieldCheck className="shrink-0" size={20} />
              <span>Estado<strong>{estado.etiqueta}</strong></span>
            </div>
          </div>

          {ficha.status_reason && (
            <div className="privacy-note mt-6">
              <strong>Motivo del bloqueo:</strong> {ficha.status_reason}
            </div>
          )}
        </div>

        <div className="qr-card">
          <div className="flex flex-col items-center">
            <QRCodeSVG value={urlFicha} size={160} />
            <div className="qr-code-label mt-3">{ficha.code}</div>
            <p className="mt-3 text-xs text-slate-500">Escanee el código para volver a esta ficha.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
