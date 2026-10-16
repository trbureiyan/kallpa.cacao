import { db, type ProcesoOffline } from '@/db/dexieDb';

export async function registrarProcesoLocal(datos: {
  lotCode: string;
  stage: string;
  inputQty: number;
  outputQty: number;
  responsible: string;
  notes?: string;
}): Promise<ProcesoOffline> {
  const shrinkagePercent = Number((((datos.inputQty - datos.outputQty) / datos.inputQty) * 100).toFixed(1));

  const nuevoProceso: ProcesoOffline = {
    lotCode: datos.lotCode,
    stage: datos.stage,
    inputQty: datos.inputQty,
    outputQty: datos.outputQty,
    shrinkagePercent,
    responsible: datos.responsible,
    date: new Date().toLocaleDateString('sv-SE'),
    notes: datos.notes,
  };

  await db.procesos.add(nuevoProceso);

  // Actualizar la cantidad disponible en la recepción correspondiente
  const lote = await db.recepciones.where('lotCode').equals(datos.lotCode).first();
  if (lote && lote.idLocal) {
    await db.recepciones.update(lote.idLocal, {
      availableQty: datos.outputQty,
    });
  }

  // Auditoría con tu enum action: 'PROCESO'
  await db.auditLogs.add({
    timestamp: new Date().toISOString(),
    user: datos.responsible,
    action: 'PROCESO',
    fieldChanged: 'availableQty',
    previousValue: `${datos.inputQty} kg`,
    newValue: `${datos.outputQty} kg`,
    lotCode: datos.lotCode,
    reason: `Etapa ${datos.stage} con merma de ${shrinkagePercent}%`,
  });

  return nuevoProceso;
}