import { beforeEach, describe, expect, it } from 'vitest'
import { cambiarEstadoLote } from '@/features/estados/api/estadosDb'
import { guardarRecepcionLocal } from '@/features/recepcion/api/recepcionDb'
import { registrarProcesoLocal } from '@/features/transformacion/api/procesoDb'
import { limpiarDb } from '@/test/limpiarDb'
import { obtenerFichaLocal as obtenerFichaPublica } from './fichaApi'

const admin = { rol: 'ADMINISTRADOR', usuario: 'Admin' } as const

beforeEach(async () => {
  await limpiarDb()
  await guardarRecepcionLocal({ lotCode: 'CAC001', producer: 'Ana Torres Finca Privada', origin: 'Rivera', date: '2026-01-05', quantity: 100, unit: 'kg' })
})

describe('obtenerFichaPublica', () => {
  it('expone solo la lista blanca de campos', async () => {
    const ficha = await obtenerFichaPublica('CAC001')
    expect(Object.keys(ficha ?? {}).sort()).toEqual(['codigo', 'estado', 'etapas', 'fechaRecepcion', 'ofrecible', 'origen'])
  })

  it('no filtra productor, costos ni merma, aunque existan en el registro', async () => {
    await registrarProcesoLocal({
      lotCode: 'CAC001', stage: 'SECADO', inputQty: 50, outputQty: 40, responsible: 'José Privado',
      costoTotalCOP: 1_600_000, precioVentaCOP: 25_000, incidencias: 'nota interna', claveIdempotencia: 'k',
    })
    const texto = JSON.stringify(await obtenerFichaPublica('CAC001')).toLowerCase()
    for (const prohibido of ['ana torres', 'finca privada', 'josé privado', '1600000', '25000', 'costo', 'merma', 'nota interna', 'cop']) {
      expect(texto).not.toContain(prohibido)
    }
  })

  it('pendiente no se ofrece; liberado con existencia sí', async () => {
    expect((await obtenerFichaPublica('CAC001'))?.ofrecible).toBe(false)
    await cambiarEstadoLote({ ...admin, lotCode: 'CAC001', nuevo: 'LIBERADO', motivo: 'Cumple calidad' })
    expect((await obtenerFichaPublica('CAC001'))?.ofrecible).toBe(true)
  })

  it('bloqueado no se ofrece como disponible', async () => {
    await cambiarEstadoLote({ ...admin, lotCode: 'CAC001', nuevo: 'LIBERADO', motivo: 'ok' })
    await cambiarEstadoLote({ ...admin, lotCode: 'CAC001', nuevo: 'BLOQUEADO', motivo: 'Reclamo del comprador' })
    const f = await obtenerFichaPublica('CAC001')
    expect(f?.estado).toBe('BLOQUEADO')
    expect(f?.ofrecible).toBe(false)
  })

  it('liberado sin existencia no se ofrece', async () => {
    await cambiarEstadoLote({ ...admin, lotCode: 'CAC001', nuevo: 'LIBERADO', motivo: 'ok' })
    await registrarProcesoLocal({ lotCode: 'CAC001', stage: 'SECADO', inputQty: 100, outputQty: 90, responsible: 'R', claveIdempotencia: 'k' })
    expect((await obtenerFichaPublica('CAC001'))?.ofrecible).toBe(false)
  })

  it('código inexistente o vacío devuelve null', async () => {
    expect(await obtenerFichaPublica('CAC999')).toBeNull()
    expect(await obtenerFichaPublica('')).toBeNull()
  })
})
