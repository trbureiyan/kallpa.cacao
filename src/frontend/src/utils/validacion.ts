// Dominio de cada campo en un solo lugar; el servidor repite las mismas reglas (app/schemas/api.py).

export const LIMITES = {
  codigoLote: 40,
  justificacion: 300,
  incidencias: 500,
  notas: 500,
  motivoMin: 3,
  motivoMax: 500,
  cifra: 20,
} as const

// Para el atributo pattern: solo dígitos, puntos y una coma. El análisis estricto lo hace parsearDecimal.
export const PATRON_CIFRA = '[0-9]+([.,][0-9]+)*'

interface OpcionesDecimal {
  decimales: number
  /** Solo en COP: "1.600.000" es un millón seiscientos mil. En kg el punto es siempre decimal. */
  miles?: boolean
}

/**
 * Lee una cifra escrita por una persona. Acepta coma o punto decimal y, si `miles`, puntos de miles
 * colombianos. Devuelve null ante cualquier otra cosa: texto, signos, NaN, Infinity, 1e3, 0x10.
 */
export function parsearDecimal(texto: string, { decimales, miles = false }: OpcionesDecimal): number | null {
  let t = texto.trim()
  if (miles && /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '')
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(t)
  if (!m) return null
  if ((m[2]?.length ?? 0) > decimales) return null
  const n = Number(`${m[1]}.${m[2] ?? '0'}`)
  return Number.isFinite(n) ? n : null
}

export type Resultado<T> = { valor: T } | { error: string }

export function validarKg(texto: string, campo = 'La cantidad'): Resultado<number> {
  const n = parsearDecimal(texto, { decimales: 3 })
  if (n === null) {
    return { error: `${campo} no es un número válido. Sin una cifra exacta no se puede calcular merma ni existencia. Escriba los kg con hasta 3 decimales, por ejemplo 100 o 12,5.` }
  }
  if (n <= 0) return { error: `${campo} debe ser mayor que 0 kg. Un movimiento de 0 kg no cambia la existencia. Escriba el peso neto.` }
  return { valor: n }
}

export function validarCOP(texto: string, { opcional = false, campo = 'El valor' } = {}): Resultado<number | undefined> {
  if (texto.trim() === '') {
    return opcional ? { valor: undefined } : { error: `${campo} es obligatorio. Sin él no se puede calcular el costo. Escriba un valor en COP, 0 si no hubo.` }
  }
  const n = parsearDecimal(texto, { decimales: 2, miles: true })
  if (n === null) {
    return { error: `${campo} no es un valor en COP válido. Se guardaría un costo distinto del real. Escriba solo cifras, por ejemplo 1.600.000 o 1600000,50.` }
  }
  return { valor: n }
}

export const normalizarCodigoLote = (texto: string): string => texto.trim().toUpperCase()

// CAC001 y sus salidas: cada transformación agrega un sufijo de 6 caracteres (CAC001-1A2B3C, y sobre ese, otro)
const CODIGO_LOTE = /^CAC\d{3,}(-[A-Z0-9]{6})*$/

/** null si el código tiene el formato del sistema; si no, el mensaje para mostrar. */
export function validarCodigoLote(codigo: string): string | null {
  if (codigo.length <= LIMITES.codigoLote && CODIGO_LOTE.test(codigo)) return null
  return 'El código no tiene el formato de un lote. Así no se puede encontrar en el registro. Escríbalo como CAC001 o, para un producto, CAC001-1A2B3C.'
}

export function validarMotivo(texto: string): string | null {
  const t = texto.trim()
  if (t.length < LIMITES.motivoMin) return `El motivo es muy corto. Queda en la auditoría y debe explicar el cambio. Escriba al menos ${LIMITES.motivoMin} caracteres.`
  if (t.length > LIMITES.motivoMax) return `El motivo supera ${LIMITES.motivoMax} caracteres. El servidor no lo aceptaría. Resúmalo.`
  return null
}
