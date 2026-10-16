import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import { estadoAApi } from '@/api/mapeos'
import { listarFilasApi } from '@/features/inventario/api/inventarioApi'
import type { EstadoLote, RolUsuario } from '@/types/app'
import { ErrorDominio } from '@/utils/errores'
import { evaluarCambioEstado } from '../reglas'

const MOTIVO_MINIMO = 3 // lo exige el servidor; se avisa aquí en lugar de mostrar su error de esquema

/** Cambia el estado en el servidor, que audita en la misma transacción. Valida antes para dar un mensaje claro. */
export async function cambiarEstadoApi(i: {
  lotCode: string
  nuevo: Exclude<EstadoLote, 'PENDIENTE'>
  motivo: string
  rol: RolUsuario
}): Promise<void> {
  const lote = (await listarFilasApi(i.rol)).find((f) => f.codigo === i.lotCode)
  if (!lote?.id) {
    throw new ErrorDominio('LOTE_NO_ENCONTRADO', `No se cambió el estado. El lote ${i.lotCode} no existe en el registro. Revise el código del lote.`)
  }

  const r = evaluarCambioEstado({ rol: i.rol, actual: lote.estado, nuevo: i.nuevo, motivo: i.motivo })
  if (!r.ok) throw new ErrorDominio(r.codigo, r.mensaje)

  const motivo = i.motivo.trim()
  if (motivo.length < MOTIVO_MINIMO) {
    throw new ErrorDominio('MOTIVO_OBLIGATORIO', `No se cambió el estado. El motivo es muy corto para dejar constancia en la auditoría. Escriba al menos ${MOTIVO_MINIMO} letras.`)
  }

  try {
    await axiosClient.patch(`/lots/${lote.id}/status`, { status: estadoAApi(i.nuevo), reason: motivo })
  } catch (e) {
    throw traducirErrorApi(e)
  }
}
