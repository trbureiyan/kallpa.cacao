import type { RecepcionCola } from "@/db/dexieDb"
import { reintentar } from "@/features/offline/cola"
import { formatoCop, formatoFechaHora, formatoKg } from "@/shared/formato"

const ETIQUETA = {
  SYNCED: { texto: "Enviado", clase: "badge-green" },
  PENDING: { texto: "Pendiente de envío", clase: "badge-amber" },
  ERROR: { texto: "Rechazado", clase: "badge-red" },
} as const

export function RecentLotsTable({ items }: { items: RecepcionCola[] }) {
  return (
    <div className="card mt-6">
      <div className="card-head">
        <div>
          <h3 className="section-title">Recepciones de este dispositivo</h3>
          <p>Cola local: se envía al servidor con una clave única por registro.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Finca</th>
              <th>Municipio</th>
              <th>Cantidad</th>
              <th>Costo de compra</th>
              <th>Capturado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem" }}>
                  Aún no hay recepciones en este dispositivo.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.idempotencyKey}>
                  <td><strong>{r.codigoLote ?? "Lo asigna el servidor"}</strong></td>
                  <td>{r.fincaNombre}</td>
                  <td>{r.municipio}</td>
                  <td>{formatoKg(r.cantidadKg)}</td>
                  <td>{formatoCop(r.costoCompraCop)}</td>
                  <td>{formatoFechaHora(r.recibidoEn)}</td>
                  <td>
                    <span className={`badge ${ETIQUETA[r.estado].clase}`}>{ETIQUETA[r.estado].texto}</span>
                    {r.mensajeError && (
                      <small style={{ display: "block", color: "#b91c1c" }}>
                        {r.mensajeError}{" "}
                        <button type="button" className="text-link" onClick={() => void reintentar(r.idempotencyKey)}>
                          Reintentar
                        </button>
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
  )
}
