import { beforeEach, describe, expect, it } from 'vitest'
import { limpiarDb } from '@/test/limpiarDb'
import { ErrorDominio } from '@/utils/errores'
import { consumirExistencia, disponibleKg, registrarMovimientoRecibido } from './inventarioDb'

beforeEach(limpiarDb)

describe('libro de movimientos', () => {
  it('lo recibido es el disponible', async () => {
    await registrarMovimientoRecibido('CAC001', 100)
    expect(await disponibleKg('CAC001')).toBe(100)
  })

  it('consumir descuenta del disponible', async () => {
    await registrarMovimientoRecibido('CAC001', 100)
    await consumirExistencia({ lotCode: 'CAC001', kg: 30, claveIdempotencia: 'a' })
    expect(await disponibleKg('CAC001')).toBe(70)
  })

  it('rechaza consumir más que la existencia y conserva el disponible', async () => {
    await registrarMovimientoRecibido('CAC001', 100)
    await consumirExistencia({ lotCode: 'CAC001', kg: 30, claveIdempotencia: 'a' })
    await expect(consumirExistencia({ lotCode: 'CAC001', kg: 120, claveIdempotencia: 'b' })).rejects.toMatchObject({
      codigo: 'EXISTENCIA_INSUFICIENTE',
    })
    expect(await disponibleKg('CAC001')).toBe(70)
  })

  it('reenviar la misma clave no vuelve a consumir', async () => {
    await registrarMovimientoRecibido('CAC001', 100)
    const primero = await consumirExistencia({ lotCode: 'CAC001', kg: 30, claveIdempotencia: 'a' })
    const reenvio = await consumirExistencia({ lotCode: 'CAC001', kg: 30, claveIdempotencia: 'a' })
    expect(primero.aplicado).toBe(true)
    expect(reenvio.aplicado).toBe(false)
    expect(await disponibleKg('CAC001')).toBe(70)
  })

  it('dos consumos simultáneos no sobrepasan la existencia', async () => {
    await registrarMovimientoRecibido('CAC001', 100)
    const resultados = await Promise.allSettled([
      consumirExistencia({ lotCode: 'CAC001', kg: 60, claveIdempotencia: 'a' }),
      consumirExistencia({ lotCode: 'CAC001', kg: 60, claveIdempotencia: 'b' }),
    ])
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const rechazado = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult
    expect(rechazado.reason).toBeInstanceOf(ErrorDominio)
    expect(await disponibleKg('CAC001')).toBe(40)
  })

  it('un lote sin movimientos tiene 0 kg disponibles', async () => {
    expect(await disponibleKg('NOEXISTE')).toBe(0)
  })
})
