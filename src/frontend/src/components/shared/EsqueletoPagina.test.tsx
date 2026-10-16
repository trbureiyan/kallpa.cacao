import { describe, expect, it } from 'vitest'
import { EsqueletoPagina } from './EsqueletoPagina'
import { montar } from '@/test/render'

// Prueba TDD: el esqueleto reserva espacio durante la carga lazy de la ruta.
// Las dimensiones (min-height >= 200px) evitan el layout shift (CLS).
describe('EsqueletoPagina', () => {
  it('tiene role=status para anunciarlo a lectores de pantalla', async () => {
    const m = await montar(<EsqueletoPagina />)
    const el = m.contenedor.querySelector('[role="status"]')
    expect(el).not.toBeNull()
    m.limpiar?.()
  })

  it('tiene un aria-label descriptivo', async () => {
    const m = await montar(<EsqueletoPagina />)
    const el = m.contenedor.querySelector('[role="status"]')
    expect(el?.getAttribute('aria-label')).toBeTruthy()
    m.limpiar?.()
  })
})
