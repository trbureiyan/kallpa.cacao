import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { idDeLote, listarFilasApi } from './inventarioApi'

afterEach(() => vi.restoreAllMocks())

const admin = [
  { id: 1, code: 'CAC001', origin: 'Rivera', received_quantity: '100.000', consumed_quantity: '100.000', available_quantity: '0.000', unit: 'kg', status: 'released', status_reason: null, costs_cop: 1_600_000 },
  { id: 2, code: 'CAC002', origin: 'Campoalegre', received_quantity: 150, consumed_quantity: 0, available_quantity: 150, unit: 'kg', status: 'pending', status_reason: null, costs_cop: 0 },
]
const operador = [{ lot_id: 2, lot_code: 'CAC002', product_type: 'raw_cocoa', origin: 'Campoalegre', available_quantity: 150, unit: 'kg', status: 'pending' }]

describe('listarFilasApi', () => {
  it('administrador usa /inventory/admin y recibe recibido y consumido', async () => {
    const get = vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: admin })
    const filas = await listarFilasApi('ADMINISTRADOR')
    expect(get).toHaveBeenCalledWith('/inventory/admin')
    expect(filas[0]).toMatchObject({ id: 1, codigo: 'CAC001', origen: 'Rivera', recibidoKg: 100, consumidoKg: 100, disponibleKg: 0, estado: 'LIBERADO' })
  })

  it('operador usa /inventory: recibido y consumido son null, no 0', async () => {
    const get = vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: operador })
    const [f] = await listarFilasApi('OPERADOR')
    expect(get).toHaveBeenCalledWith('/inventory')
    expect(f).toMatchObject({ id: 2, codigo: 'CAC002', recibidoKg: null, consumidoKg: null, disponibleKg: 150 })
  })

  it('el costo unitario no sale del inventario: queda null hasta consultar economía', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: admin })
    expect((await listarFilasApi('ADMINISTRADOR')).every((f) => f.costoUnitario === null)).toBe(true)
  })

  it('un 403 llega como error de permiso', async () => {
    vi.spyOn(axiosClient, 'get').mockRejectedValue(new AxiosError('x', 'ERR', undefined, undefined, { status: 403, data: {} } as AxiosResponse))
    await expect(listarFilasApi('ADMINISTRADOR')).rejects.toMatchObject({ codigo: 'PERMISO' })
  })

  it('un estado desconocido del servidor falla en lugar de mostrarse mal', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: [{ ...admin[0], status: 'archived' }] })
    await expect(listarFilasApi('ADMINISTRADOR')).rejects.toMatchObject({ codigo: 'CONTRATO' })
  })
})

describe('idDeLote', () => {
  it('devuelve el id del código o null si no existe', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: admin })
    expect(await idDeLote('ADMINISTRADOR', 'CAC002')).toBe(2)
    expect(await idDeLote('ADMINISTRADOR', 'CAC999')).toBeNull()
  })
})
