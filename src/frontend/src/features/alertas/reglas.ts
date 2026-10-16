import { DIAS_RETRASO, UMBRAL_MERMA_PCT } from '@/config'
import { esMermaCritica } from '@/utils/calculations'
import { formatearPct } from '@/utils/formato'

export type TipoAlerta = 'merma' | 'registro_incompleto' | 'retraso' | 'costo'

export interface Alerta {
  tipo: TipoAlerta
  regla: string
  causa: string
}

interface EntradaAlertas {
  mermaPct: number | null
  costoUnitario: number | null
  camposFaltantes: string[]
  diasSinAvance?: number
}

/** Campos obligatorios para considerar completo el registro de una etapa. */
export function camposFaltantes(p: { responsible: string; costoTotalCOP?: number }): string[] {
  const faltan: string[] = []
  if (!p.responsible.trim()) faltan.push('responsable')
  if (p.costoTotalCOP === undefined || !Number.isFinite(p.costoTotalCOP)) faltan.push('costo total de la etapa')
  return faltan
}

/** Cada alerta explica su regla y su causa (RF04). Los umbrales son configurables. */
export function alertasDeProceso(
  p: EntradaAlertas,
  umbrales: { mermaPct?: number; diasRetraso?: number } = {},
): Alerta[] {
  const umbralMerma = umbrales.mermaPct ?? UMBRAL_MERMA_PCT
  const umbralDias = umbrales.diasRetraso ?? DIAS_RETRASO
  const alertas: Alerta[] = []

  if (p.mermaPct !== null && esMermaCritica(p.mermaPct, umbralMerma)) {
    alertas.push({
      tipo: 'merma',
      regla: `Merma mayor a ${formatearPct(umbralMerma)}`,
      causa: `La merma de la etapa fue ${formatearPct(p.mermaPct)}, por encima del umbral permitido.`,
    })
  }
  if (p.costoUnitario === null) {
    alertas.push({
      tipo: 'costo',
      regla: 'El costo unitario debe poder calcularse',
      causa: 'Falta el costo total o la salida vendible es 0 kg, así que no se puede dividir el costo.',
    })
  }
  if (p.camposFaltantes.length > 0) {
    alertas.push({
      tipo: 'registro_incompleto',
      regla: 'Todos los campos obligatorios deben estar completos',
      causa: `Falta: ${p.camposFaltantes.join(', ')}.`,
    })
  }
  if (p.diasSinAvance !== undefined && p.diasSinAvance > umbralDias) {
    alertas.push({
      tipo: 'retraso',
      regla: `Más de ${umbralDias} días sin avance entre etapas`,
      causa: `El lote lleva ${p.diasSinAvance} días sin registrar una nueva etapa.`,
    })
  }
  return alertas
}
