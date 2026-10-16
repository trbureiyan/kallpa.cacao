import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/dexieDb'
import { limpiarDb } from '@/test/limpiarDb'
import { fijarReloj } from '@/utils/clock'
import { cambiarEstadoLote } from './estadosDb'

const lote = { idempotencyKey: 'k', lotCode: 'CAC001', producer: 'Productor A', origin: 'Rivera', date: '2026-01-01', quantity: 100, unit: 'kg', syncStatus: 'PENDING', status: 'PENDIENTE' } as const

beforeEach(async () => {
  await limpiarDb()
  await db.recepciones.add({ ...lote })
  fijarReloj(() => '2026-01-02T10:00:00.000Z')
})
afterEach(() => fijarReloj(null))

describe('auditoría de solo inserción', () => {
  it('no permite actualizar una entrada', async () => {
    const id = await db.auditLogs.add({ timestamp: 't', user: 'u', action: 'EDICIÓN', fieldChanged: 'x', previousValue: 'a', newValue: 'b', lotCode: 'CAC001' })
    await expect(db.auditLogs.update(id, { newValue: 'z' })).rejects.toThrow()
  })
  it('no permite borrar una entrada', async () => {
    const id = await db.auditLogs.add({ timestamp: 't', user: 'u', action: 'EDICIÓN', fieldChanged: 'x', previousValue: 'a', newValue: 'b', lotCode: 'CAC001' })
    await expect(db.auditLogs.delete(id)).rejects.toThrow()
  })
})

describe('cambiarEstadoLote', () => {
  const admin = { lotCode: 'CAC001', nuevo: 'BLOQUEADO', motivo: 'Reclamo del comprador', rol: 'ADMINISTRADOR', usuario: 'Administrador ASOCACAO' } as const

  it('el operador recibe PERMISO_DENEGADO y no cambia ni audita', async () => {
    await expect(cambiarEstadoLote({ ...admin, rol: 'OPERADOR' })).rejects.toMatchObject({ codigo: 'PERMISO_DENEGADO' })
    expect((await db.recepciones.where('lotCode').equals('CAC001').first())?.status).toBe('PENDIENTE')
    expect(await db.auditLogs.count()).toBe(0)
  })

  it('sin motivo recibe MOTIVO_OBLIGATORIO', async () => {
    await expect(cambiarEstadoLote({ ...admin, motivo: ' ' })).rejects.toMatchObject({ codigo: 'MOTIVO_OBLIGATORIO' })
  })

  it('lote inexistente recibe LOTE_NO_ENCONTRADO', async () => {
    await expect(cambiarEstadoLote({ ...admin, lotCode: 'CAC999' })).rejects.toMatchObject({ codigo: 'LOTE_NO_ENCONTRADO' })
  })

  it('el administrador cambia el estado y deja exactamente una entrada con valor anterior y nuevo', async () => {
    await cambiarEstadoLote(admin)
    expect((await db.recepciones.where('lotCode').equals('CAC001').first())?.status).toBe('BLOQUEADO')
    const logs = await db.auditLogs.toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      timestamp: '2026-01-02T10:00:00.000Z',
      user: 'Administrador ASOCACAO',
      action: 'BLOQUEO',
      previousValue: 'PENDIENTE',
      newValue: 'BLOQUEADO',
      reason: 'Reclamo del comprador',
      lotCode: 'CAC001',
    })
  })

  it('si la auditoría falla, el estado no cambia', async () => {
    fijarReloj(() => {
      throw new Error('reloj roto')
    })
    await expect(cambiarEstadoLote(admin)).rejects.toThrow()
    expect((await db.recepciones.where('lotCode').equals('CAC001').first())?.status).toBe('PENDIENTE')
    expect(await db.auditLogs.count()).toBe(0)
  })
})
