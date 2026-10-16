import { isAxiosError } from 'axios'
import type { RolUsuario } from '@/types/app'
import { ErrorDominio } from '@/utils/errores'
import { axiosClient } from './axiosClient'
import { traducirErrorApi } from './errores'
import { rolDeApi } from './mapeos'
import { guardarToken } from './token'

export interface SesionApi {
  rol: RolUsuario
  nombre: string
}

export async function iniciarSesionApi(usuario: string, clave: string): Promise<SesionApi> {
  try {
    // OAuth2PasswordRequestForm del backend pide formulario, no JSON
    const cuerpo = new URLSearchParams({ username: usuario, password: clave })
    const { data } = await axiosClient.post('/auth/login', cuerpo, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    guardarToken(data.access_token)
    const { data: yo } = await axiosClient.get('/auth/me')
    return { rol: rolDeApi(yo.role), nombre: yo.full_name }
  } catch (e) {
    guardarToken(null)
    if (isAxiosError(e) && e.response?.status === 401) {
      throw new ErrorDominio('CREDENCIALES', 'No se pudo iniciar sesión. El usuario o la contraseña no coinciden. Revise los datos e intente de nuevo.')
    }
    throw traducirErrorApi(e)
  }
}
