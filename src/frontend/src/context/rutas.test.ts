import { describe, expect, it } from 'vitest'
import { rutasPermitidas } from './rutas'
import { autenticar } from './usuariosDemo'

describe('rutasPermitidas', () => {
  it('el operador no tiene inventario ni auditoría', () => {
    const r = rutasPermitidas('OPERADOR')
    expect(r).toEqual(expect.arrayContaining(['/dashboard', '/recepcion', '/transformacion', '/trazabilidad']))
    expect(r).not.toContain('/inventario')
    expect(r).not.toContain('/auditoria')
  })
  it('el administrador tiene todas', () => {
    expect(rutasPermitidas('ADMINISTRADOR')).toEqual(expect.arrayContaining(['/inventario', '/auditoria', '/recepcion']))
  })
  it('sin sesión no hay rutas', () => expect(rutasPermitidas(null)).toEqual([]))
})

describe('autenticar (usuarios demo locales)', () => {
  it('acepta las credenciales demo del operador y del administrador', () => {
    expect(autenticar('operador', 'demo-operador')?.rol).toBe('OPERADOR')
    expect(autenticar('admin', 'demo-admin')?.rol).toBe('ADMINISTRADOR')
  })
  it('rechaza una clave incorrecta o un usuario desconocido', () => {
    expect(autenticar('admin', 'otra')).toBeNull()
    expect(autenticar('nadie', 'demo-admin')).toBeNull()
  })
})
