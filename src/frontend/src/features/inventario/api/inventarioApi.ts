import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import { filaInventarioDeApi, type FilaInventarioApi } from '@/api/mapeos'
import type { FilaResumen } from '@/features/reportes/resumen'
import type { RolUsuario } from '@/types/app'

/** Existencias desde la API. El administrador ve recibido y consumido; el operador solo el disponible. */
export async function listarFilasApi(rol: RolUsuario): Promise<FilaResumen[]> {
  let datos: FilaInventarioApi[]
  try {
    const { data } = await axiosClient.get<FilaInventarioApi[]>(rol === 'ADMINISTRADOR' ? '/inventory/admin' : '/inventory')
    datos = data
  } catch (e) {
    throw traducirErrorApi(e)
  }
  return datos.map((d) => {
    const f = filaInventarioDeApi(d)
    return {
      id: f.id,
      codigo: f.lotCode,
      origen: f.origin,
      recibidoKg: f.recibidoKg,
      consumidoKg: f.consumidoKg,
      disponibleKg: f.disponibleKg,
      estado: f.estado,
      // el costo unitario sale de /economics, no del inventario
      costoUnitario: null,
    }
  })
}

export async function idDeLote(rol: RolUsuario, codigo: string): Promise<number | null> {
  const filas = await listarFilasApi(rol)
  return filas.find((f) => f.codigo === codigo)?.id ?? null
}
