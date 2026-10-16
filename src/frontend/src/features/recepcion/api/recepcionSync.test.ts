import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { db } from '@/db/dexieDb'
import { limpiarDb } from '@/test/limpiarDb'
import { encolarRecepcionApi } from './recepcionDb'
import { sincronizarRecepcionesPendientes } from './recepcionSync'

const datos = { farmId: 3, farmName: 'Finca C', date: '2026-01-05', quantity: 12.5, purchaseTotalCop: 500_000, qualityNotes: 'seco' }
const rechazo = (status: number, detail = 'x') => new AxiosError('x', 'ERR', undefined, undefined, { status, data: { detail } } as AxiosResponse)
const ok = (lot_code: string) => ({ status: 201, data: { lot_code } })

beforeEach(limpiarDb)
afterEach(() => vi.restoreAllMocks())

describe('sincronizarRecepcionesPendientes (modo api)', () => {
  it('envía el contrato exacto a /receptions', async () => {
    const l = await encolarRecepcionApi(datos)
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue(ok('CAC008'))
    await sincronizarRecepcionesPendientes('api')
    expect(post).toHaveBeenCalledWith('/receptions', {
      idempotency_key: l.idempotencyKey,
      farm_id: 3,
      received_at: '2026-01-05T12:00:00Z',
      quantity_kg: 12.5,
      purchase_total_cop: 500_000,
      quality_notes: 'seco',
    })
  })

  it('el código del servidor reemplaza al provisional y queda SYNCED', async () => {
    await encolarRecepcionApi(datos)
    vi.spyOn(axiosClient, 'post').mockResolvedValue(ok('CAC008'))
    expect(await sincronizarRecepcionesPendientes('api')).toBe(1)
    const [l] = await db.recepciones.toArray()
    expect(l).toMatchObject({ lotCode: 'CAC008', syncStatus: 'SYNCED' })
  })

  it('dos corridas seguidas hacen un solo POST por recepción', async () => {
    await encolarRecepcionApi(datos)
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue(ok('CAC008'))
    await sincronizarRecepcionesPendientes('api')
    await sincronizarRecepcionesPendientes('api')
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('409 deja ERROR con mensaje y no pierde el registro', async () => {
    await encolarRecepcionApi(datos)
    vi.spyOn(axiosClient, 'post').mockRejectedValue(rechazo(409, 'La clave de idempotencia ya fue usada con otra recepción'))
    expect(await sincronizarRecepcionesPendientes('api')).toBe(0)
    const [l] = await db.recepciones.toArray()
    expect(l.syncStatus).toBe('ERROR')
    expect(l.errorMessage).toContain('idempotencia')
    expect(l.quantity).toBe(12.5)
  })

  it('sin red sigue PENDING', async () => {
    await encolarRecepcionApi(datos)
    vi.spyOn(axiosClient, 'post').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    await sincronizarRecepcionesPendientes('api')
    expect((await db.recepciones.toArray())[0].syncStatus).toBe('PENDING')
  })

  it('un 500 sigue PENDING (se puede reintentar)', async () => {
    await encolarRecepcionApi(datos)
    vi.spyOn(axiosClient, 'post').mockRejectedValue(rechazo(500))
    await sincronizarRecepcionesPendientes('api')
    expect((await db.recepciones.toArray())[0].syncStatus).toBe('PENDING')
  })

  it('un 401 conserva todas las pendientes y no sigue enviando', async () => {
    await encolarRecepcionApi(datos)
    await encolarRecepcionApi(datos)
    const post = vi.spyOn(axiosClient, 'post').mockRejectedValue(rechazo(401))
    await sincronizarRecepcionesPendientes('api')
    expect(post).toHaveBeenCalledTimes(1)
    expect((await db.recepciones.toArray()).map((l) => l.syncStatus)).toEqual(['PENDING', 'PENDING'])
  })

  it('si una falla por validación, las demás se siguen enviando', async () => {
    await encolarRecepcionApi(datos)
    await encolarRecepcionApi(datos)
    vi.spyOn(axiosClient, 'post').mockRejectedValueOnce(rechazo(422)).mockResolvedValueOnce(ok('CAC009'))
    expect(await sincronizarRecepcionesPendientes('api')).toBe(1)
    expect((await db.recepciones.toArray()).map((l) => l.syncStatus).sort()).toEqual(['ERROR', 'SYNCED'])
  })

  it('un registro de la fase sin backend (sin finca) pasa a ERROR sin llamar a la API', async () => {
    await db.recepciones.add({ idempotencyKey: 'k', lotCode: 'CAC001', producer: 'A', origin: 'Rivera', date: '2026-01-01', quantity: 100, unit: 'kg', syncStatus: 'PENDING' })
    const post = vi.spyOn(axiosClient, 'post')
    await sincronizarRecepcionesPendientes('api')
    expect(post).not.toHaveBeenCalled()
    expect((await db.recepciones.toArray())[0].syncStatus).toBe('ERROR')
  })
})

describe('sincronizarRecepcionesPendientes (corridas simultáneas)', () => {
  it('dos corridas a la vez no envían dos veces la misma recepción', async () => {
    await encolarRecepcionApi(datos)
    const post = vi.spyOn(axiosClient, 'post').mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20))
      return ok('CAC008')
    })
    const [a, b] = await Promise.all([sincronizarRecepcionesPendientes('api'), sincronizarRecepcionesPendientes('api')])
    expect(post).toHaveBeenCalledTimes(1)
    expect(a + b).toBe(1)
  })

  it('una recepción guardada mientras corre otra sincronización también se envía', async () => {
    await encolarRecepcionApi(datos)
    const post = vi.spyOn(axiosClient, 'post').mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20))
      return ok('CAC00X')
    })
    const primera = sincronizarRecepcionesPendientes('api')
    await encolarRecepcionApi(datos) // llega después de que la primera leyó sus pendientes
    const segunda = sincronizarRecepcionesPendientes('api')
    await Promise.all([primera, segunda])
    expect(post).toHaveBeenCalledTimes(2)
    expect((await db.recepciones.toArray()).every((l) => l.syncStatus === 'SYNCED')).toBe(true)
  })

  it('si una corrida falla, la siguiente igual se ejecuta', async () => {
    await encolarRecepcionApi(datos)
    vi.spyOn(axiosClient, 'post').mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK')).mockResolvedValueOnce(ok('CAC009'))
    await sincronizarRecepcionesPendientes('api')
    expect(await sincronizarRecepcionesPendientes('api')).toBe(1)
  })
})

describe('sincronizarRecepcionesPendientes (modo local)', () => {
  it('no llama a la API', async () => {
    await encolarRecepcionApi(datos)
    const post = vi.spyOn(axiosClient, 'post')
    expect(await sincronizarRecepcionesPendientes('local')).toBe(0)
    expect(post).not.toHaveBeenCalled()
  })
})
