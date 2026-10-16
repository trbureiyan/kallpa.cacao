import type { EstadoLote } from '@/types/app'
import type { FilaResumen } from './resumen'

const ENCABEZADO = 'Codigo,Origen,Recibido_kg,Consumido_kg,Disponible_kg,Estado,CostoUnitario_COP_kg'

// Un campo con coma, comilla o salto de línea va entre comillas y las comillas internas se duplican.
// Además, el texto libre que empieza con = + - @ tab CR o LF se antepone con ' para que Excel no lo ejecute como fórmula.
// Los números se dejan intactos (un costo negativo sigue siendo -5).
const celda = (v: string | number | null): string => {
  let t = v === null ? '' : String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r\n]/.test(t)) t = `'${t}`
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

export function generarCsv(filas: FilaResumen[]): string {
  const lineas = filas.map((f) =>
    [f.codigo, f.origen, f.recibidoKg, f.consumidoKg, f.disponibleKg, f.estado, f.costoUnitario].map(celda).join(','),
  )
  return [ENCABEZADO, ...lineas].join('\r\n')
}

export function filtrarFilas(filas: FilaResumen[], f: { origen?: string; estado?: EstadoLote }): FilaResumen[] {
  return filas.filter((x) => (!f.origen || x.origen === f.origen) && (!f.estado || x.estado === f.estado))
}

/**
 * Archivo listo para descargar. Lleva un solo BOM UTF-8 (sin él Excel en Windows rompe tildes y eñes);
 * el del servidor se quita primero por si el navegador lo dejó en el texto.
 */
export function prepararArchivoCsv(texto: string, fechaISO: string): { blob: Blob; nombre: string; filas: number } {
  const limpio = texto.replace(/^\uFEFF/, '')
  const filas = limpio.split(/\r?\n/).filter((l) => l.trim() !== '').length - 1
  return {
    blob: new Blob(['\uFEFF' + limpio], { type: 'text/csv;charset=utf-8' }),
    nombre: `lotes_${fechaISO}.csv`,
    filas: Math.max(filas, 0),
  }
}

const NOMBRE_ESTADO: Record<EstadoLote, string> = { PENDIENTE: 'Pendiente', LIBERADO: 'Liberado', BLOQUEADO: 'Bloqueado' }

export function describirFiltros(f: { origen?: string; estado?: EstadoLote }): string {
  const partes = [f.origen && `Origen: ${f.origen}`, f.estado && `Estado: ${NOMBRE_ESTADO[f.estado]}`].filter(Boolean)
  return partes.length ? partes.join(' · ') : 'Todos los lotes'
}
