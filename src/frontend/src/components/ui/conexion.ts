export type EstadoConexion = "sin_red" | "pendiente" | "sincronizado" | "error"

/** Sin red manda; con red, un error pesa más que lo pendiente. */
export function estadoConexion(i: { enLinea: boolean; pendientes: number; error: boolean }): EstadoConexion {
  if (!i.enLinea) return "sin_red"
  if (i.error) return "error"
  return i.pendientes > 0 ? "pendiente" : "sincronizado"
}
