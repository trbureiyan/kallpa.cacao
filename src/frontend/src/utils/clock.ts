// Hora única del sistema; las pruebas la fijan con fijarReloj.
let override: (() => string) | null = null

export const ahoraISO = (): string => (override ? override() : new Date().toISOString())

export function fijarReloj(fn: (() => string) | null): void {
  override = fn
}
