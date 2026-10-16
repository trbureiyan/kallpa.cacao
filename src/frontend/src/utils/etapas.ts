// Nombres visibles de las etapas; el valor guardado sigue siendo el código.
export const ETAPAS: Record<string, string> = {
  FERMENTACION: 'Fermentación',
  SECADO: 'Secado',
  SELECCION: 'Selección y empaque',
}

export const nombreEtapa = (codigo: string): string => ETAPAS[codigo] ?? codigo
