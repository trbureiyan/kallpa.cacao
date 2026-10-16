import { traducirErrorApi } from '@/api/errores'
import { axiosClient } from '@/api/axiosClient'
import { db, type Finca } from '@/db/dexieDb'
import { ErrorDominio } from '@/utils/errores'

interface FincaApi {
  id: number
  producer_id: number
  name: string
  region: string
}

/** Fincas del servidor; sin red usa la copia local. Cualquier otro error se muestra, no se disfraza. */
export async function cargarFincas(): Promise<Finca[]> {
  try {
    const { data } = await axiosClient.get<FincaApi[]>('/farms')
    const fincas = data
      .map((f) => ({ id: f.id, producerId: f.producer_id, name: f.name, region: f.region }))
      .sort((a, b) => a.name.localeCompare(b.name))
    await db.transaction('rw', db.fincas, async () => {
      await db.fincas.clear()
      await db.fincas.bulkPut(fincas)
    })
    return fincas
  } catch (e) {
    const err = traducirErrorApi(e)
    if (err.codigo !== 'SIN_RED') throw err
    const copia = (await db.fincas.toArray()).sort((a, b) => a.name.localeCompare(b.name))
    if (copia.length === 0) {
      throw new ErrorDominio('SIN_CATALOGO', 'No hay fincas disponibles. Sin conexión y sin una copia previa no se puede elegir la finca. Conéctese una vez para descargar el catálogo.')
    }
    return copia
  }
}
