import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearMonitor, esperaReintento, LIMITE_ARRANQUE_MS, urlSalud, type EstadoServidor } from './monitorServidor'

describe('urlSalud', () => {
  it('quita el prefijo de la API: /health vive en la raíz del servidor', () => {
    expect(urlSalud('/api/v1')).toBe('/health')
    expect(urlSalud('http://localhost:8000/api/v1')).toBe('http://localhost:8000/health')
    expect(urlSalud('https://kallpa-cacao.onrender.com/api/v1/')).toBe('https://kallpa-cacao.onrender.com/health')
  })
})

describe('esperaReintento', () => {
  it('crece con cada intento y se detiene en 30 s', () => {
    expect([0, 1, 2, 3, 4, 9].map(esperaReintento)).toEqual([2000, 4000, 8000, 15000, 30000, 30000])
  })
})

describe('crearMonitor', () => {
  let estados: EstadoServidor[]
  let navegador: boolean
  beforeEach(() => {
    vi.useFakeTimers()
    estados = []
    navegador = true
  })
  afterEach(() => vi.useRealTimers())

  const monitor = (sondear: () => Promise<boolean>) =>
    crearMonitor({ sondear, navegadorEnLinea: () => navegador, ahora: () => Date.now(), alCambiar: (e) => estados.push(e) })

  it('servidor que responde: pasa de conectando a en línea', async () => {
    const m = monitor(async () => true)
    m.iniciar()
    await vi.runOnlyPendingTimersAsync()
    expect(estados).toEqual(['conectando', 'en_linea'])
    m.detener()
  })

  it('arranque en frío: sigue en conectando, reintenta con retroceso y termina en línea', async () => {
    let llamadas = 0
    const sondear = vi.fn(async () => ++llamadas >= 3)
    const m = monitor(sondear)
    m.iniciar()
    await vi.advanceTimersByTimeAsync(0)
    expect(estados.at(-1)).toBe('conectando')
    await vi.advanceTimersByTimeAsync(2000) // primer reintento
    expect(sondear).toHaveBeenCalledTimes(2)
    expect(estados.at(-1)).toBe('conectando')
    await vi.advanceTimersByTimeAsync(3999)
    expect(sondear).toHaveBeenCalledTimes(2) // aún no toca el segundo (4 s)
    await vi.advanceTimersByTimeAsync(1)
    expect(sondear).toHaveBeenCalledTimes(3)
    expect(estados.at(-1)).toBe('en_linea')
    expect(estados).not.toContain('sin_red')
    m.detener()
  })

  it('si pasa el límite de arranque sin respuesta, dice que el servidor no responde, no que falta la red', async () => {
    const m = monitor(async () => false)
    m.iniciar()
    await vi.advanceTimersByTimeAsync(LIMITE_ARRANQUE_MS + 30_000)
    expect(estados.at(-1)).toBe('no_responde')
    expect(estados).not.toContain('sin_red')
    m.detener()
  })

  it('sin red en el navegador no sondea y muestra sin conexión', async () => {
    navegador = false
    const sondear = vi.fn(async () => true)
    const m = monitor(sondear)
    m.iniciar()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(sondear).not.toHaveBeenCalled()
    expect(estados).toEqual(['sin_red'])
    m.detener()
  })

  it('al volver la red sondea de inmediato', async () => {
    navegador = false
    const m = monitor(async () => true)
    m.iniciar()
    navegador = true
    m.sondearYa()
    await vi.advanceTimersByTimeAsync(0)
    expect(estados.at(-1)).toBe('en_linea')
    m.detener()
  })

  it('un fallo de red en una petición vuelve a comprobar el servidor', async () => {
    let arriba = true
    const m = monitor(async () => arriba)
    m.iniciar()
    await vi.advanceTimersByTimeAsync(0)
    expect(estados.at(-1)).toBe('en_linea')
    arriba = false
    m.sondearYa()
    await vi.advanceTimersByTimeAsync(0)
    expect(estados.at(-1)).toBe('conectando')
    m.detener()
  })

  it('detener cancela los reintentos', async () => {
    const sondear = vi.fn(async () => false)
    const m = monitor(sondear)
    m.iniciar()
    await vi.advanceTimersByTimeAsync(0)
    m.detener()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(sondear).toHaveBeenCalledTimes(1)
  })
})
