import { describe, expect, it } from 'vitest'
import { alertasDeProceso, camposFaltantes } from './reglas'

const sano = { mermaPct: 10, costoUnitario: 20_000, camposFaltantes: [] as string[] }

describe('alertasDeProceso', () => {
  it('un proceso sano no genera alertas', () => expect(alertasDeProceso(sano)).toEqual([]))

  it('merma de 20 % supera el 15 % y explica regla y causa', () => {
    const [a] = alertasDeProceso({ ...sano, mermaPct: 20 })
    expect(a.tipo).toBe('merma')
    expect(a.regla).toContain('15')
    expect(a.causa).toContain('20')
  })

  it('el umbral es configurable', () => {
    expect(alertasDeProceso({ ...sano, mermaPct: 8 }, { mermaPct: 5 }).map((a) => a.tipo)).toEqual(['merma'])
  })

  it('costo unitario no calculable genera alerta de costo', () => {
    expect(alertasDeProceso({ ...sano, costoUnitario: null }).map((a) => a.tipo)).toEqual(['costo'])
  })

  it('campos faltantes generan registro_incompleto nombrando el campo', () => {
    const [a] = alertasDeProceso({ ...sano, camposFaltantes: ['responsable'] })
    expect(a.tipo).toBe('registro_incompleto')
    expect(a.causa).toContain('responsable')
  })

  it('días sin avance sobre el umbral generan retraso', () => {
    expect(alertasDeProceso({ ...sano, diasSinAvance: 10 }, { diasRetraso: 7 }).map((a) => a.tipo)).toEqual(['retraso'])
    expect(alertasDeProceso({ ...sano, diasSinAvance: 7 }, { diasRetraso: 7 })).toEqual([])
  })
})

describe('camposFaltantes', () => {
  it('detecta responsable y costo total ausentes', () => {
    expect(camposFaltantes({ responsible: ' ', costoTotalCOP: undefined })).toEqual(['responsable', 'costo total de la etapa'])
  })
  it('un registro completo no tiene faltantes', () => {
    expect(camposFaltantes({ responsible: 'José', costoTotalCOP: 1000 })).toEqual([])
  })
})
