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
}

// 2. Registro de Transformación / Proceso (RF02, RF04)
export interface ProcesoOffline {
  idLocal?: number;
  lotCode: string;
  stage: string;
  inputQty: number;
  outputQty: number;
  /** null cuando la entrada no es positiva (no calculable) */
  shrinkagePercent: number | null;
  responsible: string;
  date: string;
  notes?: string;
  claveIdempotencia?: string;
  costoTotalCOP?: number;
  precioVentaCOP?: number;
  justificacion?: string;
  incidencias?: string;
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

// 4. Libro de inventario (RF08): el disponible se deriva de la suma, no se guarda
export interface Movimiento {
  id?: number;
  lotCode: string;
  tipo: 'RECIBIDO' | 'CONSUMIDO';
  kg: number;
  fecha: string;
  claveIdempotencia?: string;
}

export class CacaoOfflineDB extends Dexie {
  recepciones!: Table<RecepcionOffline, number>;
  procesos!: Table<ProcesoOffline, number>;
  auditLogs!: Table<AuditEntry, number>;
  movimientos!: Table<Movimiento, number>;

  constructor() {
    super('CacaoOfflineDB');
    this.version(2).stores({
      recepciones: '++idLocal, idempotencyKey, lotCode, origin, syncStatus, status',
      procesos: '++idLocal, lotCode, stage, date',
      auditLogs: '++idLocal, timestamp, user, action, lotCode',
    });
    // v3: el unique de claveIdempotencia respalda en la base la validación del código
    this.version(3)
      .stores({
        movimientos: '++id, lotCode, &claveIdempotencia',
      })
      .upgrade(async (tx) => {
        // Datos de v2: convertir quantity/availableQty en movimientos
        const fecha = new Date().toISOString();
        for (const l of await tx.table('recepciones').toArray()) {
          await tx.table('movimientos').add({ lotCode: l.lotCode, tipo: 'RECIBIDO', kg: l.quantity, fecha });
          const consumido = l.quantity - (l.availableQty ?? l.quantity); // availableQty solo existe en datos v2
          if (consumido > 0) {
            await tx.table('movimientos').add({ lotCode: l.lotCode, tipo: 'CONSUMIDO', kg: consumido, fecha });
          }
        }
      });

    // v4: cada transformación lleva su clave única (reenvío = misma operación)
    this.version(4).stores({
      procesos: '++idLocal, lotCode, stage, date, &claveIdempotencia',
    });

    // [DECISION] auditoría de solo inserción — los hooks bloquean update/delete desde cualquier código. El servidor repetirá la regla en la fase 2.
    const soloInsercion = () => {
      throw new Error('La auditoría es de solo inserción: no se puede modificar ni borrar.');
    };
    this.auditLogs.hook('updating', soloInsercion);
    this.auditLogs.hook('deleting', soloInsercion);
  }
}

export const db = new CacaoOfflineDB();