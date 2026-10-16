import { act } from 'react'
import { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axiosClient } from '@/api/axiosClient'
import { db } from '@/db/dexieDb'
import { limpiarDb } from '@/test/limpiarDb'
import { montar } from '@/test/render'
import { encolarRecepcionApi } from '../api/recepcionDb'
import { ErroresSincronizacion } from './ErroresSincronizacion'

const datos = { farmId: 3, farmName: 'Finca C', date: '2026-01-05', quantity: 12.5, purchaseTotalCop: 0 }

async function conError(motivo: string) {
  const l = await encolarRecepcionApi(datos)
  await db.recepciones.update(l.idLocal!, { syncStatus: 'ERROR', errorMessage: motivo })
  return l
}

const boton = (c: HTMLElement, texto: string) =>
  [...c.querySelectorAll('button')].find((b) => b.textContent?.includes(texto)) as HTMLButtonElement
const esperar = async () => {
  for (let i = 0; i < 20; i++) await act(async () => new Promise((r) => setTimeout(r, 5)))
}

beforeEach(limpiarDb)
afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('ErroresSincronizacion', () => {
  it('sin errores no ocupa lugar en la página', async () => {
    const { contenedor } = await montar(<ErroresSincronizacion modo="api" />)
    await esperar()
    expect(contenedor.textContent).toBe('')
  })

  it('lista cada recepción con error con su motivo y las acciones', async () => {
    await conError('Finca no encontrada')
    const { contenedor } = await montar(<ErroresSincronizacion modo="api" />)
    await esperar()
    expect(contenedor.querySelector('#errores-sincronizacion')).not.toBeNull()
    expect(contenedor.textContent).toContain('Finca no encontrada')
    expect(contenedor.textContent).toContain('12,50 kg')
    expect(boton(contenedor, 'Reintentar')).toBeTruthy()
    expect(boton(contenedor, 'Descartar')).toBeTruthy()
  })

  it('una fila heredada sin finca no aparece como error', async () => {
    await db.recepciones.add({ idempotencyKey: 'k', lotCode: 'CAC001', producer: 'A', origin: 'Rivera', date: '2026-01-01', quantity: 100, unit: 'kg', syncStatus: 'ERROR', errorMessage: 'sin finca' })
    const { contenedor } = await montar(<ErroresSincronizacion modo="api" />)
    await esperar()
    expect(contenedor.textContent).toBe('')
  })

  it('Reintentar vuelve a enviar y, si el servidor la acepta, desaparece de la lista', async () => {
    await conError('Error temporal')
    const post = vi.spyOn(axiosClient, 'post').mockResolvedValue({ status: 201, data: { lot_code: 'CAC011' } })
    const { contenedor } = await montar(<ErroresSincronizacion modo="api" />)
    await esperar()
    await act(async () => boton(contenedor, 'Reintentar').click())
    await esperar()
    expect(post).toHaveBeenCalledTimes(1)
    expect(contenedor.textContent).toBe('')
  })

  it('Reintentar con un nuevo rechazo muestra el motivo nuevo', async () => {
    await conError('viejo')
    vi.spyOn(axiosClient, 'post').mockRejectedValue(
      new AxiosError('x', 'ERR', undefined, undefined, { status: 404, data: { detail: 'Finca no encontrada' } } as AxiosResponse),
    )
    const { contenedor } = await montar(<ErroresSincronizacion modo="api" />)
    await esperar()
    await act(async () => boton(contenedor, 'Reintentar').click())
    await esperar()
    expect(contenedor.textContent).toContain('Finca no encontrada')
    expect(contenedor.textContent).not.toContain('viejo')
  })

  it('Descartar pide confirmación y no cambia nada si se cancela', async () => {
    const l = await conError('Finca no encontrada')
    const { contenedor } = await montar(<ErroresSincronizacion modo="api" />)
    await esperar()
    await act(async () => boton(contenedor, 'Descartar').click())
    expect(contenedor.textContent).toContain('¿Descartar esta recepción?')
    await act(async () => boton(contenedor, 'Cancelar').click())
    await esperar()
    expect((await db.recepciones.get(l.idLocal!))?.syncStatus).toBe('ERROR')
  })

  it('Descartar confirmado la marca como descartada sin borrarla', async () => {
    const l = await conError('Finca no encontrada')
    const { contenedor } = await montar(<ErroresSincronizacion modo="api" />)
    await esperar()
    await act(async () => boton(contenedor, 'Descartar').click())
    await act(async () => boton(contenedor, 'Sí, descartar').click())
    await esperar()
    expect(await db.recepciones.count()).toBe(1)
    expect((await db.recepciones.get(l.idLocal!))?.syncStatus).toBe('DISCARDED')
    expect(contenedor.textContent).toBe('')
  })
})
