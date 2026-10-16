import { db } from '../db/dexieDb';
import { axiosClient } from '../api/axiosClient.ts';

export const sincronizarRecepcionesPendientes = async (): Promise<{
  exitosas: number;
  fallidas: number;
}> => {
  // 1. Consultar registros pendientes en IndexedDB
  const pendientes = await db.recepciones
    .where('syncStatus')
    .equals('PENDING')
    .toArray();

  let exitosas = 0;
  let fallidas = 0;

  for (const item of pendientes) {
    try {
      // 2. Enviar a FastAPI con la clave de idempotencia
      await axiosClient.post(
        '/receptions',
        {
          lot_code: item.lotCode,
          producer: item.producer,
          origin: item.origin,
          date: item.date,
          quantity: item.quantity,
          unit: item.unit,
        },
        {
          headers: {
            'X-Idempotency-Key': item.idempotencyKey,
          },
        }
      );

      // 3. Actualizar estado local a 'SYNCED'
      if (item.idLocal) {
        await db.recepciones.update(item.idLocal, {
          syncStatus: 'SYNCED',
          errorMessage: undefined,
        });
      }
      exitosas++;
    } catch (error: any) {
      console.error(`Error al sincronizar lote ${item.lotCode}:`, error);
      fallidas++;
      if (item.idLocal) {
        await db.recepciones.update(item.idLocal, {
          syncStatus: 'ERROR',
          errorMessage: error.response?.data?.detail || 'Error de conexión con FastAPI',
        });
      }
    }
  }

  return { exitosas, fallidas };
};