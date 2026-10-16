import { db } from '@/db/dexieDb';

export async function obtenerFichaPublica(lotCode: string) {
  const lote = await db.recepciones.where('lotCode').equals(lotCode).first();
  if (!lote) return null;

  return {
    lotCode: lote.lotCode,
    producer: lote.producer,
    origin: `${lote.origin}, Huila, Colombia`,
    harvestDate: lote.date,
    quantity: lote.quantity,
    unit: lote.unit,
    status: lote.status || 'PENDIENTE',
    verified: lote.syncStatus === 'SYNCED',
  };
}