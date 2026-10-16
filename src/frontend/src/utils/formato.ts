// Formato centralizado: ningún componente formatea cifras por su cuenta.
const numero = (n: number, decimales = 0) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })

export const formatearCOP = (n: number): string => `$${numero(n)} COP`
export const formatearKg = (n: number): string => `${numero(n, Number.isInteger(n) ? 0 : 2)} kg`
export const formatearPct = (n: number): string => `${numero(n, 1)} %`

/** Lee un número escrito por una persona ("12,5" o "12.5"). NaN si no es un número. */
export function parsearNumero(texto: string): number {
  const limpio = texto.trim().replace(',', '.')
  return limpio === '' ? NaN : Number(limpio)
}
