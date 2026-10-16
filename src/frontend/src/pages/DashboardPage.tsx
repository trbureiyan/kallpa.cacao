import React from 'react';
import { useAuditoria } from '@/features/auditoria/useAuditoria';
import { AlertasPanel } from '@/features/alertas/components/AlertasPanel';
import { useFilasInventario } from '@/features/inventario/useFilasInventario';
import { useNetwork } from '@/context/NetworkContext';
import { useAuth } from '@/context/AuthContext';
import { useEstadoCola } from '@/features/recepcion/useEstadoCola';
import { PageHead } from '@/components/shared';
import { Icon } from '@/components/ui';
import { estadoConexion } from '@/components/ui/conexion';
import { IndicadorConexion } from '@/components/ui/marca';

export const DashboardPage: React.FC = () => {
  const { estadoServidor } = useNetwork();
  const { rol, modo } = useAuth();
  const esApi = modo === 'api';
  const esAdmin = rol === 'ADMINISTRADOR';

  // La cola de recepciones siempre vive en Dexie; lotes, existencias y actividad vienen del modo activo
  const { pendientes: cola } = useEstadoCola();
  const { filas } = useFilasInventario(modo, rol);
  // en modo API solo el administrador puede leer la auditoría del servidor
  const { logs } = useAuditoria(esApi && !esAdmin ? 'local' : modo);
  const auditLogs = (esApi && !esAdmin ? [] : logs).slice(0, 5);
  const totalLotes = filas.length;
  const totalKg = filas.reduce((acc, f) => acc + f.disponibleKg, 0);
  const pendientesSync = cola;

  return (
    <>
      <PageHead
        eyebrow="Resumen General"
        title={`Panel Principal (${rol})`}
        text="Monitoreo de operaciones en campo, inventario y sincronización."
      />

      <div className="metrics">
        <div className="metric-card">
          <div className="metric-top">
            <span>Total Lotes Registrados</span>
          </div>
          <strong>{totalLotes} Lotes</strong>
          <small>{esApi ? 'Registrados en el servidor' : 'Guardados en este dispositivo'}</small>
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
          <small><IndicadorConexion estado={estadoConexion({ servidor: estadoServidor, pendientes: pendientesSync })} pendientes={pendientesSync} /></small>
        </div>
      </div>

      {esApi && esAdmin && <AlertasPanel />}

      <section className="card mt-6">
        <div className="card-head">
          <div className="section-title">Última Actividad Registrada</div>
        </div>
        <div className="p-4 space-y-3">
          {(!auditLogs || auditLogs.length === 0) ? (
            <p className="text-sm text-texto-suave">{esApi && !esAdmin ? 'La actividad registrada solo la consulta el administrador.' : 'Sin actividad reciente registrada.'}</p>
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