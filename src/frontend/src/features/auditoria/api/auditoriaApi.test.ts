import { afterEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { listarAuditoriaApi } from './auditoriaApi'

afterEach(() => vi.restoreAllMocks())

const inventario = [{ id: 1, code: 'CAC001', origin: 'Rivera', received_quantity: 100, consumed_quantity: 0, available_quantity: 100, unit: 'kg', status: 'blocked', costs_cop: 0 }]
const evento = (o: Record<string, unknown>) => ({ id: 1, actor_id: 9, actor_name: 'Administrador demo', actor_username: 'admin', entity_type: 'lot', entity_id: '1', action: 'status_changed', before_value: null, after_value: null, created_at: '2026-01-10T12:00:00Z', ...o })

function conEventos(eventos: unknown[]) {
  vi.spyOn(axiosClient, 'get').mockImplementation(async (url: string) => ({ data: url === '/audit' ? eventos : inventario }))
}

describe('listarAuditoriaApi', () => {
  it('un bloqueo muestra acción, estados traducidos, motivo y código del lote', async () => {
    conEventos([evento({ before_value: { status: 'pending', reason: null }, after_value: { status: 'blocked', reason: 'Humedad alta' } })])
    const [f] = await listarAuditoriaApi()
    expect(f).toMatchObject({
      idLocal: 1, timestamp: '2026-01-10T12:00:00Z', user: 'Administrador demo', action: 'BLOQUEO',
      lotCode: 'CAC001', fieldChanged: 'estado', previousValue: 'PENDIENTE', newValue: 'BLOQUEADO', reason: 'Humedad alta',
    })
  })

  it('una liberación se distingue del bloqueo', async () => {
    conEventos([evento({ before_value: { status: 'blocked' }, after_value: { status: 'released', reason: 'Revisado' } })])
    expect((await listarAuditoriaApi())[0].action).toBe('LIBERACIÓN')
  })

  it('el evento duplicado de producto no se repite en la tabla', async () => {
    conEventos([
      evento({ id: 1, after_value: { status: 'blocked', reason: 'x1' } }),
      evento({ id: 2, entity_type: 'product', entity_id: 'CAC001-AAAAAA', after_value: { status: 'blocked', reason: 'x1' } }),
    ])
    expect(await listarAuditoriaApi()).toHaveLength(1)
  })

  it('transformación y consumo se marcan como PROCESO', async () => {
    conEventos([
      evento({ id: 3, entity_type: 'transformation', entity_id: '5', action: 'created', after_value: { stage: 'SECADO' } }),
      evento({ id: 4, action: 'inventory_consumed', before_value: { available_quantity: 100 }, after_value: { available_quantity: 0 } }),
    ])
    const filas = await listarAuditoriaApi()
    expect(filas.map((f) => f.action)).toEqual(['PROCESO', 'PROCESO'])
    expect(filas[1]).toMatchObject({ lotCode: 'CAC001', previousValue: 'available_quantity: 100', newValue: 'available_quantity: 0' })
  })

  it('una recepción sin valor anterior muestra N/A', async () => {
    conEventos([evento({ action: 'received', after_value: { code: 'CAC001', quantity_kg: '100.000' } })])
    const [f] = await listarAuditoriaApi()
    expect(f).toMatchObject({ action: 'EDICIÓN', fieldChanged: 'recepción', previousValue: 'N/A' })
    expect(f.newValue).toContain('CAC001')
  })

  it('un lote que no está en el inventario se muestra por su id, no vacío', async () => {
    conEventos([evento({ entity_id: '77', action: 'received' })])
    expect((await listarAuditoriaApi())[0].lotCode).toBe('Lote 77')
  })

  it('eventos de usuarios se rotulan como usuario', async () => {
    conEventos([evento({ entity_type: 'user', entity_id: '3', action: 'created', after_value: { username: 'a@b.co', role: 'operator' } })])
    expect((await listarAuditoriaApi())[0]).toMatchObject({ lotCode: 'Usuario 3', fieldChanged: 'usuario' })
  })
})
