import type { EstadoLote } from '@/types/app'
import type { FilaResumen } from './resumen'

const ENCABEZADO = 'Codigo,Origen,Recibido_kg,Consumido_kg,Disponible_kg,Estado,CostoUnitario_COP_kg'

// Un campo con coma, comilla o salto de línea va entre comillas y las comillas internas se duplican.
// Además, el texto libre que empieza con = + - @ tab o CR se antepone con ' para que Excel no lo ejecute como fórmula.
// Los números se dejan intactos (un costo negativo sigue siendo -5).
const celda = (v: string | number | null): string => {
  let t = v === null ? '' : String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(t)) t = `'${t}`
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

export function generarCsv(filas: FilaResumen[]): string {
  const lineas = filas.map((f) =>
    [f.codigo, f.origen, f.recibidoKg, f.consumidoKg, f.disponibleKg, f.estado, f.costoUnitario].map(celda).join(','),
  )
  return [ENCABEZADO, ...lineas].join('\r\n')
}

export function filtrarLotes<T extends { origin: string; status?: EstadoLote }>(
  lotes: T[],
  f: { origen?: string; estado?: EstadoLote },
): T[] {
  return lotes.filter(
    (l) => (!f.origen || l.origin === f.origen) && (!f.estado || (l.status ?? 'PENDIENTE') === f.estado),
  )
}
