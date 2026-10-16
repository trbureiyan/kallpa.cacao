import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/dexieDb'
import { cambiarEstadoLote } from '@/features/estados/api/estadosDb'
import { guardarRecepcionLocal } from '@/features/recepcion/api/recepcionDb'
import { registrarProcesoLocal } from '@/features/transformacion/api/procesoDb'
import { limpiarDb } from '@/test/limpiarDb'
import { fijarReloj } from '@/utils/clock'
import { obtenerTrazabilidadLote } from './trazabilidadDb'

const proceso = (stage: string, inputQty: number, outputQty: number, clave: string) => ({
  lotCode: 'CAC001',
  stage,
  inputQty,
  outputQty,
  responsible: 'José Rivera',
  costoTotalCOP: 100_000,
  claveIdempotencia: clave,
})

beforeEach(async () => {
  fijarReloj(null)
  await limpiarDb()
  await guardarRecepcionLocal({ lotCode: 'CAC001', producer: 'Productor A', origin: 'Rivera', date: '2026-01-05', quantity: 100, unit: 'kg' })
})

describe('obtenerTrazabilidadLote', () => {
  it('lista origen, recepción y cada transformación en orden', async () => {
    fijarReloj(() => '2026-01-06T10:00:00.000Z')
    await registrarProcesoLocal(proceso('FERMENTACION', 40, 35, 'a'))
    fijarReloj(() => '2026-01-08T10:00:00.000Z')
    await registrarProcesoLocal(proceso('SECADO', 30, 25, 'b'))
    const t = await obtenerTrazabilidadLote('CAC001')
    expect(t?.steps.map((s) => s.title)).toEqual([
      'Origen en finca',
      'Recepción del lote',
      'Transformación (FERMENTACION)',
      'Transformación (SECADO)',
    ])
    expect(t?.availableQty).toBe(30)
  })

  it('un bloqueo aparece con su motivo', async () => {
    fijarReloj(() => '2026-01-09T10:00:00.000Z')
    await cambiarEstadoLote({ lotCode: 'CAC001', nuevo: 'BLOQUEADO', motivo: 'Reclamo del comprador', rol: 'ADMINISTRADOR', usuario: 'Admin' })
    const t = await obtenerTrazabilidadLote('CAC001')
    const ultimo = t?.steps.at(-1)
    expect(ultimo?.title).toBe('Estado: BLOQUEADO')
    expect(ultimo?.description).toContain('Reclamo del comprador')
    expect(t?.status).toBe('BLOQUEADO')
  })

  it('un código inexistente devuelve null', async () => {
    expect(await obtenerTrazabilidadLote('CAC999')).toBeNull()
  })

  it('consulta de un lote entre 100 lotes sintéticos en menos de 3 segundos', async () => {
    const lotes = Array.from({ length: 100 }, (_, i) => `CAC${String(i + 100).padStart(3, '0')}`)
    await db.recepciones.bulkAdd(
      lotes.map((lotCode) => ({ idempotencyKey: lotCode, lotCode, producer: 'P', origin: 'Rivera', date: '2026-01-01', quantity: 100, unit: 'kg', syncStatus: 'SYNCED' as const, status: 'PENDIENTE' as const })),
    )
    await db.movimientos.bulkAdd(lotes.map((lotCode) => ({ lotCode, tipo: 'RECIBIDO' as const, kg: 100, fecha: '2026-01-01' })))
    await db.procesos.bulkAdd(
      lotes.flatMap((lotCode) =>
        ['FERMENTACION', 'SECADO', 'SELECCION'].map((stage) => ({ lotCode, stage, inputQty: 10, outputQty: 9, shrinkagePercent: 10, responsible: 'R', date: '2026-01-02' })),
      ),
    )
    const inicio = performance.now()
    const t = await obtenerTrazabilidadLote('CAC150')
    const ms = performance.now() - inicio
    console.log(`[medición] trazabilidad sobre 100 lotes y 300 procesos: ${ms.toFixed(1)} ms (vitest/jsdom/fake-indexeddb)`)
    expect(t?.steps).toHaveLength(5)
    expect(ms).toBeLessThan(3000)
  })
})
