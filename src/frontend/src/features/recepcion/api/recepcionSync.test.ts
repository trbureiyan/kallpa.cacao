import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { db } from '@/db/dexieDb'
import { limpiarDb } from '@/test/limpiarDb'
import { encolarRecepcionApi } from './recepcionDb'
import { descartarRecepcion, reintentarRecepcion, resumirCola, sincronizarRecepcionesPendientes } from './recepcionSync'

const datos = { farmId: 3, farmName: 'Finca C', date: '2026-01-05', quantity: 12.5, purchaseTotalCop: 500_000, qualityNotes: 'seco' }
const rechazo = (status: number, detail = 'x') => new AxiosError('x', 'ERR', undefined, undefined, { status, data: { detail } } as AxiosResponse)
const heredada = (syncStatus: 'PENDING' | 'ERROR' = 'PENDING') =>
  ({ idempotencyKey: crypto.randomUUID(), lotCode: 'CAC001', producer: 'A', origin: 'Rivera', date: '2026-01-01', quantity: 100, unit: 'kg', syncStatus })
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

  it('un registro de la fase sin backend (sin finca) no es de la cola: no se envía, no se marca ERROR y no se borra', async () => {
    await db.recepciones.add(heredada())
    const post = vi.spyOn(axiosClient, 'post')
    await sincronizarRecepcionesPendientes('api')
    expect(post).not.toHaveBeenCalled()
    const [l] = await db.recepciones.toArray()
    expect(l).toMatchObject({ lotCode: 'CAC001', syncStatus: 'PENDING', quantity: 100 })
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

describe('resumirCola', () => {
  it('cuenta solo las recepciones de la cola del servidor; las heredadas sin finca no cuentan', async () => {
    await db.recepciones.add(heredada('PENDING'))
    await db.recepciones.add(heredada('ERROR')) // marcada por la versión anterior
    await encolarRecepcionApi(datos)
    const conError = await encolarRecepcionApi(datos)
    await db.recepciones.update(conError.idLocal!, { syncStatus: 'ERROR', errorMessage: 'x' })
    expect(resumirCola(await db.recepciones.toArray())).toEqual({ pendientes: 1, errores: 1 })
  })

  it('una descartada no cuenta como pendiente ni como error', async () => {
    const l = await encolarRecepcionApi(datos)
    await db.recepciones.update(l.idLocal!, { syncStatus: 'DISCARDED' })
    expect(resumirCola(await db.recepciones.toArray())).toEqual({ pendientes: 0, errores: 0 })
  })
})

describe('reintentarRecepcion', () => {
  it('vuelve a enviar una recepción con error y queda SYNCED si el servidor la acepta', async () => {
    const l = await encolarRecepcionApi(datos)
    await db.recepciones.update(l.idLocal!, { syncStatus: 'ERROR', errorMessage: 'Finca no encontrada' })
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue(ok('CAC010'))
    await reintentarRecepcion(l.idLocal!, 'api')
    expect(post).toHaveBeenCalledTimes(1)
    // misma clave: si el servidor ya la tenía, devuelve el lote original y no duplica
    expect(post.mock.calls[0][1]).toMatchObject({ idempotency_key: l.idempotencyKey })
    const r = await db.recepciones.get(l.idLocal!)
    expect(r).toMatchObject({ syncStatus: 'SYNCED', lotCode: 'CAC010' })
    expect(r?.errorMessage).toBeUndefined()
  })

  it('si el servidor la rechaza otra vez, vuelve a ERROR con el motivo nuevo', async () => {
    const l = await encolarRecepcionApi(datos)
    await db.recepciones.update(l.idLocal!, { syncStatus: 'ERROR', errorMessage: 'viejo' })
    vi.spyOn(axiosClient, 'post').mockRejectedValue(rechazo(422, 'quantity_kg no válido'))
    await reintentarRecepcion(l.idLocal!, 'api')
    const r = await db.recepciones.get(l.idLocal!)
    expect(r?.syncStatus).toBe('ERROR')
    expect(r?.errorMessage).toContain('quantity_kg')
  })

  it('sin red queda PENDING para el próximo intento automático', async () => {
    const l = await encolarRecepcionApi(datos)
    await db.recepciones.update(l.idLocal!, { syncStatus: 'ERROR', errorMessage: 'x' })
    vi.spyOn(axiosClient, 'post').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    await reintentarRecepcion(l.idLocal!, 'api')
    expect((await db.recepciones.get(l.idLocal!))?.syncStatus).toBe('PENDING')
  })
})

describe('descartarRecepcion', () => {
  it('marca la recepción como descartada y la conserva en el dispositivo con sus datos y el motivo previo', async () => {
    const l = await encolarRecepcionApi(datos)
    await db.recepciones.update(l.idLocal!, { syncStatus: 'ERROR', errorMessage: 'Finca no encontrada' })
    await descartarRecepcion(l.idLocal!)
    expect(await db.recepciones.count()).toBe(1)
    const r = await db.recepciones.get(l.idLocal!)
    expect(r).toMatchObject({ syncStatus: 'DISCARDED', quantity: 12.5, errorMessage: 'Finca no encontrada' })
    expect(r?.discardedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('una descartada ya no se envía', async () => {
    const l = await encolarRecepcionApi(datos)
    await db.recepciones.update(l.idLocal!, { syncStatus: 'ERROR' })
    await descartarRecepcion(l.idLocal!)
    const post = vi.spyOn(axiosClient, 'post')
    await sincronizarRecepcionesPendientes('api')
    expect(post).not.toHaveBeenCalled()
  })

  it('solo se descarta lo que tiene error: una pendiente o sincronizada no se toca', async () => {
    const l = await encolarRecepcionApi(datos)
    await expect(descartarRecepcion(l.idLocal!)).rejects.toMatchObject({ codigo: 'NO_DESCARTABLE' })
    expect((await db.recepciones.get(l.idLocal!))?.syncStatus).toBe('PENDING')
  })
})
