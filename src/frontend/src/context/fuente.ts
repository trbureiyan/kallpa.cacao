import { iniciarSesionApi } from '@/api/autenticacion'
import type { RolUsuario } from '@/types/app'
import { ErrorDominio } from '@/utils/errores'
import { autenticar } from './usuariosDemo'

// [DECISION] una sola fuente por sesión: o todo va a la API o todo va a Dexie. Mezclar por llamada dejaría
// lotes locales que el servidor no conoce y existencias duplicadas.
export type ModoFuente = 'api' | 'local'

export interface SesionResuelta {
  rol: RolUsuario
  nombre: string
  modo: ModoFuente
}

export const MODO_LOCAL_PERMITIDO = import.meta.env.VITE_PERMITIR_MODO_LOCAL === 'true'

interface Opciones {
  permitirLocal: boolean
  forzarLocal?: boolean
}

function entrarLocal(usuario: string, clave: string): SesionResuelta | null {
  const u = autenticar(usuario, clave)
  return u ? { ...u, modo: 'local' } : null
}

export async function resolverSesion(usuario: string, clave: string, { permitirLocal, forzarLocal }: Opciones): Promise<SesionResuelta> {
  if (forzarLocal) {
    if (!permitirLocal) throw new ErrorDominio('LOCAL_NO_PERMITIDO', 'El modo local no está habilitado. Solo se puede entrar con el servidor. Use su usuario y contraseña.')
    const s = entrarLocal(usuario, clave)
    if (!s) throw new ErrorDominio('CREDENCIALES', 'No se pudo iniciar sesión. El usuario o la contraseña no coinciden. Revise los datos e intente de nuevo.')
    return s
  }
  try {
    return { ...(await iniciarSesionApi(usuario, clave)), modo: 'api' }
  } catch (e) {
    // solo la falta de red habilita el modo local; credenciales malas o un 5xx nunca lo hacen
    if (e instanceof ErrorDominio && e.codigo === 'SIN_RED' && permitirLocal) {
      const s = entrarLocal(usuario, clave)
      if (s) return s
    }
    throw e
  }
}
