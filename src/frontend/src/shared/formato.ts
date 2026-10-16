// Formato de números y fechas centralizado (AGENTS.md: no formatear en cada componente).

const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 })
const cop = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const porcentaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

export const formatoKg = (v: number | string) => `${numero.format(Number(v))} kg`
export const formatoCop = (v: number | string) => `${cop.format(Number(v))} COP`
export const formatoCopPorKg = (v: number | string) => `${cop.format(Number(v))} COP/kg`
export const formatoPorcentaje = (v: number | string | null | undefined) =>
  v === null || v === undefined ? 'No calculable' : `${porcentaje.format(Number(v))} %`

export const formatoFechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
export const formatoFecha = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })
