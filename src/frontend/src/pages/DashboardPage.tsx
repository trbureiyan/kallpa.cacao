import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexieDb';
import { useNetwork } from '@/context/NetworkContext';
import { useAuth } from '@/context/AuthContext';
import { PageHead } from '@/components/shared';
import { listarLotes } from '@/api/servicios';
import { mensajeError } from '@/api/axiosClient';
import { ESTADOS, ROLES, type EstadoLote } from '@/shared/etiquetas';
import { formatoKg } from '@/shared/formato';

export const DashboardPage: React.FC = () => {
  const { isOnline } = useNetwork();
  const { usuario, salir } = useAuth();
  const navigate = useNavigate();
  const lotes = useQuery({ queryKey: ['lotes'], queryFn: () => listarLotes(), enabled: isOnline });
  const pendientes = useLiveQuery(() => db.colaRecepciones.where('estado').equals('PENDING').count(), [], 0);

  const lista = lotes.data ?? [];
  const totalKg = lista.reduce((s, l) => s + l.available_quantity, 0);
  const porEstado = (e: EstadoLote) => lista.filter((l) => l.status === e).length;

  return (
    <>
      <PageHead
        eyebrow="Resumen general"
        title={`Panel principal · ${usuario ? ROLES[usuario.role] : ''}`}
        text="Estado del inventario y de los registros pendientes de envío."
        action={
          <button onClick={() => { salir(); navigate('/login'); }} className="btn btn-ghost">
            Cerrar sesión
          </button>
        }
      />

      {lotes.isError && (
        <div className="validation warning mb-4" role="alert">
          <div>
            <strong>No se pudieron cargar los lotes</strong>
            <span>{mensajeError(lotes.error)} Cuando haya conexión, la información se actualiza sola.</span>
          </div>
        </div>
      )}

      <div className="metrics">
        <div className="metric-card">
          <div className="metric-top"><span>Lotes registrados</span></div>
          <strong>{lista.length}</strong>
          <small>{'Última lectura del servidor'}</small>
        </div>
        <div className="metric-card brown">
          <div className="metric-top"><span>Existencia disponible</span></div>
          <strong>{formatoKg(totalKg)}</strong>
          <small>Suma de lotes con saldo</small>
        </div>
        {(Object.keys(ESTADOS) as EstadoLote[]).map((e) => (
          <div className="metric-card" key={e}>
            <div className="metric-top"><span>Lotes {ESTADOS[e].etiqueta.toLowerCase()}s</span></div>
            <strong>{porEstado(e)}</strong>
            <small>Estado {ESTADOS[e].valor}</small>
          </div>
        ))}
        <div className={`metric-card ${pendientes > 0 ? 'red' : ''}`}>
          <div className="metric-top"><span>Recepciones por enviar</span></div>
          <strong>{pendientes}</strong>
          <small>{isOnline ? 'Se envían al abrir Recepción' : 'Se enviarán al volver la conexión'}</small>
        </div>
      </div>
    </>
  );
};
