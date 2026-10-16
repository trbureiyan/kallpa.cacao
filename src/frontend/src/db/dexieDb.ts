import { type Table, Dexie } from 'dexie'

// Cola de recepciones capturadas en el dispositivo. Es la ÚNICA operación que se escribe sin conexión
// (marco: offline solo para recepción). El código legible CACxxx lo asigna el servidor al sincronizar.
export interface RecepcionCola {
  idempotencyKey: string // UUID generado en el cliente; clave primaria
  farmId: number
  fincaNombre: string
  municipio: string
  cantidadKg: number
  costoCompraCop: number
  notas?: string
  recibidoEn: string // hora de captura del cliente (ISO); el servidor guarda además su propia hora
  creadoEn: number
  estado: 'PENDING' | 'SYNCED' | 'ERROR'
  codigoLote?: string
  mensajeError?: string
}

// Copia de lectura del catálogo de fincas para poder capturar sin conexión.
export interface FincaCache {
  id: number
  producer_id: number
  name: string
  region: string
}

export class CacaoOfflineDB extends Dexie {
  colaRecepciones!: Table<RecepcionCola, string>
  fincas!: Table<FincaCache, number>

  constructor() {
    super('CacaoOfflineDB')
    // v2 era una maqueta con datos inventados (recepciones, procesos, auditLogs): se descarta.
    this.version(2).stores({
      recepciones: '++idLocal, idempotencyKey, lotCode, origin, syncStatus, status',
      procesos: '++idLocal, lotCode, stage, date',
      auditLogs: '++idLocal, timestamp, user, action, lotCode',
    })
    this.version(3).stores({
      recepciones: null,
      procesos: null,
      auditLogs: null,
      colaRecepciones: 'idempotencyKey, estado, creadoEn',
      fincas: 'id',
    })
    // v4: RecepcionForm ordena por region; Dexie exige que el campo esté indexado (sin esto lanza SchemaError).
    this.version(4).stores({ fincas: 'id, region' })
  }
}

export const db = new CacaoOfflineDB()
