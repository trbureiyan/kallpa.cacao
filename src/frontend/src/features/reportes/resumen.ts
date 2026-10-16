import type { Movimiento } from '@/db/dexieDb'
import type { EstadoLote } from '@/types/app'
import { calcularCostoUnitario } from '@/utils/calculations'

export interface FilaResumen {
  codigo: string
  origen: string
  recibidoKg: number
  consumidoKg: number
  disponibleKg: number
  estado: EstadoLote
  costoUnitario: number | null
}

/** Resumen por lote derivado del libro; el costo unitario sale de la etapa más reciente con costo. */
export function construirFilas(
  lotes: { lotCode: string; origin: string; status?: EstadoLote }[],
  movimientos: Movimiento[],
  procesos: { lotCode: string; outputQty: number; costoTotalCOP?: number }[],
): FilaResumen[] {
  return lotes.map((l) => {
    const suyos = movimientos.filter((m) => m.lotCode === l.lotCode)
    const recibidoKg = suyos.filter((m) => m.tipo === 'RECIBIDO').reduce((a, m) => a + m.kg, 0)
    const consumidoKg = suyos.filter((m) => m.tipo === 'CONSUMIDO').reduce((a, m) => a + m.kg, 0)
    const ultimaConCosto = [...procesos].reverse().find((p) => p.lotCode === l.lotCode && p.costoTotalCOP !== undefined)
    return {
      codigo: l.lotCode,
      origen: l.origin,
      recibidoKg,
      consumidoKg,
      disponibleKg: recibidoKg - consumidoKg,
      estado: l.status ?? 'PENDIENTE',
      costoUnitario: ultimaConCosto ? calcularCostoUnitario(ultimaConCosto.costoTotalCOP!, ultimaConCosto.outputQty) : null,
    }
  })
}
