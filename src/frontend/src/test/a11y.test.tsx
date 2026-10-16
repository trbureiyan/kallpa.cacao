import { axe } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import { afterEach, describe, expect, it } from 'vitest'
import { ChipEstado, IndicadorConexion, SelloLote } from '@/components/ui/marca'
import { ModalCambioEstado } from '@/features/estados/components/ModalCambioEstado'
import { LoginPage } from '@/pages/LoginPage'
import { montar } from './render'

expect.extend(matchers)

let limpiar: (() => void) | undefined
afterEach(() => limpiar?.())

// axe en jsdom revisa estructura, nombres y roles; el contraste se verifica en tokens.test.ts
describe('accesibilidad (axe)', () => {
  it('componentes de marca', async () => {
    const m = await montar(
      <main>
        <ChipEstado estado="BLOQUEADO" />
        <SelloLote codigo="CAC001" />
        <IndicadorConexion estado="pendiente" pendientes={2} />
      </main>,
    )
    limpiar = m.limpiar
    expect(await axe(m.contenedor)).toHaveNoViolations()
  })

  it('login', async () => {
    const m = await montar(<LoginPage />)
    limpiar = m.limpiar
    expect(await axe(m.contenedor)).toHaveNoViolations()
  })

  it('modal de cambio de estado: es un <dialog> nativo abierto, con nombre', async () => {
    const m = await montar(
      <main>
        <ModalCambioEstado lotes={['CAC001']} loteInicial="CAC001" nuevoInicial="BLOQUEADO" onClose={() => {}} onDone={() => {}} />
      </main>,
    )
    limpiar = m.limpiar
    const dialogo = m.contenedor.querySelector('dialog')
    expect(dialogo).not.toBeNull()
    expect(dialogo?.hasAttribute('open')).toBe(true)
    expect(dialogo?.getAttribute('aria-labelledby')).toBe('titulo-cambio-estado')
    expect(await axe(m.contenedor)).toHaveNoViolations()
  })

  it('Esc en el modal (evento cancel) lo cierra sin confirmar nada', async () => {
    let cerrado = 0
    const m = await montar(
      <ModalCambioEstado lotes={['CAC001']} loteInicial="CAC001" nuevoInicial="BLOQUEADO" onClose={() => cerrado++} onDone={() => {}} />,
    )
    limpiar = m.limpiar
    m.contenedor.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }))
    expect(cerrado).toBe(1)
  })
})
