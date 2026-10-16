import axios from 'axios'
import { guardarToken, leerToken } from './token'

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // 30 s: un servidor que despierta tarda más que 10 s y eso no es falta de red
  timeout: 30000,
})

let alExpirar: () => void = () => {}
export const registrarAlExpirar = (cb: () => void) => {
  alExpirar = cb
}

let alFallarRed: () => void = () => {}
/** El contexto de red lo usa para volver a comprobar el servidor cuando una petición no obtuvo respuesta. */
export const registrarAlFallarRed = (cb: () => void) => {
  alFallarRed = cb
}

axiosClient.interceptors.request.use((config) => {
  const token = leerToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axiosClient.interceptors.response.use(
  (r) => r,
  (error) => {
    // solo cuenta como sesión vencida si había token; un 401 en el login es "credenciales incorrectas"
    if (axios.isAxiosError(error) && error.response?.status === 401 && leerToken()) {
      guardarToken(null)
      alExpirar()
    }
    if (axios.isAxiosError(error) && !error.response) alFallarRed()
    return Promise.reject(error)
  },
)
