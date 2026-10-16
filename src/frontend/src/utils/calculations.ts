import { UMBRAL_MERMA_PCT } from '@/config'

// Un resultado null significa "no calculable": la UI debe explicar el motivo, nunca mostrar 0.
const redondear = (n: number): number => Number(n.toFixed(2))
const finitos = (...v: number[]): boolean => v.every(Number.isFinite)

/** Merma % = (entrada − salida) / entrada × 100. Kg. Null si la entrada no es positiva. */
export const calcularMerma = (entradaKg: number, salidaKg: number): number | null => {
  if (!finitos(entradaKg, salidaKg) || entradaKg <= 0) return null
  return redondear(((entradaKg - salidaKg) / entradaKg) * 100)
}

/** Alerta solo si la merma supera estrictamente el umbral (configurable). */
export const esMermaCritica = (mermaPct: number, umbralPct: number = UMBRAL_MERMA_PCT): boolean =>
  mermaPct > umbralPct

/** Costo unitario = costo total de la etapa / kg de salida vendible. COP y kg. Null si la salida no es positiva. */
export const calcularCostoUnitario = (costoTotalCOP: number, salidaVendibleKg: number): number | null => {
  if (!finitos(costoTotalCOP, salidaVendibleKg) || salidaVendibleKg <= 0) return null
  return redondear(costoTotalCOP / salidaVendibleKg)
}

/** Margen sobre venta % = (precio − costo unitario) / precio × 100. COP/kg. Null si el precio no es positivo. */
export const calcularMargenVenta = (precioCOP: number, costoUnitarioCOP: number): number | null => {
  if (!finitos(precioCOP, costoUnitarioCOP) || precioCOP <= 0) return null
  return redondear(((precioCOP - costoUnitarioCOP) / precioCOP) * 100)
}
