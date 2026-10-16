import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorDominio } from '@/utils/errores'
import * as autenticacion from '@/api/autenticacion'
import { resolverSesion } from './fuente'

afterEach(() => vi.restoreAllMocks())
const sinRed = new ErrorDominio('SIN_RED', 'sin red')

describe('resolverSesion', () => {
  it('la API responde: modo api con el rol del servidor', async () => {
    vi.spyOn(autenticacion, 'iniciarSesionApi').mockResolvedValue({ rol: 'ADMINISTRADOR', nombre: 'Admin' })
    expect(await resolverSesion('admin', 'x', { permitirLocal: false })).toEqual({ rol: 'ADMINISTRADOR', nombre: 'Admin', modo: 'api' })
  })

  it('credenciales malas no pasan a local aunque esté permitido', async () => {
    vi.spyOn(autenticacion, 'iniciarSesionApi').mockRejectedValue(new ErrorDominio('CREDENCIALES', 'mal'))
    await expect(resolverSesion('operador', 'demo-operador', { permitirLocal: true })).rejects.toMatchObject({ codigo: 'CREDENCIALES' })
  })

  it('sin red y local permitido: entra en modo local con un usuario demo', async () => {
    vi.spyOn(autenticacion, 'iniciarSesionApi').mockRejectedValue(sinRed)
    const s = await resolverSesion('operador', 'demo-operador', { permitirLocal: true })
    expect(s.modo).toBe('local')
    expect(s.rol).toBe('OPERADOR')
  })

  it('sin red y local no permitido: devuelve el error de red', async () => {
    vi.spyOn(autenticacion, 'iniciarSesionApi').mockRejectedValue(sinRed)
    await expect(resolverSesion('operador', 'demo-operador', { permitirLocal: false })).rejects.toMatchObject({ codigo: 'SIN_RED' })
  })

  it('sin red y credenciales que no son demo: error de red, no "contraseña incorrecta"', async () => {
    vi.spyOn(autenticacion, 'iniciarSesionApi').mockRejectedValue(sinRed)
    await expect(resolverSesion('admin', 'Admin123!', { permitirLocal: true })).rejects.toMatchObject({ codigo: 'SIN_RED' })
  })

  it('forzarLocal no toca la API', async () => {
    const api = vi.spyOn(autenticacion, 'iniciarSesionApi')
    const s = await resolverSesion('admin', 'demo-admin', { permitirLocal: true, forzarLocal: true })
    expect(s.modo).toBe('local')
    expect(api).not.toHaveBeenCalled()
  })

  it('forzarLocal sin permiso es error', async () => {
    await expect(resolverSesion('admin', 'demo-admin', { permitirLocal: false, forzarLocal: true })).rejects.toMatchObject({ codigo: 'LOCAL_NO_PERMITIDO' })
  })
})
