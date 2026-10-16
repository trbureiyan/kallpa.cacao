import { Icon } from '@/components/ui'
import { UMBRAL_MERMA_PCT } from '@/config'
import { calcularMerma, esMermaCritica } from '@/utils/calculations'
import { formatearPct } from '@/utils/formato'

interface ShrinkageAlertCardProps {
  inputQty: number
  outputQty: number
  thresholdPercent?: number
}

export function ShrinkageAlertCard({ inputQty, outputQty, thresholdPercent = UMBRAL_MERMA_PCT }: ShrinkageAlertCardProps) {
  const shrink = calcularMerma(inputQty, outputQty)

  if (shrink === null) {
    return (
      <div className="shrink-card">
        <span className="eyebrow">Control de merma</span>
        <strong>—</strong>
        <div className="shrink-formula">((entrada − salida) / entrada) × 100</div>
        <p className="text-sm text-texto-suave">Ingrese una entrada mayor a 0 kg para calcular la merma.</p>
      </div>
    )
  }

  const isCritical = esMermaCritica(shrink, thresholdPercent)

  return (
    <div className="space-y-4">
      <div className={`shrink-card ${isCritical ? 'critical' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="eyebrow">{isCritical ? 'Alerta de merma' : 'Control de merma'}</span>
          <Icon name="process" />
        </div>
        <strong>{formatearPct(shrink)}</strong>
        <div className="shrink-formula">
          (({inputQty} kg − {outputQty} kg) / {inputQty} kg) × 100
        </div>
        <div className="threshold">
          <span>Umbral permitido</span>
          <b>{formatearPct(thresholdPercent)}</b>
        </div>
        <div className="meter">
          <span style={{ width: `${Math.min(Math.max(shrink, 0) * 4, 100)}%` }} />
        </div>
      </div>

      {isCritical ? (
        <div className="critical-alert" role="alert">
          <Icon name="alert" size={24} />
          <div>
            <strong>Alerta de merma</strong>
            <p>
              Regla: merma mayor a {formatearPct(thresholdPercent)}. Causa: la merma de {formatearPct(shrink)} supera
              el umbral permitido.
            </p>
          </div>
        </div>
      ) : (
        <div className="validation success">
          <Icon name="check" />
          <div>
            <strong>Merma dentro del rango</strong>
            <span>No supera el umbral de {formatearPct(thresholdPercent)}.</span>
          </div>
        </div>
      )}
    </div>
  )
}
