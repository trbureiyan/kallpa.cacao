import type { EstadoLote, RolUsuario } from '@/types/app'
import { ErrorDominio } from '@/utils/errores'

const ROLES: Record<string, RolUsuario> = { admin: 'ADMINISTRADOR', operator: 'OPERADOR' }
const ESTADOS: Record<string, EstadoLote> = { pending: 'PENDIENTE', released: 'LIBERADO', blocked: 'BLOQUEADO' }
const ESTADOS_API = Object.fromEntries(Object.entries(ESTADOS).map(([api, ui]) => [ui, api])) as Record<EstadoLote, string>

// Un valor desconocido falla en lugar de caer a un rol o estado por defecto: un rol de más sería un permiso de más.
export function rolDeApi(rol: string): RolUsuario {
  const r = ROLES[rol]
  if (!r) throw new ErrorDominio('CONTRATO', 'El servidor devolvió un rol desconocido. No se pudo iniciar sesión. Avise al administrador.')
  return r
}

export function estadoDeApi(estado: string): EstadoLote {
  const e = ESTADOS[estado]
  if (!e) throw new ErrorDominio('CONTRATO', `El servidor devolvió un estado desconocido (${estado}). No se puede mostrar el lote. Avise al administrador.`)
  return e
}

export const estadoAApi = (estado: EstadoLote): string => ESTADOS_API[estado]

// La API manda decimales como número o como cadena ("12.500"); null significa "sin dato", nunca 0.
export function numero(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

// /inventory/admin usa id/code; /inventory (operador) usa lot_id/lot_code y no trae costos.
export interface FilaInventarioApi {
  id?: number
  code?: string
  lot_id?: number
  lot_code?: string
  origin: string
  received_quantity?: number | string
  consumed_quantity?: number | string
  available_quantity: number | string
  unit: string
  status: string
  status_reason?: string | null
  costs_cop?: number | string | null
}

export interface FilaInventario {
  id: number
  lotCode: string
  origin: string
  recibidoKg: number | null
  consumidoKg: number | null
  disponibleKg: number
  estado: EstadoLote
  costosCOP: number | null
}

export function filaInventarioDeApi(f: FilaInventarioApi): FilaInventario {
  return {
    id: (f.id ?? f.lot_id) as number,
    lotCode: (f.code ?? f.lot_code) as string,
    origin: f.origin,
    recibidoKg: numero(f.received_quantity),
    consumidoKg: numero(f.consumed_quantity),
    disponibleKg: numero(f.available_quantity) ?? 0,
    estado: estadoDeApi(f.status),
    costosCOP: numero(f.costs_cop),
  }
}

export function idPorCodigo(lotes: { id: number; lotCode: string }[], codigo: string): number {
  const lote = lotes.find((l) => l.lotCode === codigo)
  if (!lote) throw new ErrorDominio('NO_ENCONTRADO', `No se encontró el lote ${codigo}. Puede que aún no se haya sincronizado. Sincronice e intente de nuevo.`)
  return lote.id
}
