import type { RolUsuario } from '@/types/app'

const COMUNES = ['/dashboard', '/recepcion', '/transformacion', '/trazabilidad']

// Solo mejora de uso: el control real vive en los servicios (hoy) y en el backend (fase 2).
export function rutasPermitidas(rol: RolUsuario | null): string[] {
  if (rol === 'ADMINISTRADOR') return [...COMUNES, '/inventario', '/auditoria']
  if (rol === 'OPERADOR') return COMUNES
  return []
}
