import { db } from '@/db/dexieDb';

export async function seedDatabase() {
  const count = await db.recepciones.count();
  
  // Solo inyectar si la base de datos está vacía
  if (count === 0) {
    console.log('🌱 Inyectando datos semilla en IndexedDB...');

    await db.recepciones.bulkAdd([
      {
        idempotencyKey: crypto.randomUUID(),
        lotCode: 'CAC128',
        producer: 'Ana Torres · Finca El Porvenir',
        origin: 'Rivera',
        date: '2025-05-20',
        quantity: 320,
        availableQty: 256,
        unit: 'kg',
        syncStatus: 'SYNCED',
        status: 'LIBERADO',
      },
      {
        idempotencyKey: crypto.randomUUID(),
        lotCode: 'CAC127',
        producer: 'Carlos Díaz · Finca La Esperanza',
        origin: 'Campoalegre',
        date: '2025-05-22',
        quantity: 185,
        availableQty: 185,
        unit: 'kg',
        syncStatus: 'PENDING',
        status: 'PENDIENTE',
      },
      {
        idempotencyKey: crypto.randomUUID(),
        lotCode: 'CAC126',
        producer: 'Luz Peña · Finca Los Cacaos',
        origin: 'Algeciras',
        date: '2025-05-23',
        quantity: 240,
        availableQty: 198,
        unit: 'kg',
        syncStatus: 'SYNCED',
        status: 'BLOQUEADO',
      },
    ]);

    await db.procesos.bulkAdd([
      {
        lotCode: 'CAC128',
        stage: 'Fermentación',
        inputQty: 320,
        outputQty: 293,
        shrinkagePercent: 8.4,
        responsible: 'José Rivera',
        date: '24/05/2025',
        notes: 'Fermentación de 6 días en cajones de madera',
      },
      {
        lotCode: 'CAC126',
        stage: 'Secado',
        inputQty: 240,
        outputQty: 198,
        shrinkagePercent: 17.5,
        responsible: 'Marta Perdomo',
        date: '24/05/2025',
        notes: 'Merma alta por lluvia continua durante el secado',
      },
    ]);

    await db.auditLogs.bulkAdd([
      {
        timestamp: '24/05/2025, 10:42:15',
        user: 'Administrador ASOCACAO',
        action: 'BLOQUEO',
        fieldChanged: 'Estado · CAC126',
        previousValue: 'LIBERADO',
        newValue: 'BLOQUEADO',
        lotCode: 'CAC126',
        reason: 'Humedad superior al 12% detectada en inspección',
      },
    ]);

    console.log('✅ Base de datos sembrada correctamente.');
  }
}