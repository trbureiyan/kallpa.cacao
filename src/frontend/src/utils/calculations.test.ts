import { describe, expect, it } from 'vitest'
import { calcularCostoUnitario, calcularMargenVenta, calcularMerma, esMermaCritica } from './calculations'

describe('calcularMerma', () => {
  it('ejemplo del reto: 100 kg a 80 kg es 20 %', () => expect(calcularMerma(100, 80)).toBe(20))
  it('valores nuevos: 200 kg a 150 kg es 25 %', () => expect(calcularMerma(200, 150)).toBe(25))
  it('entrada 0 no es calculable', () => expect(calcularMerma(0, 0)).toBeNull())
  it('NaN no es calculable', () => expect(calcularMerma(NaN, 5)).toBeNull())
})

describe('esMermaCritica', () => {
  it('15 exacto no supera el umbral', () => expect(esMermaCritica(15)).toBe(false))
  it('15,01 supera el umbral', () => expect(esMermaCritica(15.01)).toBe(true))
  it('acepta un umbral distinto', () => expect(esMermaCritica(10, 5)).toBe(true))
})

describe('calcularCostoUnitario', () => {
  it('ejemplo del reto: 1.600.000 / 80 = 20.000', () => expect(calcularCostoUnitario(1_600_000, 80)).toBe(20_000))
  it('valores nuevos: 900.000 / 60 = 15.000', () => expect(calcularCostoUnitario(900_000, 60)).toBe(15_000))
  it('salida 0 no es calculable', () => expect(calcularCostoUnitario(1000, 0)).toBeNull())
})

describe('calcularMargenVenta', () => {
  it('ejemplo del reto: precio 25.000, costo 20.000 es 20 %', () => expect(calcularMargenVenta(25_000, 20_000)).toBe(20))
  it('valores nuevos: precio 18.000, costo 15.000 es 16,67 %', () => expect(calcularMargenVenta(18_000, 15_000)).toBe(16.67))
  it('precio 0 no es calculable', () => expect(calcularMargenVenta(0, 500)).toBeNull())
})
