import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexieDb';
import type { RecepcionOffline } from '@/db/dexieDb';
import { useNetwork } from '@/context/NetworkContext';
import { sincronizarRecepcionesPendientes } from '@/services/syncService';
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CloudUpload,
} from 'lucide-react';

interface TablaLotesLocalesProps {
  onSyncSuccess?: () => void;
}

export const TablaLotesLocales: React.FC<TablaLotesLocalesProps> = ({
  onSyncSuccess,
}) => {
  const { isOnline } = useNetwork();
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Observa IndexedDB y actualiza la tabla cuando cambian los registros.
  const lotes = useLiveQuery(
    () => db.recepciones.reverse().toArray(),
    [],
    [] as RecepcionOffline[],
  );

  // Sincroniza los registros pendientes con el backend.
  const handleSync = useCallback(async () => {
    if (!isOnline || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);

    try {
      await sincronizarRecepcionesPendientes();
      onSyncSuccess?.();
    } catch (error) {
      console.error('Error al sincronizar las recepciones:', error);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [isOnline, onSyncSuccess]);

  // Reintenta la sincronización cuando vuelve la conexión.
  useEffect(() => {
    if (isOnline) {
      void handleSync();
    }
  }, [isOnline, handleSync]);

  const pendientesCount = lotes.filter(
    (lote) => lote.syncStatus === 'PENDING',
  ).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Registros en Dispositivo (IndexedDB)
          </h3>
          <p className="text-xs text-slate-500">
            Lotes capturados localmente en este navegador.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={!isOnline || syncing || pendientesCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
        >
          {syncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CloudUpload className="w-4 h-4" />
          )}
          {syncing
            ? 'Sincronizando...'
            : `Sincronizar Pendientes (${pendientesCount})`}
        </button>
      </div>

      {lotes.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-sm text-slate-500 font-medium">
            No hay lotes registrados localmente.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Productor</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Cantidad</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Estado Sincronización</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {lotes.map((lote) => (
                <tr
                  key={lote.idLocal ?? lote.idempotencyKey}
                  className="hover:bg-slate-50/80"
                >
                  <td className="p-3 font-bold text-emerald-800">
                    {lote.lotCode}
                  </td>
                  <td className="p-3">{lote.producer}</td>
                  <td className="p-3">{lote.origin}</td>
                  <td className="p-3 font-semibold">
                    {lote.quantity} {lote.unit}
                  </td>
                  <td className="p-3 text-slate-500">{lote.date}</td>

                  <td className="p-3">
                    {lote.syncStatus === 'SYNCED' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        SINCRONIZADO
                      </span>
                    )}

                    {lote.syncStatus === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        PENDIENTE EN DISPOSITIVO
                      </span>
                    )}

                    {lote.syncStatus === 'ERROR' && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700"
                        title={lote.errorMessage}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ERROR AL SUBIR
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
