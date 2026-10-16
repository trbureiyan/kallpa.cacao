import type { RolUsuario } from '@/types/app'

// [DECISION] usuarios de demostración locales — solo existen para el modo sin backend y son datos sintéticos
// documentados en el README. En la fase 2 la autenticación pasa al servidor y esto se elimina.
const USUARIOS_DEMO = [
  { usuario: 'operador', clave: 'demo-operador', rol: 'OPERADOR' as RolUsuario, nombre: 'Operador Campo (Rivera)' },
  { usuario: 'admin', clave: 'demo-admin', rol: 'ADMINISTRADOR' as RolUsuario, nombre: 'Administrador ASOCACAO' },
]

export function autenticar(usuario: string, clave: string): { rol: RolUsuario; nombre: string } | null {
  const u = USUARIOS_DEMO.find((d) => d.usuario === usuario.trim() && d.clave === clave)
  return u ? { rol: u.rol, nombre: u.nombre } : null
}
