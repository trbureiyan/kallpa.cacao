import { describe, expect, it } from 'vitest'
import { normalizarCodigoLote, parsearDecimal, validarCodigoLote, validarCOP, validarKg, validarMotivo } from './validacion'

describe('parsearDecimal', () => {
  it.each([
    ['100', 100],
    ['12,5', 12.5],
    ['12.5', 12.5],
    [' 80 ', 80],
    ['0,125', 0.125],
  ])('kg: %s -> %s', (t, n) => expect(parsearDecimal(t, { decimales: 3 })).toBe(n))

  it.each([
    ['1.600.000', 1_600_000],
    ['1.600.000,50', 1_600_000.5],
    ['25.000', 25_000],
    ['1600000', 1_600_000],
    ['20000,5', 20_000.5],
  ])('COP con separador de miles: %s -> %s', (t, n) => expect(parsearDecimal(t, { decimales: 2, miles: true })).toBe(n))

  it.each([
    '20000´¨P[RTGGTYBGTR45YHT', 'abc', '', ' ', 'NaN', 'Infinity', '-Infinity', '1e3', '1E3', '0x10', '-5', '+5',
    '12,5,3', '1..2', '12 5', ',5', '5,', '١٢',
  ])('rechaza %j', (t) => expect(parsearDecimal(t, { decimales: 3, miles: true })).toBeNull())

  it('respeta el máximo de decimales', () => {
    expect(parsearDecimal('1,2345', { decimales: 3 })).toBeNull()
    expect(parsearDecimal('1,234', { decimales: 3 })).toBe(1.234)
    expect(parsearDecimal('10,555', { decimales: 2, miles: true })).toBeNull()
  })

  it('en kg el punto es decimal: 1.600 son 1,6 kg y no 1600', () => {
    expect(parsearDecimal('1.600', { decimales: 3 })).toBe(1.6)
  })
})

describe('validarKg', () => {
  it('acepta mayor que 0', () => expect(validarKg('12,5')).toEqual({ valor: 12.5 }))
  it.each(['0', '0,000', 'basura', '', '1e3', '-1'])('rechaza %j con mensaje de tres partes', (t) => {
    const r = validarKg(t)
    expect('error' in r && r.error).toMatch(/kg/)
  })
})

describe('validarCOP', () => {
  it('opcional vacío es sin dato', () => expect(validarCOP('', { opcional: true })).toEqual({ valor: undefined }))
  it('obligatorio vacío es error', () => expect('error' in validarCOP('')).toBe(true))
  it('acepta 0 y miles', () => {
    expect(validarCOP('0')).toEqual({ valor: 0 })
    expect(validarCOP('1.600.000')).toEqual({ valor: 1_600_000 })
  })
  // el caso del reporte: NaN viajaba como null y se registraba como "sin costo" sin avisar
  it('opcional con basura bloquea, no se vuelve "sin dato"', () => {
    const r = validarCOP('20000´¨P[RTGGTYBGTR45YHT', { opcional: true })
    expect('error' in r && r.error).toMatch(/COP/)
  })
})

describe('códigos de lote', () => {
  it('normaliza a mayúsculas sin espacios', () => expect(normalizarCodigoLote(' cac001 ')).toBe('CAC001'))
  it.each(['CAC001', 'CAC1234', 'CAC001-1A2B3C', 'CAC001-1A2B3C-9F8E7D'])('acepta %s', (c) => expect(validarCodigoLote(c)).toBeNull())
  it.each(['', 'CAC01', 'XYZ001', 'CAC001-12', 'CAC001 x', `CAC${'1'.repeat(40)}`])('rechaza %j', (c) =>
    expect(validarCodigoLote(c)).toMatch(/CAC001/))
})

describe('validarMotivo', () => {
  it('exige de 3 a 500 caracteres sin contar espacios de los extremos', () => {
    expect(validarMotivo('  ab ')).toMatch(/3/)
    expect(validarMotivo('abc')).toBeNull()
    expect(validarMotivo('x'.repeat(501))).toMatch(/500/)
  })
})
