import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient, registrarAlExpirar, registrarAlFallarRed } from './axiosClient'
import { guardarToken, leerToken } from './token'

function adaptador(status: number): { adapter: AxiosAdapter; vistas: InternalAxiosRequestConfig[] } {
  const vistas: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    vistas.push(config)
    const respuesta = { data: {}, status, statusText: '', headers: {}, config }
    if (status >= 400) throw new AxiosError('x', 'ERR', config, undefined, respuesta)
    return respuesta
  }
  return { adapter, vistas }
}

describe('axiosClient', () => {
  beforeEach(() => {
    guardarToken(null)
    registrarAlExpirar(() => {})
  })

  it('agrega el token como Bearer', async () => {
    guardarToken('abc')
    const { adapter, vistas } = adaptador(200)
    await axiosClient.get('/x', { adapter })
    expect(vistas[0].headers.Authorization).toBe('Bearer abc')
  })

  it('sin token no manda Authorization', async () => {
    const { adapter, vistas } = adaptador(200)
    await axiosClient.get('/x', { adapter })
    expect(vistas[0].headers.Authorization).toBeUndefined()
  })

  it('un 401 con sesión limpia el token y avisa una sola vez', async () => {
    const avisar = vi.fn()
    registrarAlExpirar(avisar)
    guardarToken('vencido')
    const { adapter } = adaptador(401)
    await expect(axiosClient.get('/x', { adapter })).rejects.toBeTruthy()
    await expect(axiosClient.get('/x', { adapter })).rejects.toBeTruthy()
    expect(avisar).toHaveBeenCalledTimes(1)
    expect(leerToken()).toBeNull()
  })

  it('un 401 de credenciales malas (sin token) no cuenta como sesión vencida', async () => {
    const avisar = vi.fn()
    registrarAlExpirar(avisar)
    const { adapter } = adaptador(401)
    await expect(axiosClient.post('/auth/login', {}, { adapter })).rejects.toBeTruthy()
    expect(avisar).not.toHaveBeenCalled()
  })

  it('una petición sin respuesta avisa para volver a comprobar el servidor; una con respuesta no', async () => {
    const avisar = vi.fn()
    registrarAlFallarRed(avisar)
    const sinRespuesta: AxiosAdapter = async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config)
    }
    await expect(axiosClient.get('/x', { adapter: sinRespuesta })).rejects.toBeTruthy()
    expect(avisar).toHaveBeenCalledTimes(1)
    await expect(axiosClient.get('/x', { adapter: adaptador(500).adapter })).rejects.toBeTruthy()
    expect(avisar).toHaveBeenCalledTimes(1)
    registrarAlFallarRed(() => {})
  })
})
