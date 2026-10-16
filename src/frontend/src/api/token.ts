const CLAVE = 'kallpa.token'

// sessionStorage puede no existir o lanzar (modo privado): sin él la sesión vive solo hasta recargar.
export function leerToken(): string | null {
  try {
    return sessionStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

export function guardarToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(CLAVE, token)
    else sessionStorage.removeItem(CLAVE)
  } catch {
    /* sin almacenamiento */
  }
}
