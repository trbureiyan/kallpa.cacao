import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { ModoFuente } from '@/context/fuente'
import { db } from '@/db/dexieDb'
import { construirFilas, type FilaResumen } from '@/features/reportes/resumen'
import type { RolUsuario } from '@/types/app'
import { listarEconomiaApi, type Economia } from '@/features/economia/api/economiaApi'
import { listarFilasApi } from './api/inventarioApi'

/** Filas de existencias según el modo de la sesión: libro local (Dexie) o API. */
export function useFilasInventario(modo: ModoFuente, rol: RolUsuario | null) {
  const esLocal = modo === 'local'
  const lotes = useLiveQuery(() => (esLocal ? db.recepciones.toArray() : []), [esLocal], [])
  const movimientos = useLiveQuery(() => (esLocal ? db.movimientos.toArray() : []), [esLocal], [])
  const procesos = useLiveQuery(() => (esLocal ? db.procesos.toArray() : []), [esLocal], [])

  const [filasApi, setFilasApi] = useState<FilaResumen[]>([])
  // versión de la última carga terminada; mientras no iguale a `version`, hay una carga en curso
  const [resuelto, setResuelto] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [economia, setEconomia] = useState<Economia | null>(null)
  const [version, setVersion] = useState(0)
  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (esLocal || !rol) return
    let vigente = true
    listarFilasApi(rol)
      .then(async (f) => {
        if (!vigente) return
        setFilasApi(f)
        setError(null)
        // los costos solo los ve el administrador; si fallan, la tabla se muestra igual con "—" y un aviso
        if (rol !== 'ADMINISTRADOR') return
        try {
          const e = await listarEconomiaApi()
          if (!vigente) return
          setEconomia(e)
          setFilasApi(f.map((x) => ({ ...x, costoUnitario: e.porCodigo[x.codigo]?.costoUnitario ?? null })))
        } catch (err) {
          if (vigente) setError(err instanceof Error ? err.message : 'No se pudieron cargar los costos.')
        }
      })
      .catch((e) => vigente && setError(e instanceof Error ? e.message : 'No se pudo cargar el inventario.'))
      .finally(() => vigente && setResuelto(version))
    return () => {
      vigente = false
    }
  }, [esLocal, rol, version])

  const cargando = !esLocal && !!rol && resuelto !== version

  const productorPorCodigo = new Map(lotes.map((l) => [l.lotCode, l.producer]))
  const filas = esLocal
    ? construirFilas(lotes, movimientos, procesos).map((f) => ({ ...f, productor: productorPorCodigo.get(f.codigo) }))
    : filasApi

  return { filas, cargando, error, recargar, economia }
}
