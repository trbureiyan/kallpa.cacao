// Funciones del cliente: solo llaman al servidor. El cliente muestra y captura; el servidor calcula y decide.
import { axiosClient } from './axiosClient'
import type {
  Alerta, Economia, EventoAuditoria, FichaPublica, Finca, InventarioAdmin, Lote,
  RecepcionEnvio, RecepcionResultado, TransformacionEnvio, TransformacionResultado, Trazabilidad, Usuario,
} from './tipos'
import type { EstadoLote } from '@/shared/etiquetas'

export async function iniciarSesion(username: string, password: string): Promise<string> {
  // El login de FastAPI (OAuth2PasswordRequestForm) espera formulario, no JSON.
  const form = new URLSearchParams({ username, password })
  const { data } = await axiosClient.post<{ access_token: string }>('/auth/login', form)
  return data.access_token
}
export const obtenerUsuarioActual = async () => (await axiosClient.get<Usuario>('/auth/me')).data

export const listarFincas = async () => (await axiosClient.get<Finca[]>('/farms')).data
export const enviarRecepcion = async (datos: RecepcionEnvio) =>
  (await axiosClient.post<RecepcionResultado>('/receptions', datos)).data

export const listarLotes = async (filtros: { origin?: string; status?: string } = {}) =>
  (await axiosClient.get<Lote[]>('/lots', { params: filtros })).data
export const obtenerTrazabilidad = async (loteId: number) =>
  (await axiosClient.get<Trazabilidad>(`/lots/${loteId}/traceability`)).data

export const registrarTransformacion = async (datos: TransformacionEnvio) =>
  (await axiosClient.post<TransformacionResultado>('/transformations', datos)).data

export const cambiarEstadoLote = async (loteId: number, status: EstadoLote, reason: string) =>
  (await axiosClient.patch<{ code: string; status: EstadoLote; reason: string }>(`/lots/${loteId}/status`, { status, reason })).data

export const inventarioAdmin = async (filtros: { origin?: string; status?: string } = {}) =>
  (await axiosClient.get<InventarioAdmin[]>('/inventory/admin', { params: filtros })).data
export const auditoriaDeLote = async (loteId: number) =>
  (await axiosClient.get<EventoAuditoria[]>(`/lots/${loteId}/audit`)).data
export const listarAlertas = async () => (await axiosClient.get<Alerta[]>('/alerts')).data
export const listarEconomia = async () => (await axiosClient.get<Economia[]>('/economics')).data

/** El CSV lo genera el servidor (solo administrador); aquí solo se descarga con el token. */
export async function descargarCsvLotes(filtros: { origin?: string; status?: string } = {}) {
  const { data } = await axiosClient.get<Blob>('/exports/lots.csv', { params: filtros, responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = 'lotes.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export const obtenerFichaPublica = async (codigo: string) =>
  (await axiosClient.get<FichaPublica>(`/public/products/${encodeURIComponent(codigo)}`)).data
