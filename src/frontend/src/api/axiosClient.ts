import axios from 'axios'

// Base del backend FastAPI. En desarrollo apunta al puerto 8000; se cambia con VITE_API_URL.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const CLAVE_TOKEN = 'kallpa.token'

export const axiosClient = axios.create({ baseURL: BASE_URL, timeout: 10000 })

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(CLAVE_TOKEN)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Un 401 con token guardado significa sesión vencida: se avisa a AuthContext sin acoplar los módulos.
axiosClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem(CLAVE_TOKEN)) {
      window.dispatchEvent(new Event('kallpa:sesion-vencida'))
    }
    return Promise.reject(error)
  },
)

/** Mensaje en español para mostrar al usuario: qué pasó y qué hacer. Nunca trazas ni códigos internos. */
export function mensajeError(error: unknown): string {
  const e = error as { response?: { status: number; data?: { detail?: unknown } } }
  if (!e.response) {
    return 'No hay conexión con el servidor. Revise su conexión e intente de nuevo; los datos capturados no se pierden.'
  }
  if (e.response.status === 403) {
    return 'Su rol no tiene permiso para esta acción. Solicite la operación a un administrador.'
  }
  const detalle = e.response.data?.detail
  if (typeof detalle === 'string') return detalle
  if (Array.isArray(detalle)) return 'Hay datos inválidos en el formulario. Revise los campos e intente de nuevo.'
  return 'El servidor no pudo completar la operación. Intente de nuevo en unos minutos.'
}
