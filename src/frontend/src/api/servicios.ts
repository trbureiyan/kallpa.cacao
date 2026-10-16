// Funciones del cliente: solo llaman al servidor. El cliente muestra y captura; el servidor calcula y decide.
import { axiosClient } from './axiosClient'
import type {
  Alerta, Economia, EventoAuditoria, FichaPublica, Finca, InventarioAdmin, Lote,
  RecepcionEnvio, RecepcionResultado, TransformacionEnvio, TransformacionResultado, Trazabilidad, Usuario,
} from './tipos'
import type { EstadoLote } from '@/shared/etiquetas'
import { db } from '@/db/dexieDb'

/**
 * Respaldo de lectura: con servidor, guarda la respuesta; sin servidor (sin respuesta HTTP), devuelve la
 * última guardada. Un error con respuesta (401, 403, 422...) NO usa respaldo: es una decisión del servidor.
 * Las escrituras nunca pasan por aquí.
 */
function usuarioGuardado(): string {
  try {
    return (JSON.parse(localStorage.getItem('kallpa.usuario') ?? 'null') as { username?: string } | null)?.username ?? ''
  } catch {
    return ''
  }
}

async function conRespaldo<T>(clave: string, leer: () => Promise<T>): Promise<T> {
  // La clave incluye el usuario para no mostrar datos de otra sesión en el mismo dispositivo.
  const k = `${usuarioGuardado()}|${clave}`
  try {
    const datos = await leer()
    void db.cacheApi.put({ clave: k, datos, guardadoEn: Date.now() }).catch(() => undefined)
    return datos
  } catch (error) {
    if ((error as { response?: unknown }).response) throw error
    const guardado = await db.cacheApi.get(k).catch(() => undefined)
    if (guardado) return guardado.datos as T
    throw error
  }
}

export async function iniciarSesion(username: string, password: string): Promise<string> {
  // El login de FastAPI (OAuth2PasswordRequestForm) espera formulario, no JSON.
  const form = new URLSearchParams({ username, password })
  const { data } = await axiosClient.post<{ access_token: string }>('/auth/login', form)
  return data.access_token
}
export const obtenerUsuarioActual = async () => (await axiosClient.get<Usuario>('/auth/me')).data

export const listarFincas = () => conRespaldo('fincas', async () => (await axiosClient.get<Finca[]>('/farms')).data)
export const enviarRecepcion = async (datos: RecepcionEnvio) =>
  (await axiosClient.post<RecepcionResultado>('/receptions', datos)).data

export const listarLotes = (filtros: { origin?: string; status?: string } = {}) =>
  conRespaldo(`lotes:${JSON.stringify(filtros)}`, async () => (await axiosClient.get<Lote[]>('/lots', { params: filtros })).data)
export const obtenerTrazabilidad = (loteId: number) =>
  conRespaldo(`traza:${loteId}`, async () => (await axiosClient.get<Trazabilidad>(`/lots/${loteId}/traceability`)).data)

export const registrarTransformacion = async (datos: TransformacionEnvio) =>
  (await axiosClient.post<TransformacionResultado>('/transformations', datos)).data

export const cambiarEstadoLote = async (loteId: number, status: EstadoLote, reason: string) =>
  (await axiosClient.patch<{ code: string; status: EstadoLote; reason: string }>(`/lots/${loteId}/status`, { status, reason })).data

export const inventarioAdmin = (filtros: { origin?: string; status?: string } = {}) =>
  conRespaldo(`inventario:${JSON.stringify(filtros)}`, async () => (await axiosClient.get<InventarioAdmin[]>('/inventory/admin', { params: filtros })).data)
export const auditoriaDeLote = (loteId: number) =>
  conRespaldo(`auditoria:${loteId}`, async () => (await axiosClient.get<EventoAuditoria[]>(`/lots/${loteId}/audit`)).data)
export const listarAlertas = () => conRespaldo('alertas', async () => (await axiosClient.get<Alerta[]>('/alerts')).data)
export const listarEconomia = () => conRespaldo('economia', async () => (await axiosClient.get<Economia[]>('/economics')).data)

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

export const obtenerFichaPublica = (codigo: string) =>
  conRespaldo(`ficha:${codigo}`, async () => (await axiosClient.get<FichaPublica>(`/public/products/${encodeURIComponent(codigo)}`)).data)
