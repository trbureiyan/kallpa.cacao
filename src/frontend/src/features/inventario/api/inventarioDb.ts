import { db } from '@/db/dexieDb';

export async function cambiarEstadoLote(
  idLocal: number, 
  nuevoEstado: 'LIBERADO' | 'BLOQUEADO'
): Promise<void> {
  const loteAnterior = await db.recepciones.get(idLocal);
  if (!loteAnterior) return;

  await db.recepciones.update(idLocal, { status: nuevoEstado });

  await db.auditLogs.add({
    timestamp: new Date().toISOString(),
    user: 'Administrador ASOCACAO',
    action: nuevoEstado === 'BLOQUEADO' ? 'BLOQUEO' : 'LIBERACIÓN',
    fieldChanged: 'status',
    previousValue: loteAnterior.status || 'PENDIENTE',
    newValue: nuevoEstado,
    lotCode: loteAnterior.lotCode,
    reason: `Cambio manual de estado a ${nuevoEstado}`,
  });
}