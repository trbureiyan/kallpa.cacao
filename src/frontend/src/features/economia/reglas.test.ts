import { describe, expect, it } from 'vitest'
import { indicadoresDeProceso } from './reglas'

describe('indicadoresDeProceso', () => {
  it('ejemplo del reto: 100→80, 1.600.000 COP, precio 25.000 → 20 %, 20.000 COP/kg, 20 %', () => {
    expect(indicadoresDeProceso({ inputQty: 100, outputQty: 80, costoTotalCOP: 1_600_000, precioVentaCOP: 25_000 })).toEqual({
      mermaPct: 20,
      costoUnitario: 20_000,
      margenPct: 20,
    })
  })
  it('valores nuevos: 200→170, 900.000 COP, precio 12.000', () => {
    const r = indicadoresDeProceso({ inputQty: 200, outputQty: 170, costoTotalCOP: 900_000, precioVentaCOP: 12_000 })
    expect(r.mermaPct).toBe(15)
    expect(r.costoUnitario).toBe(5294.12)
    expect(r.margenPct).toBe(55.88)
  })
  it('sin costo total no hay costo ni margen', () => {
    expect(indicadoresDeProceso({ inputQty: 100, outputQty: 80, precioVentaCOP: 25_000 })).toMatchObject({
      costoUnitario: null,
      margenPct: null,
    })
  })
  it('sin precio hay costo pero no margen', () => {
    expect(indicadoresDeProceso({ inputQty: 100, outputQty: 80, costoTotalCOP: 1_600_000 })).toMatchObject({
      costoUnitario: 20_000,
      margenPct: null,
    })
  })
})
