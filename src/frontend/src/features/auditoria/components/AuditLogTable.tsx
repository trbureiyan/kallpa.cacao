import type { AuditEntry } from '@/db/dexieDb';

export function AuditLogTable({ logs }: { logs: AuditEntry[] }) {
  return (
    <div className="card mt-6">
      <div className="card-head">
        <h3 className="section-title">Registro inmutable de auditoría</h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Lote</th>
              <th>Campo</th>
              <th>Valor Ant.</th>
              <th>Valor Nuevo</th>
              <th>Razón</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  No hay registros de auditoría aún.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.idLocal || log.timestamp}>
                  <td>{new Date(log.timestamp).toLocaleString('es-CO')}</td>
                  <td><strong>{log.user}</strong></td>
                  <td>
                    <span
                      className={`badge ${
                        log.action === 'BLOQUEO'
                          ? 'badge-red'
                          : log.action === 'LIBERACIÓN'
                          ? 'badge-green'
                          : 'badge-slate'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td><strong>{log.lotCode}</strong></td>
                  <td>{log.fieldChanged}</td>
                  <td><small>{log.previousValue}</small></td>
                  <td><small>{log.newValue}</small></td>
                  <td>{log.reason || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}