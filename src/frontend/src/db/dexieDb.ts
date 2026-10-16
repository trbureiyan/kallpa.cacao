import { type Table, Dexie } from 'dexie';

// 1. Registro de Recepción (RF01, RF08)
export interface RecepcionOffline {
  idLocal?: number;
  idempotencyKey: string;
  lotCode: string;
  producer: string;
  origin: string;
  date: string;
  quantity: number;
  unit: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'ERROR';
  errorMessage?: string;
  status?: 'PENDIENTE' | 'LIBERADO' | 'BLOQUEADO';
  availableQty?: number;
}

// 2. Registro de Transformación / Proceso (RF02, RF04)
export interface ProcesoOffline {
  idLocal?: number;
  lotCode: string;
  stage: string;
  inputQty: number;
  outputQty: number;
  shrinkagePercent: number;
  responsible: string;
  date: string;
  notes?: string;
}

// 3. Registro de Auditoría e Incidencias (RF09, RF10)
export interface AuditEntry {
  idLocal?: number;
  timestamp: string;
  user: string;
  action: 'BLOQUEO' | 'LIBERACIÓN' | 'PROCESO' | 'EDICIÓN';
  fieldChanged: string;
  previousValue: string;
  newValue: string;
  lotCode: string;
  reason?: string;
}

export class CacaoOfflineDB extends Dexie {
  recepciones!: Table<RecepcionOffline, number>;
  procesos!: Table<ProcesoOffline, number>;
  auditLogs!: Table<AuditEntry, number>;

  constructor() {
    super('CacaoOfflineDB');
    this.version(2).stores({
      recepciones: '++idLocal, idempotencyKey, lotCode, origin, syncStatus, status',
      procesos: '++idLocal, lotCode, stage, date',
      auditLogs: '++idLocal, timestamp, user, action, lotCode',
    });
  }
}

export const db = new CacaoOfflineDB();