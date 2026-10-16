import { db } from '@/db/dexieDb'
import { registrarAuditoria } from '@/features/auditoria/api/auditoriaDb'
import type { EstadoLote, RolUsuario } from '@/types/app'
import { ErrorDominio } from '@/utils/errores'
import { evaluarCambioEstado } from '../reglas'

/** Cambia el estado y audita en una sola transacción; si algo falla, no queda nada a medias. */
export async function cambiarEstadoLote(i: {
  lotCode: string
  nuevo: Exclude<EstadoLote, 'PENDIENTE'>
  motivo: string
  rol: RolUsuario
  usuario: string
}): Promise<void> {
  await db.transaction('rw', db.recepciones, db.auditLogs, async () => {
    const lote = await db.recepciones.where('lotCode').equals(i.lotCode).first()
    if (!lote || lote.idLocal === undefined) {
      throw new ErrorDominio(
        'LOTE_NO_ENCONTRADO',
        `No se cambió el estado. El lote ${i.lotCode} no existe en el registro. Revise el código del lote.`,
      )
    }
    const actual: EstadoLote = lote.status ?? 'PENDIENTE'
    const r = evaluarCambioEstado({ rol: i.rol, actual, nuevo: i.nuevo, motivo: i.motivo })
    if (!r.ok) throw new ErrorDominio(r.codigo, r.mensaje)

    await db.recepciones.update(lote.idLocal, { status: i.nuevo })
    await registrarAuditoria({
      user: i.usuario,
      action: i.nuevo === 'BLOQUEADO' ? 'BLOQUEO' : 'LIBERACIÓN',
      fieldChanged: 'status',
      previousValue: actual,
      newValue: i.nuevo,
      lotCode: i.lotCode,
      reason: i.motivo.trim(),
    })
  })
}
