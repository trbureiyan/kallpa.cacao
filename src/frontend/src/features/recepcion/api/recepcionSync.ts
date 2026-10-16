import { db } from '@/db/dexieDb';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export async function sincronizarRecepcionesPendientes(): Promise<number> {
  const pendientes = await db.recepciones.where('syncStatus').equals('PENDING').toArray();
  let sincronizadosCount = 0;

  for (const lote of pendientes) {
    try {
      const response = await axios.post(`${API_URL}/recepciones`, lote, {
        headers: {
          'X-Idempotency-Key': lote.idempotencyKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      if ((response.status === 200 || response.status === 201) && lote.idLocal) {
        const serverLotCode = response.data.lotCode || lote.lotCode;
        await db.recepciones.update(lote.idLocal, {
          lotCode: serverLotCode,
          syncStatus: 'SYNCED',
          errorMessage: undefined,
        });
        sincronizadosCount++;
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (lote.idLocal) {
          await db.recepciones.update(lote.idLocal, {
            syncStatus: 'ERROR',
            errorMessage: error.response.data?.detail || 'Error de validación en el servidor',
          });
        }
      } else {
        console.warn(`Servidor FastAPI no alcanzable para ${lote.lotCode}. Permanece PENDING.`);
      }
    }
  }

  return sincronizadosCount;
}