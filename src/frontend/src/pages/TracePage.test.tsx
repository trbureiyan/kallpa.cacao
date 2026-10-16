import { afterEach, describe, expect, it } from 'vitest'
import { montar } from '@/test/render'
import { TracePage } from './TracePage'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('TracePage, buscador', () => {
  // .input global va fuera de capa y anula utilidades como pl-9: la lupa se montaba sobre el texto
  it('usa .input-icon para dejar sitio a la lupa', async () => {
    const { contenedor } = await montar(<TracePage />)
    const campo = contenedor.querySelector('.input-icon > input.input')
    expect(campo).not.toBeNull()
    expect(contenedor.querySelector('.pl-9')).toBeNull()
  })
})
