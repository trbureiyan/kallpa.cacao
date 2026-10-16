import { db } from '@/db/dexieDb';

export interface TimelineStep {
  stepNumber: string;
  title: string;
  description: string;
  date: string;
}

export interface TraceInfo {
  lotCode: string;
  producer: string;
  origin: string;
  availableQty: number;
  status: string;
  steps: TimelineStep[];
}

export async function obtenerTrazabilidadLote(lotCode: string): Promise<TraceInfo | null> {
  const lote = await db.recepciones.where('lotCode').equals(lotCode).first();
  if (!lote) return null;

  const procesos = await db.procesos.where('lotCode').equals(lotCode).toArray();

  return {
    lotCode: lote.lotCode,
    producer: lote.producer,
    origin: `${lote.origin}, Huila`,
    availableQty: lote.availableQty ?? lote.quantity,
    status: lote.status || 'PENDIENTE',
    steps: [
      {
        stepNumber: 'Paso 01',
        title: 'Origen en Finca',
        description: `${lote.producer} · Origen: ${lote.origin}`,
        date: lote.date,
      },
      {
        stepNumber: 'Paso 02',
        title: 'Recepción y Pesaje',
        description: `Ingreso inicial: ${lote.quantity} ${lote.unit}`,
        date: lote.date,
      },
      ...procesos.map((p, idx) => ({
        stepNumber: `Paso 0${idx + 3}`,
        title: `Transformación (${p.stage})`,
        description: `Entrada: ${p.inputQty} kg | Salida: ${p.outputQty} kg (Merma: ${p.shrinkagePercent}%)`,
        date: p.date,
      })),
    ],
  };
}