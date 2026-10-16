import type { EstadoServidor } from '@/context/monitorServidor'

export type EstadoConexion = 'sin_red' | 'conectando' | 'no_responde' | 'pendiente' | 'sincronizado' | 'error' | 'descartado'

/**
 * Estado de la conexión con el servidor y de la cola. Los errores de sincronización no entran aquí: requieren
 * que el operador decida y se muestran aparte, con acceso a la lista (AppShell).
 */
export function estadoConexion(i: { servidor: EstadoServidor; pendientes: number }): EstadoConexion {
  if (i.servidor !== 'en_linea') return i.servidor
  return i.pendientes > 0 ? 'pendiente' : 'sincronizado'
}
