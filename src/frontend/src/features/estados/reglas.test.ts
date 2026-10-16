import { describe, expect, it } from 'vitest'
import { evaluarCambioEstado } from './reglas'

const base = { rol: 'ADMINISTRADOR', actual: 'PENDIENTE', nuevo: 'LIBERADO', motivo: 'Cumple calidad' } as const

describe('evaluarCambioEstado', () => {
  it('el administrador con motivo puede liberar', () => {
    expect(evaluarCambioEstado(base)).toEqual({ ok: true })
  })
  it('el operador no puede liberar', () => {
    const r = evaluarCambioEstado({ ...base, rol: 'OPERADOR' })
    expect(r.ok).toBe(false)
  })
  it('el motivo en blanco se rechaza', () => {
    expect(evaluarCambioEstado({ ...base, motivo: '  ' }).ok).toBe(false)
  })
  it('no se permite el mismo estado', () => {
    expect(evaluarCambioEstado({ ...base, actual: 'BLOQUEADO', nuevo: 'BLOQUEADO' }).ok).toBe(false)
  })
  it('el administrador puede bloquear con motivo', () => {
    expect(evaluarCambioEstado({ ...base, nuevo: 'BLOQUEADO', motivo: 'Reclamo del comprador' })).toEqual({ ok: true })
  })
})
