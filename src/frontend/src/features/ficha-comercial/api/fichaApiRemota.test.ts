import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { limpiarDb } from '@/test/limpiarDb'
import { guardarRecepcionLocal } from '@/features/recepcion/api/recepcionDb'
import { obtenerFichaPublica } from './fichaApi'

const producto = {
  code: 'CAC001', product_type: 'raw_cocoa', stage: 'recepcion', occurred_at: '2026-01-05T00:00:00Z', output_quantity: 100, unit: 'kg',
  status: 'released', availability: 'available', status_reason: null, origin: 'Rivera', received_on: '2026-01-05',
}
const linea = { code: 'CAC001', product_type: 'raw_cocoa', status: 'released', availability: 'available', origin: 'Rivera', timeline: [
  { kind: 'reception', lot_code: 'CAC001', origin: 'Rivera', date: '2026-01-05', quantity: 100, unit: 'kg' },
  { kind: 'transformation', stage: 'SECADO', date: '2026-01-10T12:00:00Z', input_quantity: 100, output_code: 'CAC001-A', output_quantity: 80, unit: 'kg' },
] }
const rechazo = (status: number) => new AxiosError('x', 'ERR', undefined, undefined, { status, data: { detail: 'x' } } as AxiosResponse)

function api(p: unknown = producto, t: unknown = linea) {
  return vi.spyOn(axiosClient, 'get').mockImplementation(async (url: string) => ({ data: url.endsWith('/traceability') ? t : p }))
}

beforeEach(limpiarDb)
afterEach(() => vi.restoreAllMocks())

describe('obtenerFichaPublica (API primero)', () => {
  it('mapea la ficha del servidor a la lista blanca y trae las etapas de la línea pública', async () => {
    const get = api()
    const f = await obtenerFichaPublica('CAC001')
    expect(get).toHaveBeenCalledWith('/public/products/CAC001')
    expect(f).toEqual({
      codigo: 'CAC001', origen: 'Rivera, Huila, Colombia', fechaRecepcion: '2026-01-05', estado: 'LIBERADO', ofrecible: true,
      etapas: [{ etapa: 'Secado', fecha: '2026-01-10' }],
    })
  })

  it('el código se escapa en la URL', async () => {
    const get = api()
    await obtenerFichaPublica('CAC 001/../x')
    expect(get.mock.calls[0][0]).toBe('/public/products/CAC%20001%2F..%2Fx')
  })

  it('bloqueado o pendiente no se ofrece, aunque el servidor traiga existencia', async () => {
    api({ ...producto, status: 'blocked', availability: 'not_available', status_reason: 'Reclamo' })
    expect(await obtenerFichaPublica('CAC001')).toMatchObject({ estado: 'BLOQUEADO', ofrecible: false })
  })

  it('si el servidor manda campos de más, no pasan a la ficha', async () => {
    api({ ...producto, costs_cop: 1_600_000, producer: 'Ana Torres', contact: '300' })
    const texto = JSON.stringify(await obtenerFichaPublica('CAC001')).toLowerCase()
    for (const prohibido of ['1600000', 'ana torres', '300', 'costs']) expect(texto).not.toContain(prohibido)
  })

  it('404 es null (lote no encontrado)', async () => {
    vi.spyOn(axiosClient, 'get').mockRejectedValue(rechazo(404))
    expect(await obtenerFichaPublica('CAC999')).toBeNull()
  })

  it('si falla la línea pública, la ficha se muestra sin etapas', async () => {
    vi.spyOn(axiosClient, 'get').mockImplementation(async (url: string) => {
      if (url.endsWith('/traceability')) throw rechazo(500)
      return { data: producto }
    })
    expect((await obtenerFichaPublica('CAC001'))?.etapas).toEqual([])
  })

  it('sin red y con modo local permitido usa Dexie', async () => {
    await guardarRecepcionLocal({ lotCode: 'CAC001', producer: 'A', origin: 'Algeciras', date: '2026-01-05', quantity: 10, unit: 'kg' })
    vi.spyOn(axiosClient, 'get').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    expect((await obtenerFichaPublica('CAC001', { permitirLocal: true }))?.origen).toContain('Algeciras')
  })

  it('sin red y sin modo local explica el problema en vez de decir "no encontrado"', async () => {
    vi.spyOn(axiosClient, 'get').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    await expect(obtenerFichaPublica('CAC001', { permitirLocal: false })).rejects.toMatchObject({ codigo: 'SIN_RED' })
  })

  it('un código vacío es null y no llama a la API', async () => {
    const get = api()
    expect(await obtenerFichaPublica('  ')).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })
})
