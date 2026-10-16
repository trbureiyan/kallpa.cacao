import { type Table, Dexie } from 'dexie';

export interface RecepcionOffline {
  idLocal?: number;
  idempotencyKey: string; // Generado con crypto.randomUUID()
  lotCode: string;
  producer: string;
  origin: string;
  date: string;
  quantity: number;
  unit: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'ERROR';
  errorMessage?: string;
}

export class CacaoOfflineDB extends Dexie {
  // Indicar que la clave primaria es de tipo 'number'
  recepciones!: Table<RecepcionOffline, number>;

  constructor() {
    super('CacaoOfflineDB');
    this.version(1).stores({
      recepciones: '++idLocal, idempotencyKey, lotCode, syncStatus'
    });
  }
}

export const db = new CacaoOfflineDB();