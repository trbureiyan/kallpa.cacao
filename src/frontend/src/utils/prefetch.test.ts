import { describe, expect, it, beforeEach } from 'vitest'
import { puedePrefetch, prefetchRuta, _rutasPrefetcheadasParaTest, type NavigatorConRed } from './prefetch'

describe('puedePrefetch (respeto de red limitada y saveData)', () => {
  it('permite prefetch cuando no hay restricciones ni NetworkInformation API', () => {
    expect(puedePrefetch(undefined)).toBe(true)
    expect(puedePrefetch({} as NavigatorConRed)).toBe(true)
  })

  it('rechaza prefetch si el usuario tiene activado saveData', () => {
    const nav: NavigatorConRed = {
      connection: {
        saveData: true,
        effectiveType: '4g',
      },
    }
    expect(puedePrefetch(nav)).toBe(false)
  })

  it('rechaza prefetch si la red es 2g o slow-2g', () => {
    const nav2g: NavigatorConRed = {
      connection: {
        saveData: false,
        effectiveType: '2g',
      },
    }
    expect(puedePrefetch(nav2g)).toBe(false)

    const navSlow2g: NavigatorConRed = {
      connection: {
        saveData: false,
        effectiveType: 'slow-2g',
      },
    }
    expect(puedePrefetch(navSlow2g)).toBe(false)
  })

  it('permite prefetch en conexiones 3g, 4g o sin saveData', () => {
    const nav4g: NavigatorConRed = {
      connection: {
        saveData: false,
        effectiveType: '4g',
      },
    }
    expect(puedePrefetch(nav4g)).toBe(true)

    const nav3g: NavigatorConRed = {
      connection: {
        saveData: false,
        effectiveType: '3g',
      },
    }
    expect(puedePrefetch(nav3g)).toBe(true)
  })
})

describe('prefetchRuta', () => {
  beforeEach(() => {
    _rutasPrefetcheadasParaTest.clear()
  })

  it('registra la ruta en el set de prefetcheadas para no duplicar peticiones', () => {
    const cargadorMock = () => Promise.resolve({})
    expect(prefetchRuta('/recepcion', { cargador: cargadorMock, nav: undefined })).toBe(true)
    // Segundo intento no debe recargar
    expect(prefetchRuta('/recepcion', { cargador: cargadorMock, nav: undefined })).toBe(false)
  })

  it('no ejecuta el cargador si saveData está activo', () => {
    let cargado = false
    const cargadorMock = () => {
      cargado = true
      return Promise.resolve({})
    }
    const navConSaveData: NavigatorConRed = { connection: { saveData: true } }
    const resultado = prefetchRuta('/transformacion', { cargador: cargadorMock, nav: navConSaveData })

    expect(resultado).toBe(false)
    expect(cargado).toBe(false)
  })
})
