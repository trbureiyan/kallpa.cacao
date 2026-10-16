import { calcularCostoUnitario, calcularMargenVenta, calcularMerma } from '@/utils/calculations'

export interface Indicadores {
  mermaPct: number | null
  costoUnitario: number | null
  margenPct: number | null
}

/** Merma, costo unitario (COP/kg) y margen (%) de una etapa. Null = no calculable con los datos dados. */
export function indicadoresDeProceso(p: {
  inputQty: number
  outputQty: number
  costoTotalCOP?: number
  precioVentaCOP?: number
}): Indicadores {
  const costoUnitario = p.costoTotalCOP === undefined ? null : calcularCostoUnitario(p.costoTotalCOP, p.outputQty)
  const margenPct =
    costoUnitario === null || p.precioVentaCOP === undefined ? null : calcularMargenVenta(p.precioVentaCOP, costoUnitario)
  return { mermaPct: calcularMerma(p.inputQty, p.outputQty), costoUnitario, margenPct }
}
