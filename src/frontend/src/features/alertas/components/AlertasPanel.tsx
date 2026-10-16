import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui'
import { listarAlertasApi, type AlertaServidor } from '../api/alertasApi'

const ETIQUETA: Record<AlertaServidor['tipo'], string> = {
  merma: 'Merma',
  registro_incompleto: 'Registro incompleto',
  retraso: 'Retraso',
  costo: 'Costo',
}

/** Alertas del servidor con su regla y su causa (RF04). Solo se monta para el administrador en modo API. */
export function AlertasPanel() {
  const [alertas, setAlertas] = useState<AlertaServidor[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    listarAlertasApi()
      .then((a) => vigente && setAlertas(a))
      .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudieron cargar las alertas.'))
    return () => {
      vigente = false
    }
  }, [])

  return (
    <section className="card mt-6" aria-labelledby="titulo-alertas">
      <div className="card-head">
        <div>
          <div id="titulo-alertas" className="section-title">Alertas para decidir</div>
          <p>Cada alerta indica la regla que se incumplió y su causa.</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {error && (
          <div className="validation danger" role="alert">
            <Icon name="alert" />
            <span>{error}</span>
          </div>
        )}
        {!error && alertas === null && <p className="text-sm text-texto-suave">Cargando alertas…</p>}
        {alertas?.length === 0 && <p className="text-sm text-texto-suave">No hay alertas activas.</p>}
        {alertas?.map((a, i) => (
          <div key={`${a.tipo}-${a.entidad}-${i}`} className="activity-row">
            <div className="activity-icon"><Icon name="alert" size={16} /></div>
            <div>
              <strong>{ETIQUETA[a.tipo]} · {a.entidad}</strong>
              <span>Regla: {a.regla}</span>
              <span>Causa: {a.causa}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
