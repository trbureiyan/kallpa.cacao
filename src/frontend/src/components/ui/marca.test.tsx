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
  it('sin red, servidor arrancando o sin respuesta mandan sobre lo pendiente', () => {
    expect(estadoConexion({ servidor: 'sin_red', pendientes: 3 })).toBe('sin_red')
    expect(estadoConexion({ servidor: 'conectando', pendientes: 3 })).toBe('conectando')
    expect(estadoConexion({ servidor: 'no_responde', pendientes: 3 })).toBe('no_responde')
  })
  it('con el servidor en línea: pendientes, luego sincronizado', () => {
    expect(estadoConexion({ servidor: 'en_linea', pendientes: 3 })).toBe('pendiente')
    expect(estadoConexion({ servidor: 'en_linea', pendientes: 0 })).toBe('sincronizado')
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
    ['conectando', 'Conectando con el servidor...'],
    ['no_responde', 'El servidor no responde'],
    ['descartado', 'Descartado'],
  ] as const)('%s', (estado, texto) => {
    expect(renderToStaticMarkup(<IndicadorConexion estado={estado} pendientes={0} />)).toContain(texto)
  })
})
