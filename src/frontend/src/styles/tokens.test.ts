import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Lee tokens.css tal cual y resuelve cadenas var(--x) hasta un hex.
const css = readFileSync('src/styles/tokens.css', 'utf8')
const decl = new Map<string, string>()
for (const m of css.matchAll(/(--[\w-]+):\s*([^;]+);/g)) decl.set(m[1], m[2].trim())

function resolver(nombre: string): string {
  let v = decl.get(nombre)
  while (v?.startsWith('var(')) v = decl.get(v.slice(4, -1).trim())
  if (!v) throw new Error(`Token sin resolver: ${nombre}`)
  return v
}

function luminancia(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(resolver(a)), luminancia(resolver(b))].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// [texto, fondo, mínimo WCAG]. 4.5 texto normal, 3 componentes de interfaz.
const pares: [string, string, number][] = [
  ['--color-texto', '--color-fondo', 4.5],
  ['--color-texto-suave', '--color-fondo', 4.5],
  ['--color-texto-tenue', '--color-fondo', 4.5],
  ['--color-texto-tenue', '--color-superficie', 4.5],
  ['--color-texto-sobre-acento', '--color-acento', 4.5],
  ['--color-acento', '--color-fondo', 4.5],
  ['--color-acento-suave-texto', '--color-acento-suave', 4.5],
  ['--color-pendiente', '--color-pendiente-fondo', 4.5],
  ['--color-liberado', '--color-liberado-fondo', 4.5],
  ['--color-bloqueado', '--color-bloqueado-fondo', 4.5],
  ['--color-sync-sin-red', '--color-fondo', 4.5],
  ['--color-borde-fuerte', '--color-fondo', 3],
  ['--color-foco', '--color-fondo', 3],
]

describe('tokens de marca: contraste WCAG 2.x', () => {
  it.each(pares)('%s sobre %s >= %s', (fg, bg, minimo) => {
    expect(contraste(fg, bg)).toBeGreaterThanOrEqual(minimo)
  })

  it('el texto sobre fondo suave de acento cumple WCAG AA', () => {
    expect(contraste('--color-acento-suave-texto', '--color-acento-suave')).toBeGreaterThanOrEqual(4.5)
  })
})
