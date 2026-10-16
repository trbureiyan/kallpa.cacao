// Esqueleto de carga de página para Suspense de React.lazy.
// Las dimensiones reservadas (min-height: 60vh) evitan el salto de diseño (CLS)
// mientras el chunk de la ruta se descarga. role=status anuncia la espera a
// lectores de pantalla sin interrumpir el flujo de navegación.
export function EsqueletoPagina() {
  return (
    <div
      role="status"
      aria-label="Cargando página…"
      style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}
    >
      <span className="eyebrow" aria-hidden="true">Cargando…</span>
    </div>
  )
}
