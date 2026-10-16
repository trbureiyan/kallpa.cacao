// Tipos del contrato del backend (backend/app/schemas/api.py y routers). Se escriben a mano porque
// el backend aún no expone un OpenAPI estable para generar el cliente.
import type { EstadoLote, RolApi } from '@/shared/etiquetas'

export interface Usuario {
  id: number
  username: string
  full_name: string
  role: RolApi
}
export interface Finca {
  id: number
  producer_id: number
  name: string
  region: string
}

export interface Lote {
  id: number
  code: string
  producer_id: number
  product_type: string
  origin: string
  received_on: string
  received_quantity: number
  unit: string
  available_quantity: number
  consumed_quantity: number
  status: EstadoLote
  status_reason: string | null
}

export interface RecepcionEnvio {
  idempotency_key: string
  farm_id: number
  received_at: string
  quantity_kg: number
  purchase_total_cop: number
  quality_notes?: string | null
}
export interface RecepcionResultado {
  reception_id: number
  lot_id: number
  lot_code: string
  quantity_kg: string
  available_quantity_kg: string
}

export interface TransformacionEnvio {
  idempotency_key: string
  lot_id: number
  stage: string
  occurred_at: string
  input_quantity: number
  output_quantity: number
  unit: 'kg'
  output_code: string
  incident?: string | null
  costs_cop: number
  sale_price_cop_per_unit?: number | null
}
export interface TransformacionResultado {
  id: number
  lot_id: number
  stage: string
  input_quantity: number
  output_quantity: number
  loss_percent: number | null
  loss_alert: boolean
  loss_threshold_percent: number
  unit: string
  incident: string | null
  output_code: string
  outputs: { lot_id: number; lot_code: string; quantity: number; unit: string; status: EstadoLote }[]
}

export interface TrazaTransformacion {
  id: number
  stage: string
  occurred_at: string
  input_quantity: number
  unit: string
  incident: string | null
}
export interface Trazabilidad {
  lot: Lote
  producer: { id: number; name: string; code: string } | null
  origin_lots: { lot: Lote; producer: { name: string; code: string } | null }[]
  upstream_transformations: { transformation: TrazaTransformacion; input_lot: Lote; output_lot: Lote }[]
  downstream_transformations: {
    transformation: TrazaTransformacion
    input_lot: Lote
    outputs: { lot: Lote; quantity: number }[]
  }[]
  current_inventory: number
  unit: string
}

export interface InventarioAdmin {
  id: number
  code: string
  origin: string
  received_quantity: number
  consumed_quantity: number
  available_quantity: number
  unit: string
  status: EstadoLote
  status_reason: string | null
  costs_cop: number
}
export interface EventoAuditoria {
  id: number
  actor_name: string
  actor_username: string
  entity_type: string
  entity_id: string
  action: string
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  created_at: string
}
export interface Alerta {
  type: string
  severity: string
  entity: string
  value_percent?: number
  rule: string
  cause: string
}
export interface Economia {
  transformation_id: number
  output_code: string
  stage: string
  occurred_at: string
  output_quantity: number
  unit: string
  total_cost_cop: number
  sale_price_cop_per_unit: number | null
  unit_cost_cop: number | null
  margin_on_sale_percent: number | null
  formula: string
  included_costs: string[]
  cost_policy: string
}
export interface FichaPublica {
  code: string
  product_type: string
  stage: string
  occurred_at: string
  output_quantity: number
  unit: string
  status: EstadoLote
  availability: 'available' | 'not_available'
  status_reason: string | null
  origin: string
  received_on: string
}
