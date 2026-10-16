import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexieDb';
import { useNetwork } from '@/context/NetworkContext';
import { useAuth } from '@/context/AuthContext';
import { PageHead } from '@/components/shared';
import { Icon } from '@/components/ui';
import { estadoConexion } from '@/components/ui/conexion';
import { IndicadorConexion } from '@/components/ui/marca';

export const DashboardPage: React.FC = () => {
  const { isOnline } = useNetwork();
  const { rol, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const lotes = useLiveQuery(() => db.recepciones.toArray(), [], []);
  const auditLogs = useLiveQuery(() => db.auditLogs.reverse().limit(5).toArray(), [], []);

  const movimientos = useLiveQuery(() => db.movimientos.toArray(), [], []);
  const totalKg = (movimientos || []).reduce((acc, m) => acc + (m.tipo === 'RECIBIDO' ? m.kg : -m.kg), 0);
  const pendientesSync = (lotes || []).filter((l) => l.syncStatus === 'PENDING').length;

  return (
    <>
      <PageHead
        eyebrow="Resumen General"
        title={`Panel Principal (${rol})`}
        text="Monitoreo de operaciones en campo, inventario y sincronización."
        action={
          <button onClick={() => { cerrarSesion(); navigate('/login'); }} className="btn btn-ghost">
            Cerrar Sesión
          </button>
        }
      />

      <div className="metrics">
        <div className="metric-card">
          <div className="metric-top">
            <span>Total Lotes Registrados</span>
          </div>
          <strong>{lotes?.length || 0} Lotes</strong>
          <small>Guardados en este dispositivo</small>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span>Stock Disponible</span>
          </div>
          <strong>{totalKg} kg</strong>
          <small>Cacao en bodega</small>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span>Pendientes por Sincronizar</span>
          </div>
          <strong>{pendientesSync} Registros</strong>
          <small><IndicadorConexion estado={estadoConexion({ enLinea: isOnline, pendientes: pendientesSync, error: false })} pendientes={pendientesSync} /></small>
        </div>
      </div>

      <section className="card mt-6">
        <div className="card-head">
          <div className="section-title">Última Actividad Registrada</div>
        </div>
        <div className="p-4 space-y-3">
          {(!auditLogs || auditLogs.length === 0) ? (
            <p className="text-sm text-texto-suave">Sin actividad reciente registrada en el dispositivo.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.idLocal || log.timestamp} className="activity-row">
                <div className="activity-icon"><Icon name="check" size={16} /></div>
                <div>
                  <strong>{log.action} en Lote {log.lotCode}</strong>
                  <span>Por {log.user} · {log.reason || log.fieldChanged}</span>
                </div>
                <small>{new Date(log.timestamp).toLocaleTimeString('es-CO')}</small>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
};