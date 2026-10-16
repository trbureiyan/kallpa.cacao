import { db, type RecepcionOffline } from '@/db/dexieDb';

export async function obtenerTodasRecepciones(): Promise<RecepcionOffline[]> {
  return await db.recepciones.orderBy('idLocal').reverse().toArray();
}

export async function guardarRecepcionLocal(datos: {
  producer: string;
  origin: string;
  quantity: number;
  unit: string;
  date: string;
}): Promise<RecepcionOffline> {
  const idempotencyKey = crypto.randomUUID();
  const lotCodeProvisional = `TEMP-${Math.floor(1000 + Math.random() * 9000)}`;

  const nuevoLote: RecepcionOffline = {
    idempotencyKey,
    lotCode: lotCodeProvisional,
    producer: datos.producer,
    origin: datos.origin,
    date: datos.date || new Date().toLocaleDateString('sv-SE'),
    quantity: datos.quantity,
    availableQty: datos.quantity,
    unit: datos.unit || 'kg',
    syncStatus: 'PENDING',
    status: 'PENDIENTE',
  };

  const idLocal = await db.recepciones.add(nuevoLote);
  nuevoLote.idLocal = idLocal;

  // Registrar auditoría con tu estructura AuditEntry
  await db.auditLogs.add({
    timestamp: new Date().toISOString(),
    user: 'Operador Campo',
    action: 'EDICIÓN',
    fieldChanged: 'recepciones',
    previousValue: 'N/A',
    newValue: `Lote ${lotCodeProvisional} (${datos.quantity} ${datos.unit})`,
    lotCode: lotCodeProvisional,
    reason: 'Ingreso offline registrado en campo',
  });

  return nuevoLote;
}