import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { obtenerTrazabilidadApi } from './trazabilidadApi'

afterEach(() => vi.restoreAllMocks())

// Forma armada desde los modelos y services/traceability.py de la rama backend (no se ejecutó la API).
const lote = (o: Record<string, unknown>) => ({
  id: 1, code: 'CAC001', producer_id: 1, product_type: 'raw_cocoa', origin: 'Rivera', received_on: '2026-01-05',
  received_quantity: '100.000', unit: 'kg', available_quantity: '20.000', consumed_quantity: '80.000', status: 'pending', status_reason: null, ...o,
})
const productor = { id: 1, name: 'Productor A', code: 'PROD-A' }
const transformacion = { id: 5, stage: 'Fermentación', occurred_at: '2026-01-10T12:00:00Z', input_quantity: '100.000', unit: 'kg', lot_id: 1 }

const inventario = [
  { id: 1, code: 'CAC001', origin: 'Rivera', available_quantity: 20, unit: 'kg', status: 'pending', received_quantity: 100, consumed_quantity: 80, costs_cop: 0 },
  { id: 10, code: 'CAC001-F', origin: 'Rivera', available_quantity: 80, unit: 'kg', status: 'released', received_quantity: 80, consumed_quantity: 0, costs_cop: 0 },
]

function api(traza: unknown, status = 200) {
  return vi.spyOn(axiosClient, 'get').mockImplementation(async (url: string) => {
    if (url === '/inventory/admin') return { data: inventario }
    if (status !== 200) throw new AxiosError('x', 'ERR', undefined, undefined, { status, data: {} } as AxiosResponse)
    return { data: traza }
  })
}

const base = {
  lot: lote({}), producer: productor, origin_lots: [{ lot: lote({}), producer: productor }],
  upstream_transformations: [], downstream_transformations: [], transformations: [], current_inventory: 20, unit: 'kg',
}

describe('obtenerTrazabilidadApi', () => {
  it('lote crudo sin etapas: origen y recepción, con productor, origen y disponible', async () => {
    const get = api({ ...base, current_inventory: 100 })
    const t = await obtenerTrazabilidadApi('ADMINISTRADOR', 'CAC001')
    expect(get).toHaveBeenCalledWith('/lots/1/traceability')
    expect(t).toMatchObject({ lotCode: 'CAC001', producer: 'Productor A', origin: 'Rivera, Huila', availableQty: 100, status: 'PENDIENTE' })
    expect(t!.steps.map((s) => s.title)).toEqual(['Origen en finca', 'Recepción del lote'])
  })

  it('producto transformado: muestra la etapa con entrada, salida y merma de 20 %', async () => {
    api({
      ...base,
      lot: lote({ id: 10, code: 'CAC001-F', status: 'released' }),
      upstream_transformations: [{ transformation: transformacion, input_lot: lote({}), output_lot: lote({ id: 10, code: 'CAC001-F', received_quantity: '80.000' }) }],
      transformations: [transformacion],
    })
    const t = await obtenerTrazabilidadApi('ADMINISTRADOR', 'CAC001-F')
    const etapa = t!.steps.find((s) => s.title.includes('Fermentación'))!
    expect(etapa.description).toMatch(/100/)
    expect(etapa.description).toMatch(/80/)
    expect(etapa.description).toMatch(/20/)
    expect(etapa.date).toBe('2026-01-10')
    expect(t!.status).toBe('LIBERADO')
  })

  it('lote crudo que ya se transformó: la etapa aparece con la suma de sus salidas', async () => {
    api({
      ...base,
      downstream_transformations: [{
        transformation: transformacion, input_lot: lote({}),
        outputs: [{ lot: lote({ id: 10, code: 'A' }), quantity: '50.000' }, { lot: lote({ id: 11, code: 'B' }), quantity: '30.000' }],
      }],
      transformations: [transformacion],
    })
    const etapa = (await obtenerTrazabilidadApi('ADMINISTRADOR', 'CAC001'))!.steps.find((s) => s.title.includes('Fermentación'))!
    expect(etapa.description).toMatch(/80/)
  })

  it('una etapa repetida en subida y bajada se muestra una sola vez', async () => {
    const item = { transformation: transformacion, input_lot: lote({}), output_lot: lote({ id: 10, code: 'CAC001-F', received_quantity: '80.000' }) }
    api({ ...base, upstream_transformations: [item, item], transformations: [transformacion] })
    const t = await obtenerTrazabilidadApi('ADMINISTRADOR', 'CAC001')
    expect(t!.steps.filter((s) => s.title.includes('Fermentación'))).toHaveLength(1)
  })

  it('mezcla de lotes: conserva el origen y la recepción de cada lote de origen', async () => {
    const otro = lote({ id: 2, code: 'CAC002', origin: 'Campoalegre', received_on: '2026-01-06' })
    api({ ...base, origin_lots: [{ lot: lote({}), producer: productor }, { lot: otro, producer: { ...productor, name: 'Productor B' } }] })
    const t = await obtenerTrazabilidadApi('ADMINISTRADOR', 'CAC001')
    expect(t!.steps.filter((s) => s.title === 'Recepción del lote').map((s) => s.description)).toEqual(
      expect.arrayContaining([expect.stringContaining('CAC001'), expect.stringContaining('CAC002')]),
    )
    expect(t!.steps.filter((s) => s.title === 'Origen en finca')).toHaveLength(2)
  })

  it('lote bloqueado: agrega el estado con su motivo', async () => {
    api({ ...base, lot: lote({ status: 'blocked', status_reason: 'Humedad alta' }) })
    const t = await obtenerTrazabilidadApi('ADMINISTRADOR', 'CAC001')
    expect(t!.status).toBe('BLOQUEADO')
    expect(t!.steps.at(-1)!.description).toContain('Humedad alta')
  })

  it('código que no está en el inventario: null y no consulta la trazabilidad', async () => {
    const get = api(base)
    expect(await obtenerTrazabilidadApi('ADMINISTRADOR', 'CAC999')).toBeNull()
    expect(get).not.toHaveBeenCalledWith(expect.stringContaining('traceability'))
  })

  it('404 de la trazabilidad es null; un 403 sigue siendo error', async () => {
    api(null, 404)
    expect(await obtenerTrazabilidadApi('ADMINISTRADOR', 'CAC001')).toBeNull()
    api(null, 403)
    await expect(obtenerTrazabilidadApi('ADMINISTRADOR', 'CAC001')).rejects.toMatchObject({ codigo: 'PERMISO' })
  })
})
