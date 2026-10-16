import { openDB, type DBSchema } from 'idb'

export type Farm = { id: number; producer_id: number; name: string; region: string }
export type QueueState = 'pending' | 'syncing' | 'synced' | 'conflict' | 'needs-auth'

export type ReceptionPayload = {
  idempotency_key: string
  farm_id: number
  received_at: string
  quantity_kg: string
  purchase_total_cop: string
  quality_notes: string | null
}

export type LocalReception = {
  local_id: string
  payload: ReceptionPayload
  saved_at: string
  state: QueueState
  server_lot_id?: number
  server_lot_code?: string
  server_reception_id?: number
  error?: string
}

interface CacaoDB extends DBSchema {
  farms: { key: number; value: Farm }
  receptions: { key: string; value: LocalReception; indexes: { 'by-saved-at': string } }
}

const database = openDB<CacaoDB>('cacao-campo', 1, {
  upgrade(db) {
    db.createObjectStore('farms', { keyPath: 'id' })
    const queue = db.createObjectStore('receptions', { keyPath: 'local_id' })
    queue.createIndex('by-saved-at', 'saved_at')
  },
})

export async function saveFarms(farms: Farm[]) {
  const db = await database
  const tx = db.transaction('farms', 'readwrite')
  await tx.store.clear()
  await Promise.all([...farms.map((farm) => tx.store.put(farm)), tx.done])
}

export async function getFarms() {
  return (await database).getAll('farms')
}

export async function getReceptions() {
  return (await database).getAllFromIndex('receptions', 'by-saved-at')
}

export async function saveReception(reception: LocalReception) {
  await (await database).put('receptions', reception)
}

export async function removeReception(localId: string) {
  await (await database).delete('receptions', localId)
}
