import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import { numero } from '@/api/mapeos'

interface EconomiaItemApi {
  output_code: string
  unit_cost_cop: number | string | null
  margin_on_sale_percent: number | string | null
  formula?: string
  cost_policy?: string
}

export interface Economia {
  porCodigo: Record<string, { costoUnitario: number | null; margenPct: number | null }>
  /** Fórmula y política de costos tal como las declara el servidor, para mostrarlas junto a la cifra (RF05) */
  formula: string | null
  politica: string | null
}

/** Costo unitario y margen por lote de salida, calculados por el servidor (solo administrador). */
export async function listarEconomiaApi(): Promise<Economia> {
  let lista: EconomiaItemApi[]
  try {
    lista = (await axiosClient.get<EconomiaItemApi[]>('/economics')).data
  } catch (e) {
    throw traducirErrorApi(e)
  }
  return {
    porCodigo: Object.fromEntries(
      lista.map((i) => [i.output_code, { costoUnitario: numero(i.unit_cost_cop), margenPct: numero(i.margin_on_sale_percent) }]),
    ),
    formula: lista[0]?.formula ?? null,
    politica: lista[0]?.cost_policy ?? null,
  }
}
