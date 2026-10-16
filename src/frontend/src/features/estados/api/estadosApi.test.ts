import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { cambiarEstadoApi } from './estadosApi'

const inventario = [
  { id: 1, code: 'CAC001', origin: 'Rivera', received_quantity: 100, consumed_quantity: 0, available_quantity: 100, unit: 'kg', status: 'pending', costs_cop: 0 },
  { id: 2, code: 'CAC002', origin: 'Campoalegre', received_quantity: 150, consumed_quantity: 0, available_quantity: 150, unit: 'kg', status: 'blocked', costs_cop: 0 },
]
const base = { lotCode: 'CAC001', nuevo: 'BLOQUEADO' as const, motivo: 'Humedad alta', rol: 'ADMINISTRADOR' as const }

afterEach(() => vi.restoreAllMocks())
const conInventario = () => vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: inventario })
const rechazo = (status: number) => new AxiosError('x', 'ERR', undefined, undefined, { status, data: { detail: 'x' } } as AxiosResponse)

describe('cambiarEstadoApi', () => {
  it('envía PATCH con el estado de la API y el motivo recortado', async () => {
    conInventario()
    const patch = vi.spyOn(axiosClient, 'patch').mockResolvedValue({ data: {} })
    await cambiarEstadoApi({ ...base, motivo: '  Humedad alta  ' })
    expect(patch).toHaveBeenCalledWith('/lots/1/status', { status: 'blocked', reason: 'Humedad alta' })
  })

  it.each([
    ['operador', { rol: 'OPERADOR' as const }, 'PERMISO_DENEGADO'],
    ['sin motivo', { motivo: '   ' }, 'MOTIVO_OBLIGATORIO'],
    ['motivo de 2 letras', { motivo: 'ok' }, 'MOTIVO_OBLIGATORIO'],
    ['estado igual al actual', { lotCode: 'CAC002' }, 'ESTADO_SIN_CAMBIO'],
    ['lote desconocido', { lotCode: 'CAC999' }, 'LOTE_NO_ENCONTRADO'],
  ])('rechaza %s sin llamar al servidor', async (_n, cambio, codigo) => {
    conInventario()
    const patch = vi.spyOn(axiosClient, 'patch')
    await expect(cambiarEstadoApi({ ...base, ...cambio })).rejects.toMatchObject({ codigo })
    expect(patch).not.toHaveBeenCalled()
  })

  it('un 403 del servidor llega como error de permiso', async () => {
    conInventario()
    vi.spyOn(axiosClient, 'patch').mockRejectedValue(rechazo(403))
    await expect(cambiarEstadoApi(base)).rejects.toMatchObject({ codigo: 'PERMISO' })
  })
})
