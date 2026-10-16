import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { ModoFuente } from '@/context/fuente'
import { db } from '@/db/dexieDb'
import { alertasDeProceso, camposFaltantes } from '@/features/alertas/reglas'
import { indicadoresDeProceso } from '@/features/economia/reglas'
import type { RolUsuario } from '@/types/app'
import { listarProcesosApi, type ProcesoUi } from './api/procesoApi'

/** Historial de transformaciones según el modo: Dexie con alertas locales, o el servidor con las suyas. */
export function useProcesos(modo: ModoFuente, rol: RolUsuario | null) {
  const esLocal = modo === 'local'
  const locales = useLiveQuery(() => (esLocal ? db.procesos.reverse().toArray() : []), [esLocal], [])

  const [filasApi, setFilasApi] = useState<ProcesoUi[]>([])
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (esLocal || !rol) return
    let vigente = true
    listarProcesosApi(rol)
      .then((f) => vigente && (setFilasApi(f), setError(null)))
      .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'))
    return () => {
      vigente = false
    }
  }, [esLocal, rol, version])

  const procesos: ProcesoUi[] = esLocal
    ? locales.map((p) => ({
        clave: p.idLocal ?? p.lotCode,
        lotCode: p.lotCode,
        stage: p.stage,
        inputQty: p.inputQty,
        outputQty: p.outputQty,
        shrinkagePercent: p.shrinkagePercent,
        responsible: p.responsible,
        date: p.date,
        alertas: alertasDeProceso({
          mermaPct: p.shrinkagePercent,
          costoUnitario: indicadoresDeProceso(p).costoUnitario,
          camposFaltantes: camposFaltantes(p),
        }),
      }))
    : filasApi

  return { procesos, error, recargar }
}
