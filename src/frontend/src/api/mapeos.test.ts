import { describe, expect, it } from 'vitest'
import { ErrorDominio } from '@/utils/errores'
import { estadoAApi, estadoDeApi, filaInventarioDeApi, idPorCodigo, numero, rolDeApi } from './mapeos'

describe('rolDeApi', () => {
  it('traduce los dos roles', () => {
    expect(rolDeApi('admin')).toBe('ADMINISTRADOR')
    expect(rolDeApi('operator')).toBe('OPERADOR')
  })
  it('un rol desconocido es error, no un permiso por defecto', () => {
    expect(() => rolDeApi('root')).toThrow(ErrorDominio)
  })
})

describe('estados', () => {
  it('ida y vuelta', () => {
    expect(estadoDeApi('released')).toBe('LIBERADO')
    expect(estadoAApi('BLOQUEADO')).toBe('blocked')
    expect(estadoAApi(estadoDeApi('pending'))).toBe('pending')
  })
  it('estado desconocido es error', () => {
    expect(() => estadoDeApi('archived')).toThrow(ErrorDominio)
  })
})

describe('numero', () => {
  it.each([
    [12.5, 12.5],
    ['12.500', 12.5],
    ['0', 0],
    [null, null],
    [undefined, null],
    ['', null],
    ['abc', null],
  ])('%j -> %j', (entrada, esperado) => {
    expect(numero(entrada as never)).toBe(esperado)
  })
})

describe('filaInventarioDeApi', () => {
  it('convierte una fila de /inventory/admin', () => {
    const fila = filaInventarioDeApi({
      id: 7, code: 'CAC001', origin: 'Rivera', received_quantity: '100.000', consumed_quantity: 20,
      available_quantity: '80.000', unit: 'kg', status: 'released', status_reason: null, costs_cop: 1600000,
    })
    expect(fila).toEqual({
      id: 7, lotCode: 'CAC001', origin: 'Rivera', recibidoKg: 100, consumidoKg: 20, disponibleKg: 80,
      estado: 'LIBERADO', costosCOP: 1600000,
    })
  })
  it('sin costos (operador) deja costosCOP en null', () => {
    const fila = filaInventarioDeApi({
      lot_id: 7, lot_code: 'CAC001', origin: 'Rivera', available_quantity: 80, unit: 'kg', status: 'pending',
    })
    expect(fila.costosCOP).toBeNull()
    expect(fila.lotCode).toBe('CAC001')
    expect(fila.id).toBe(7)
  })
})

describe('idPorCodigo', () => {
  const lotes = [{ id: 1, lotCode: 'CAC001' }, { id: 2, lotCode: 'CAC002' }]
  it('resuelve el id', () => expect(idPorCodigo(lotes, 'CAC002')).toBe(2))
  it('un código inexistente es error de dominio', () => {
    expect(() => idPorCodigo(lotes, 'CAC999')).toThrow(/CAC999/)
  })
})
