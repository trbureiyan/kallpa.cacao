import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { iniciarSesionApi } from './autenticacion'
import { axiosClient } from './axiosClient'
import { guardarToken, leerToken } from './token'

const rechazo = (status: number) => new AxiosError('x', 'ERR', undefined, undefined, { status, data: {} } as AxiosResponse)

describe('iniciarSesionApi', () => {
  beforeEach(() => guardarToken(null))
  afterEach(() => vi.restoreAllMocks())

  it('envía formulario username/password, guarda el token y traduce el rol', async () => {
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({ data: { access_token: 'tok', token_type: 'bearer' } })
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: { id: 1, username: 'admin', full_name: 'Administrador demo', role: 'admin' } })
    const sesion = await iniciarSesionApi('admin', 'x')
    expect(post.mock.calls[0][0]).toBe('/auth/login')
    expect(String(post.mock.calls[0][1])).toBe('username=admin&password=x')
    expect(sesion).toEqual({ rol: 'ADMINISTRADOR', nombre: 'Administrador demo' })
    expect(leerToken()).toBe('tok')
  })

  it('credenciales incorrectas: error CREDENCIALES y sin token guardado', async () => {
    vi.spyOn(axiosClient, 'post').mockRejectedValue(rechazo(401))
    await expect(iniciarSesionApi('a', 'b')).rejects.toMatchObject({ codigo: 'CREDENCIALES' })
    expect(leerToken()).toBeNull()
  })

  it('si falla /auth/me no deja un token a medias', async () => {
    vi.spyOn(axiosClient, 'post').mockResolvedValue({ data: { access_token: 'tok' } })
    vi.spyOn(axiosClient, 'get').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    await expect(iniciarSesionApi('a', 'b')).rejects.toMatchObject({ codigo: 'SIN_RED' })
    expect(leerToken()).toBeNull()
  })
})
