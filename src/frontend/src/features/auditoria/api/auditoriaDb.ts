import { db, type AuditEntry } from '@/db/dexieDb'
import { ahoraISO } from '@/utils/clock'

export async function obtenerLogsAuditoria(): Promise<AuditEntry[]> {
  return await db.auditLogs.orderBy('idLocal').reverse().toArray()
}

/** Hora del sistema, nunca la del llamador. Llamar dentro de la transacción de la operación auditada. */
export async function registrarAuditoria(e: Omit<AuditEntry, 'idLocal' | 'timestamp'>): Promise<void> {
  await db.auditLogs.add({ ...e, timestamp: ahoraISO() })
}
