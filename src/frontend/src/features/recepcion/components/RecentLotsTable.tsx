import type { RecepcionOffline } from '@/db/dexieDb';
import type { EstadoConexion } from '@/components/ui/conexion';
import { IndicadorConexion, SelloLote } from '@/components/ui/marca';

const ESTADO_SYNC: Record<RecepcionOffline['syncStatus'], EstadoConexion> = {
  SYNCED: 'sincronizado',
  ERROR: 'error',
  PENDING: 'pendiente',
};

interface RecentLotsTableProps {
  lots: RecepcionOffline[];
}

export function RecentLotsTable({ lots }: RecentLotsTableProps) {
  return (
    <div className="card mt-6">
      <div className="card-head">
        <div>
          <h3 className="section-title">Lotes locales recientes</h3>
          <p>Registros capturados en IndexedDB</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Productor</th>
              <th>Origen</th>
              <th>Cantidad</th>
              <th>Fecha</th>
              <th>Estado Sinc.</th>
            </tr>
          </thead>
          <tbody>
            {lots.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  No hay lotes registrados localmente.
                </td>
              </tr>
            ) : (
              lots.map((lot) => (
                <tr key={lot.idLocal || lot.idempotencyKey}>
                  <td><SelloLote codigo={lot.lotCode} /></td>
                  <td>{lot.producer}</td>
                  <td>{lot.origin}</td>
                  <td>{lot.quantity} {lot.unit}</td>
                  <td>{lot.date}</td>
                  <td>
                    <IndicadorConexion estado={ESTADO_SYNC[lot.syncStatus]} pendientes={1} />
                    {lot.errorMessage && (
                      <small className="nota-error">
                        {lot.errorMessage}
                      </small>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}