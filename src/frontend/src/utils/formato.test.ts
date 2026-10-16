import { describe, expect, it } from 'vitest'
import { formatearCOP, formatearKg, formatearPct } from './formato'

describe('formato', () => {
  it('formatea COP con separador de miles', () => {
    expect(formatearCOP(1600000)).toBe('$1.600.000 COP')
  })
  it('formatea porcentaje con coma decimal', () => {
    expect(formatearPct(20)).toBe('20,0 %')
  })
  it('formatea kg', () => {
    expect(formatearKg(80)).toBe('80 kg')
  })
})

import { parsearNumero } from './formato'

describe('parsearNumero', () => {
  it('acepta coma decimal', () => expect(parsearNumero('12,5')).toBe(12.5))
  it('acepta punto decimal', () => expect(parsearNumero('12.5')).toBe(12.5))
  it.each(['', '  ', 'abc'])('devuelve NaN para "%s"', (t) => expect(parsearNumero(t)).toBeNaN())
})
