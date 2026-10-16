import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { listarAlertasApi } from '@/features/alertas/api/alertasApi'
import { listarEconomiaApi } from './economiaApi'

afterEach(() => vi.restoreAllMocks())
const rechazo = (status: number) => new AxiosError('x', 'ERR', undefined, undefined, { status, data: {} } as AxiosResponse)

describe('listarEconomiaApi', () => {
  it('indexa costo y margen por código de salida y conserva fórmula y política del servidor', async () => {
    const get = vi.spyOn(axiosClient, 'get').mockResolvedValue({
      data: [
        { output_code: 'CAC001-A', unit_cost_cop: 20000, margin_on_sale_percent: 20, formula: 'F', cost_policy: 'P', included_costs: ['Costos de procesamiento de la etapa'] },
        { output_code: 'CAC002-B', unit_cost_cop: null, margin_on_sale_percent: null, formula: 'F', cost_policy: 'P', included_costs: [] },
      ],
    })
    const e = await listarEconomiaApi()
    expect(get).toHaveBeenCalledWith('/economics')
    expect(e.porCodigo['CAC001-A']).toEqual({ costoUnitario: 20000, margenPct: 20 })
    expect(e.porCodigo['CAC002-B']).toEqual({ costoUnitario: null, margenPct: null })
    expect(e).toMatchObject({ formula: 'F', politica: 'P' })
  })

  it('sin registros devuelve vacío y sin fórmula', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: [] })
    expect(await listarEconomiaApi()).toEqual({ porCodigo: {}, formula: null, politica: null })
  })

  it('un 403 llega como error de permiso', async () => {
    vi.spyOn(axiosClient, 'get').mockRejectedValue(rechazo(403))
    await expect(listarEconomiaApi()).rejects.toMatchObject({ codigo: 'PERMISO' })
  })
})

describe('listarAlertasApi', () => {
  it('traduce las alertas con regla y causa, sin inventar tipos', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({
      data: [
        { type: 'merma', severity: 'warning', entity: 'CAC001-A', rule: 'Merma mayor al 15%', cause: 'Entrada 100 kg; salida 80 kg', value_percent: 20 },
        { type: 'retraso', severity: 'warning', entity: 'CAC002', rule: 'r', cause: 'c' },
      ],
    })
    const a = await listarAlertasApi()
    expect(a[0]).toEqual({ tipo: 'merma', entidad: 'CAC001-A', regla: 'Merma mayor al 15%', causa: 'Entrada 100 kg; salida 80 kg' })
    expect(a[1].tipo).toBe('retraso')
  })

  it('un tipo fuera del enum cerrado es error de contrato, no se muestra', async () => {
    vi.spyOn(axiosClient, 'get').mockResolvedValue({ data: [{ type: 'otra', entity: 'x', rule: 'r', cause: 'c' }] })
    await expect(listarAlertasApi()).rejects.toMatchObject({ codigo: 'CONTRATO' })
  })

  it('un 403 llega como error de permiso', async () => {
    vi.spyOn(axiosClient, 'get').mockRejectedValue(rechazo(403))
    await expect(listarAlertasApi()).rejects.toMatchObject({ codigo: 'PERMISO' })
  })
})
