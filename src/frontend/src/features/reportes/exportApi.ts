import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import { estadoAApi } from '@/api/mapeos'
import type { EstadoLote } from '@/types/app'

/** CSV autoritativo del servidor (solo administrador), con los mismos filtros de la tabla. */
export async function descargarCsvApi(f: { origen?: string; estado?: EstadoLote }): Promise<string> {
  const params: Record<string, string> = {}
  if (f.origen) params.origin = f.origen
  if (f.estado) params.status = estadoAApi(f.estado)
  try {
    const { data } = await axiosClient.get<string>('/exports/lots.csv', { params, responseType: 'text' })
    return data
  } catch (e) {
    throw traducirErrorApi(e)
  }
}
