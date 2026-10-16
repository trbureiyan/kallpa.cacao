// Prefetch por intención para red limitada.
// [DECISION] Respetar saveData y effectiveType ('2g', 'slow-2g') para evitar descargas
// no deseadas en dispositivos de campo o usuarios con planes de datos restringidos.

export interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
}

export type NavigatorConRed = {
  connection?: NetworkInformationLike
} | Navigator

// Mapa de precarga de rutas de la aplicación
const CARGADORES_RUTAS: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/DashboardPage'),
  '/recepcion': () => import('@/pages/RecepcionPage'),
  '/transformacion': () => import('@/pages/ProcessPage'),
  '/trazabilidad': () => import('@/pages/TracePage'),
  '/inventario': () => import('@/pages/InventoryPage'),
  '/auditoria': () => import('@/pages/AuditPage'),
  '/login': () => import('@/pages/LoginPage'),
  '/ficha-publica': () => import('@/pages/PublicFichaPage'),
}

export const _rutasPrefetcheadasParaTest = new Set<string>()

/**
 * Determina si es prudente realizar precarga preventiva según el estado de la red.
 */
export function puedePrefetch(nav?: NavigatorConRed): boolean {
  const n = nav ?? (typeof navigator !== 'undefined' ? (navigator as NavigatorConRed) : undefined)
  if (!n) return true

  const conn = 'connection' in n ? (n.connection as NetworkInformationLike | undefined) : undefined
  if (!conn) return true

  const { saveData, effectiveType } = conn

  if (saveData) return false
  if (effectiveType === '2g' || effectiveType === 'slow-2g') return false

  return true
}

interface PrefetchOpciones {
  cargador?: () => Promise<unknown>
  nav?: NavigatorConRed
}

/**
 * Inicia la descarga preventiva del chunk de una ruta si la red lo permite
 * y la ruta no ha sido ya precargada.
 */
export function prefetchRuta(path: string, opciones?: PrefetchOpciones): boolean {
  const nav = opciones?.nav ?? (typeof navigator !== 'undefined' ? (navigator as NavigatorConRed) : undefined)
  if (!puedePrefetch(nav)) return false

  const rutaNormalizada = path.split('?')[0]
  if (_rutasPrefetcheadasParaTest.has(rutaNormalizada)) return false

  const cargador = opciones?.cargador ?? CARGADORES_RUTAS[rutaNormalizada]
  if (!cargador) return false

  _rutasPrefetcheadasParaTest.add(rutaNormalizada)

  void cargador().catch(() => {
    // Si la precarga falla (ej. caída momentánea de red), permitimos reintentar luego
    _rutasPrefetcheadasParaTest.delete(rutaNormalizada)
  })

  return true
}
