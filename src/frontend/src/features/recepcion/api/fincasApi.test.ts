import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { db } from '@/db/dexieDb'
import { limpiarDb } from '@/test/limpiarDb'
import { cargarFincas } from './fincasApi'

const dto = [
  { id: 2, producer_id: 1, name: 'Finca B', region: 'Campoalegre' },
  { id: 1, producer_id: 1, name: 'Finca A', region: 'Rivera' },
]

beforeEach(limpiarDb)
afterEach(() => vi.restoreAllMocks())

describe('cargarFincas', () => {
  it('trae las fincas de la API y las deja en caché', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: dto })
    const fincas = await cargarFincas()
    expect(fincas.map((f) => f.name)).toEqual(['Finca A', 'Finca B'])
    expect(await db.fincas.count()).toBe(2)
  })

  it('sin red usa la caché', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValueOnce({ data: dto })
    await cargarFincas()
    vi.spyOn(axiosClient, 'get').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    expect((await cargarFincas()).length).toBe(2)
  })

  it('sin red y sin caché explica qué hacer', async () => {
    vi.spyOn(axiosClient, 'get').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    await expect(cargarFincas()).rejects.toMatchObject({ codigo: 'SIN_CATALOGO' })
  })

  it('un 403 no se disfraza de caché', async () => {
    vi.spyOn(axiosClient, 'get').mockRejectedValue(new AxiosError('x', 'ERR', undefined, undefined, { status: 403, data: {} } as AxiosResponse))
    await expect(cargarFincas()).rejects.toMatchObject({ codigo: 'PERMISO' })
  })

  it('una lista vacía del servidor reemplaza la caché vieja', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValueOnce({ data: dto })
    await cargarFincas()
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: [] })
    expect(await cargarFincas()).toEqual([])
    expect(await db.fincas.count()).toBe(0)
  })
})
