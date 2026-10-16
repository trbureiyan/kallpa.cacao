import { Icon } from '@/components/ui'

interface ShrinkageAlertCardProps {
  inputQty: number
  outputQty: number
  thresholdPercent?: number
}

export function ShrinkageAlertCard({
  inputQty,
  outputQty,
  thresholdPercent = 15,
}: ShrinkageAlertCardProps) {
  const shrink = inputQty > 0 ? ((inputQty - outputQty) / inputQty) * 100 : 0
  const isCritical = shrink > thresholdPercent

  return (
    <div className="space-y-4">
      <div className={`shrink-card ${isCritical ? 'critical' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="eyebrow">{isCritical ? 'Alerta de Merma' : 'Control de Merma'}</span>
          <Icon name="process" />
        </div>
        <strong>{shrink.toFixed(1).replace('.', ',')}%</strong>
        <div className="shrink-formula">
          (({inputQty} − {outputQty}) / {inputQty}) × 100
        </div>
        <div className="threshold">
          <span>Umbral permitido</span>
          <b>{thresholdPercent}%</b>
        </div>
        <div className="meter">
          <span style={{ width: `${Math.min(Math.max(shrink, 0) * 4, 100)}%` }} />
        </div>
      </div>

      {isCritical ? (
        <div className="critical-alert">
          <Icon name="alert" size={24} />
          <div>
            <strong>Alerta crítica de merma</strong>
            <p>
              La merma del {shrink.toFixed(1)}% supera el umbral máximo del {thresholdPercent}%. Se registrará un evento en auditoría.
            </p>
          </div>
        </div>
      ) : (
        <div className="validation success">
          <Icon name="check" />
          <div>
            <strong>Merma dentro del rango</strong>
            <span>El proceso cumple con el umbral de merma configurado.</span>
          </div>
        </div>
      )}
    </div>
  )
}