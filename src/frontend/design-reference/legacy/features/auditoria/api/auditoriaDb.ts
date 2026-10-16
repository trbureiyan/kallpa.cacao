import { db, type AuditEntry } from '@/db/dexieDb';

export async function obtenerLogsAuditoria(): Promise<AuditEntry[]> {
  return await db.auditLogs.orderBy('idLocal').reverse().toArray();
}