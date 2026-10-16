import { formatearCOP, formatearPct } from '@/utils/formato'
import { indicadoresDeProceso } from './reglas'

interface Props {
  inputQty: number
  outputQty: number
  costoTotalCOP?: number
  precioVentaCOP?: number
}

// Muestra siempre fórmula, unidades y supuestos junto a la cifra (RF05, RF12).
export function IndicadoresEconomicos(props: Props) {
  const { costoUnitario, margenPct } = indicadoresDeProceso(props)

  return (
    <div className="card form-card">
      <span className="eyebrow">RF05 · RF12 · Indicadores económicos</span>

      <div className="economy-card">
        <span>Costo unitario</span>
        <strong>{costoUnitario === null ? '—' : `${formatearCOP(costoUnitario)}/kg`}</strong>
        <small>Fórmula: costo total de la etapa (COP) / kg de salida vendible</small>
        {costoUnitario === null && (
          <small>No calculable: ingrese el costo total y una salida vendible mayor a 0 kg.</small>
        )}
      </div>

      <div className="economy-card">
        <span>Margen sobre venta</span>
        <strong>{margenPct === null ? '—' : formatearPct(margenPct)}</strong>
        <small>Fórmula: (precio − costo unitario) / precio × 100, con precio en COP/kg</small>
        {margenPct === null && <small>No calculable: ingrese el precio de venta hipotético (mayor a 0 COP/kg).</small>}
      </div>

      <p className="text-xs text-slate-500">
        Supuestos: el costo total incluye únicamente los costos de esta etapa que usted ingresó (por ejemplo mano de
        obra, energía e insumos); no incluye el costo del cacao recibido. El precio es hipotético.
      </p>
    </div>
  )
}
