import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { descargarCsvApi } from './exportApi'

afterEach(() => vi.restoreAllMocks())

describe('descargarCsvApi', () => {
  it('pide /exports/lots.csv como texto con los filtros en la API', async () => {
    const get = vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: 'identificador\r\nCAC001' })
    const csv = await descargarCsvApi({ origen: 'Rivera', estado: 'LIBERADO' })
    expect(csv).toBe('identificador\r\nCAC001')
    expect(get).toHaveBeenCalledWith('/exports/lots.csv', { params: { origin: 'Rivera', status: 'released' }, responseType: 'text' })
  })

  it('sin filtros no manda parámetros vacíos', async () => {
    const get = vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: '' })
    await descargarCsvApi({})
    expect(get.mock.calls[0][1]).toMatchObject({ params: {} })
  })

  it('un 403 llega como error de permiso', async () => {
    vi.spyOn(axiosClient, 'get').mockRejectedValue(new AxiosError('x', 'ERR', undefined, undefined, { status: 403, data: {} } as AxiosResponse))
    await expect(descargarCsvApi({})).rejects.toMatchObject({ codigo: 'PERMISO' })
  })
})
