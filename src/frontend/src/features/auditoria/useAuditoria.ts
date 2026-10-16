import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { ModoFuente } from '@/context/fuente'
import type { AuditEntry } from '@/db/dexieDb'
import { listarAuditoriaApi } from './api/auditoriaApi'
import { obtenerLogsAuditoria } from './api/auditoriaDb'

/** Historial de auditoría: Dexie en modo local; el listado global del servidor en modo API. */
export function useAuditoria(modo: ModoFuente) {
  const esLocal = modo === 'local'
  const locales = useLiveQuery(() => (esLocal ? obtenerLogsAuditoria() : []), [esLocal], [])

  const [filasApi, setFilasApi] = useState<AuditEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (esLocal) return
    let vigente = true
    listarAuditoriaApi()
      .then((f) => vigente && (setFilasApi(f), setError(null)))
      .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudo cargar la auditoría.'))
    return () => {
      vigente = false
    }
  }, [esLocal, version])

  return { logs: esLocal ? locales : filasApi, error, recargar }
}
