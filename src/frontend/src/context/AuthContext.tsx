import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CLAVE_TOKEN } from '@/api/axiosClient'
import { iniciarSesion, obtenerUsuarioActual } from '@/api/servicios'
import type { Usuario } from '@/api/tipos'

const CLAVE_USUARIO = 'kallpa.usuario'

interface AuthContextType {
  usuario: Usuario | null
  cargando: boolean
  entrar: (username: string, password: string) => Promise<void>
  salir: () => void
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  cargando: true,
  entrar: async () => {},
  salir: () => {},
})

function usuarioGuardado(): Usuario | null {
  try {
    const crudo = localStorage.getItem(CLAVE_USUARIO)
    return crudo && localStorage.getItem(CLAVE_TOKEN) ? (JSON.parse(crudo) as Usuario) : null
  } catch {
    return null
  }
}

// El rol que se muestra viene del servidor (/auth/me). El servidor igual valida el token en cada petición:
// este contexto solo decide qué se muestra, nunca qué se permite.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(usuarioGuardado)
  const [cargando, setCargando] = useState<boolean>(() => Boolean(localStorage.getItem(CLAVE_TOKEN)))

  const salir = useCallback(() => {
    localStorage.removeItem(CLAVE_TOKEN)
    localStorage.removeItem(CLAVE_USUARIO)
    setUsuario(null)
  }, [])

  // Al abrir la app con token guardado se confirma con el servidor. Sin red se conserva el usuario
  // guardado para poder seguir capturando recepciones; con 401 se cierra la sesión.
  useEffect(() => {
    if (!localStorage.getItem(CLAVE_TOKEN)) return
    obtenerUsuarioActual()
      .then((u) => {
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u))
        setUsuario(u)
      })
      .catch((e) => {
        if (e?.response?.status === 401) salir()
      })
      .finally(() => setCargando(false))
  }, [salir])

  useEffect(() => {
    window.addEventListener('kallpa:sesion-vencida', salir)
    return () => window.removeEventListener('kallpa:sesion-vencida', salir)
  }, [salir])

  const entrar = async (username: string, password: string) => {
    const token = await iniciarSesion(username, password)
    localStorage.setItem(CLAVE_TOKEN, token)
    const u = await obtenerUsuarioActual()
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u))
    setUsuario(u)
  }

  return <AuthContext.Provider value={{ usuario, cargando, entrar, salir }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
