import type { ReactElement } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Monta la interfaz en el DOM de jsdom. */
export async function montar(ui: ReactElement) {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const raiz = createRoot(contenedor)
  await act(async () => raiz.render(<MemoryRouter>{ui}</MemoryRouter>))
  return {
    contenedor,
    limpiar: () => {
      act(() => raiz.unmount())
      contenedor.remove()
    },
  }
}
