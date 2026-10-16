import { describe, expect, it } from 'vitest'
import { validarTransformacion } from './reglas'

describe('validarTransformacion', () => {
  it('acepta 100 kg a 80 kg con 100 kg disponibles', () => {
    expect(validarTransformacion({ entradaKg: 100, salidaKg: 80, disponibleKg: 100 })).toEqual([])
  })
  it('rechaza consumir más que la existencia con mensaje de tres partes', () => {
    const e = validarTransformacion({ entradaKg: 120, salidaKg: 90, disponibleKg: 100 })
    expect(e).toHaveLength(1)
    expect(e[0]).toContain('120 kg')
    expect(e[0]).toContain('100 kg disponibles')
    expect(e[0]).toContain('Reduzca')
  })
  it.each([0, -5, NaN])('rechaza entrada no positiva (%s)', (entradaKg) => {
    expect(validarTransformacion({ entradaKg, salidaKg: 10, disponibleKg: 100 }).length).toBeGreaterThan(0)
  })
  it.each([0, -1, NaN])('rechaza salida no positiva (%s)', (salidaKg) => {
    expect(validarTransformacion({ entradaKg: 10, salidaKg, disponibleKg: 100 }).length).toBeGreaterThan(0)
  })
  it('rechaza salida mayor que la entrada sin justificación', () => {
    expect(validarTransformacion({ entradaKg: 100, salidaKg: 110, disponibleKg: 100 }).length).toBe(1)
  })
  it('acepta salida mayor que la entrada con justificación', () => {
    expect(
      validarTransformacion({ entradaKg: 100, salidaKg: 110, disponibleKg: 100, justificacion: 'adición de insumos' }),
    ).toEqual([])
  })
  it('una justificación en blanco no cuenta', () => {
    expect(validarTransformacion({ entradaKg: 100, salidaKg: 110, disponibleKg: 100, justificacion: '   ' }).length).toBe(1)
  })
})
