import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { fijarReloj } from '@/utils/clock'
import { listarProcesosApi, registrarProcesoApi } from './procesoApi'

const inventario = [
  { id: 1, code: 'CAC001', origin: 'Rivera', received_quantity: 100, consumed_quantity: 0, available_quantity: 100, unit: 'kg', status: 'released', costs_cop: 0 },
  { id: 2, code: 'CAC002', origin: 'Campoalegre', received_quantity: 150, consumed_quantity: 0, available_quantity: 150, unit: 'kg', status: 'pending', costs_cop: 0 },
]
const CLAVE = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const datos = { lotCode: 'CAC001', stage: 'FERMENTACION', inputQty: 100, outputQty: 80, responsible: 'x', claveIdempotencia: CLAVE }

function conInventario() {
  return vi.spyOn(axiosClient, 'get').mockImplementation(async (url: string) => {
    if (url === '/inventory/admin') return { data: inventario }
    throw new Error(`GET inesperado ${url}`)
  })
}
const rechazo = (status: number, detail: string) => new AxiosError('x', 'ERR', undefined, undefined, { status, data: { detail } } as AxiosResponse)

beforeEach(() => fijarReloj(() => '2026-01-10T12:00:00.000Z'))
afterEach(() => {
  fijarReloj(null)
  vi.restoreAllMocks()
})

describe('registrarProcesoApi', () => {
  it('envía el contrato de /transformations con el id resuelto por código', async () => {
    conInventario()
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({ data: { output_code: 'CAC001-AAAAAA' } })
    const r = await registrarProcesoApi('ADMINISTRADOR', { ...datos, costoTotalCOP: 1_600_000, precioVentaCOP: 25_000 })
    expect(r).toEqual({ outputCode: 'CAC001-AAAAAA' })
    expect(post).toHaveBeenCalledWith('/transformations', {
      idempotency_key: CLAVE,
      lot_id: 1,
      stage: 'FERMENTACION',
      occurred_at: '2026-01-10T12:00:00.000Z',
      input_quantity: 100,
      output_quantity: 80,
      unit: 'kg',
      output_code: 'CAC001-AAAAAA',
      costs_cop: 1_600_000,
      sale_price_cop_per_unit: 25_000,
    })
  })

  it('sin costo ni precio no inventa valores: los omite', async () => {
    conInventario()
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({ data: { output_code: 'x' } })
    await registrarProcesoApi('ADMINISTRADOR', datos)
    const cuerpo = post.mock.calls[0][1] as Record<string, unknown>
    expect(cuerpo).not.toHaveProperty('costs_cop')
    expect(cuerpo).not.toHaveProperty('sale_price_cop_per_unit')
    expect(cuerpo).not.toHaveProperty('incident')
  })

  it('justificación e incidencias viajan juntas en incident', async () => {
    conInventario()
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({ data: { output_code: 'x' } })
    await registrarProcesoApi('ADMINISTRADOR', { ...datos, outputQty: 110, justificacion: 'adición de insumos', incidencias: 'lluvia' })
    expect((post.mock.calls[0][1] as { incident: string }).incident).toBe('adición de insumos · lluvia')
  })

  it('un reintento con la misma clave manda la misma clave, el mismo código y la misma hora aunque pase el tiempo', async () => {
    conInventario()
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({ data: { output_code: 'x' } })
    const intento = { ...datos, ocurridoEn: '2026-01-10T11:00:00.000Z' }
    await registrarProcesoApi('ADMINISTRADOR', intento)
    fijarReloj(() => '2026-01-10T11:05:00.000Z')
    await registrarProcesoApi('ADMINISTRADOR', intento)
    expect((post.mock.calls[0][1] as { occurred_at: string }).occurred_at).toBe('2026-01-10T11:00:00.000Z')
    expect(post.mock.calls[0][1]).toEqual(post.mock.calls[1][1])
  })

  it.each([
    ['entrada 0', { inputQty: 0 }, 'DATO_INVALIDO'],
    ['salida mayor sin justificar', { outputQty: 120 }, 'DATO_INVALIDO'],
    ['lote desconocido', { lotCode: 'CAC999' }, 'LOTE_NO_ENCONTRADO'],
  ])('rechaza %s antes de llamar al servidor', async (_n, cambio, codigo) => {
    conInventario()
    const post = vi.spyOn(axiosClient, 'post')
    await expect(registrarProcesoApi('ADMINISTRADOR', { ...datos, ...cambio })).rejects.toMatchObject({ codigo })
    expect(post).not.toHaveBeenCalled()
  })

  it('la existencia la decide el servidor: un reintento con el lote ya en 0 kg igual se envía', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: [{ ...inventario[0], available_quantity: 0 }] })
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({ data: { output_code: 'CAC001-AAAAAA' } })
    await expect(registrarProcesoApi('ADMINISTRADOR', datos)).resolves.toEqual({ outputCode: 'CAC001-AAAAAA' })
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('un rechazo del servidor se muestra con su detalle', async () => {
    conInventario()
    vi.spyOn(axiosClient, 'post').mockRejectedValue(rechazo(409, 'No se puede transformar un lote bloqueado'))
    await expect(registrarProcesoApi('ADMINISTRADOR', datos)).rejects.toMatchObject({ codigo: 'CONFLICTO', message: expect.stringContaining('bloqueado') })
  })
})

describe('listarProcesosApi', () => {
  it('une /transformations con el código del lote y conserva la alerta de merma del servidor', async () => {
    vi.spyOn(axiosClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/inventory/admin') return { data: inventario }
      return {
        data: [
          { id: 5, lot_id: 1, stage: 'SECADO', occurred_at: '2026-01-10T12:00:00Z', input_quantity: 100, output_quantity: 80, loss_percent: 20, responsible_name: 'Operador demo',
            loss_alert: { type: 'merma', rule: 'Merma mayor al 15%', cause: 'Entrada 100 kg; salida 80 kg', value_percent: 20 } },
          { id: 6, lot_id: 99, stage: 'SECADO', occurred_at: '2026-01-11T12:00:00Z', input_quantity: 0, output_quantity: 0, loss_percent: null, responsible_name: 'Operador demo', loss_alert: null },
        ],
      }
    })
    const [a, b] = await listarProcesosApi('ADMINISTRADOR')
    expect(a).toMatchObject({ lotCode: 'CAC001', stage: 'SECADO', inputQty: 100, outputQty: 80, shrinkagePercent: 20, responsible: 'Operador demo', date: '2026-01-10' })
    expect(a.alertas).toEqual([{ tipo: 'merma', regla: 'Merma mayor al 15%', causa: 'Entrada 100 kg; salida 80 kg' }])
    expect(b).toMatchObject({ lotCode: 'Lote 99', shrinkagePercent: null, alertas: [] })
  })
})
