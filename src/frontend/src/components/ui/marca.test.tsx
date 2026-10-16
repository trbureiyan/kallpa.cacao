import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { estadoConexion } from './conexion'
import { ChipEstado, IndicadorConexion, SelloLote } from './marca'

describe('ChipEstado', () => {
  it.each([
    ['PENDIENTE', 'Pendiente', 'chip-pendiente'],
    ['LIBERADO', 'Liberado', 'chip-liberado'],
    ['BLOQUEADO', 'Bloqueado', 'chip-bloqueado'],
  ] as const)('%s muestra texto, icono y clase propios', (estado, texto, clase) => {
    const html = renderToStaticMarkup(<ChipEstado estado={estado} />)
    expect(html).toContain(texto)
    expect(html).toContain(clase)
    // el color nunca es el único portador: hay icono, oculto a lectores porque el texto ya lo dice
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/)
  })
})

describe('SelloLote', () => {
  it('muestra el código en el sello', () => {
    const html = renderToStaticMarkup(<SelloLote codigo="CAC001" />)
    expect(html).toContain('CAC001')
    expect(html).toContain('sello')
  })
})

describe('estadoConexion', () => {
  it('sin red manda sobre todo lo demás', () => {
    expect(estadoConexion({ enLinea: false, pendientes: 3, error: true })).toBe('sin_red')
  })
  it('con red: error, luego pendientes, luego sincronizado', () => {
    expect(estadoConexion({ enLinea: true, pendientes: 3, error: true })).toBe('error')
    expect(estadoConexion({ enLinea: true, pendientes: 3, error: false })).toBe('pendiente')
    expect(estadoConexion({ enLinea: true, pendientes: 0, error: false })).toBe('sincronizado')
  })
})

describe('IndicadorConexion', () => {
  it('anuncia el cambio con role=status y siempre lleva texto junto al punto', () => {
    const html = renderToStaticMarkup(<IndicadorConexion estado="sin_red" pendientes={0} />)
    expect(html).toContain('role="status"')
    expect(html).toContain('Sin conexión')
  })
  it('pendiente muestra el contador', () => {
    const html = renderToStaticMarkup(<IndicadorConexion estado="pendiente" pendientes={4} />)
    expect(html).toContain('4 por enviar')
  })
  it.each([
    ['sincronizado', 'Sincronizado'],
    ['error', 'Error al sincronizar'],
  ] as const)('%s', (estado, texto) => {
    expect(renderToStaticMarkup(<IndicadorConexion estado={estado} pendientes={0} />)).toContain(texto)
  })
})
