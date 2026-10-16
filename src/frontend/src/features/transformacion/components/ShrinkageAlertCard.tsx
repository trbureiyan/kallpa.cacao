import { Icon } from '@/components/ui'
import { formatoKg, formatoPorcentaje } from '@/shared/formato'
import type { TransformacionResultado } from '@/api/tipos'

// Muestra lo que calculó el servidor (merma, umbral y alerta). El cliente no vuelve a calcular nada.
export function ShrinkageAlertCard({ resultado }: { resultado: TransformacionResultado | null }) {
  if (!resultado) {
    return (
      <div className="shrink-card">
        <span className="eyebrow">Control de merma</span>
        <p className="text-sm text-slate-500 mt-2">
          Al registrar la etapa, el servidor calcula la merma con la fórmula (entrada − salida) / entrada × 100
          y la compara con el umbral configurado.
        </p>
      </div>
    )
  }

  const { loss_percent, loss_alert, loss_threshold_percent, input_quantity, output_quantity } = resultado

  return (
    <div className="space-y-4">
      <div className={`shrink-card ${loss_alert ? 'critical' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="eyebrow">{loss_alert ? 'Alerta de merma' : 'Control de merma'}</span>
          <Icon name="process" />
        </div>
        <strong>{formatoPorcentaje(loss_percent)}</strong>
        <div className="shrink-formula">
          (({formatoKg(input_quantity)} − {formatoKg(output_quantity)}) / {formatoKg(input_quantity)}) × 100
        </div>
        <div className="threshold">
          <span>Umbral de alerta</span>
          <b>{formatoPorcentaje(loss_threshold_percent)}</b>
        </div>
        <div className="meter">
          <span style={{ width: `${Math.min(Math.max(loss_percent ?? 0, 0) * 4, 100)}%` }} />
        </div>
      </div>

      {loss_alert ? (
        <div className="critical-alert">
          <Icon name="alert" size={24} />
          <div>
            <strong>Alerta de merma</strong>
            <p>
              La merma de {formatoPorcentaje(loss_percent)} supera el umbral de {formatoPorcentaje(loss_threshold_percent)}.
              El administrador la verá en alertas.
            </p>
          </div>
        </div>
      ) : (
        <div className="validation success">
          <Icon name="check" />
          <div>
            <strong>Merma dentro del umbral</strong>
            <span>El lote de salida {resultado.output_code} quedó en estado Pendiente hasta que el administrador lo libere.</span>
          </div>
        </div>
      )}
    </div>
  )
}
