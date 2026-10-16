import React from 'react';
import type { RecepcionOffline } from '@/db/dexieDb';

interface InventoryTableProps {
  lots: RecepcionOffline[];
  onToggleStatus: (idLocal: number, currentStatus: string) => void;
}

export function InventoryTable({ lots, onToggleStatus }: InventoryTableProps) {
  return (
    <div className="card mt-6">
      <div className="card-head">
        <h3 className="section-title">Control de existencias e inventario</h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Lote</th>
              <th>Productor</th>
              <th>Origen</th>
              <th>Ingreso</th>
              <th>Disponible</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => {
              const status = lot.status || 'PENDIENTE';
              const available = lot.availableQty ?? lot.quantity;

              return (
                <tr key={lot.idLocal || lot.lotCode}>
                  <td><strong>{lot.lotCode}</strong></td>
                  <td>{lot.producer}</td>
                  <td>{lot.origin}</td>
                  <td>{lot.quantity} {lot.unit}</td>
                  <td>{available} {lot.unit}</td>
                  <td>
                    <span
                      className={`badge ${
                        status === 'LIBERADO'
                          ? 'badge-green'
                          : status === 'BLOQUEADO'
                          ? 'badge-red'
                          : 'badge-amber'
                      }`}
                    >
                      {status}
                    </span>
                  </td>
                  <td className="row-actions">
                    {lot.idLocal && (
                      <button
                        onClick={() => onToggleStatus(lot.idLocal!, status)}
                        className={status === 'LIBERADO' ? 'danger' : ''}
                      >
                        {status === 'LIBERADO' ? 'Bloquear' : 'Liberar'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}