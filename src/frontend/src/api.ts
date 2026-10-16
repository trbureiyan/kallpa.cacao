import type { Farm, ReceptionPayload } from './db'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

export function apiUrl(path: string) {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.detail || `Error del servidor (${response.status})`)
    Object.assign(error, { status: response.status })
    throw error
  }
  return body as T
}

export async function login(username: string, password: string) {
  const form = new URLSearchParams({ username, password })
  const response = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  return parseResponse<{ access_token: string; token_type: string }>(response)
}

export async function fetchFarms(token: string) {
  const response = await fetch(apiUrl('/farms'), { headers: { Authorization: `Bearer ${token}` } })
  return parseResponse<Farm[]>(response)
}

export async function sendReception(token: string, payload: ReceptionPayload) {
  const response = await fetch(apiUrl('/receptions'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<{ reception_id: number; lot_id: number; lot_code: string }>(response)
}

export function isHttpError(error: unknown, status: number) {
  return error instanceof Error && 'status' in error && error.status === status
}

export async function apiRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })
  return parseResponse<T>(response)
}

export type ApiLot = {
  id: number
  code: string
  product_type: string
  origin: string
  received_on: string
  received_quantity: number
  unit: string
  available_quantity: number
  consumed_quantity: number
  status: 'pending' | 'released' | 'blocked'
  status_reason: string | null
}

export type ApiTransformation = {
  id: number
  stage: string
  responsible_name: string
  occurred_at: string
  input_quantity: number
  output_quantity: number
  loss_percent: number | null
  loss_alert: { type: string; rule: string; cause: string; value_percent: number } | null
  unit: string
  incident: string | null
  lot_id: number
  output_code: string | null
  outputs: Array<{ lot_id: number; lot_code: string; product_type: string; quantity: number; unit: string; status: string }>
}

export type ApiAlert = {
  type: 'merma' | 'registro_incompleto' | 'retraso' | 'costo'
  severity: string
  entity: string
  value_percent?: number
  rule: string
  cause: string
}

export type ApiUser = {
  id: number
  username: string
  full_name: string
  role: 'operator' | 'admin'
  active: boolean
  municipality: string | null
}

export type PublicProduct = {
  code: string
  product_type: string
  stage: string
  occurred_at: string
  output_quantity: number
  unit: string
  status: 'pending' | 'released' | 'blocked'
  availability: string
  status_reason: string | null
  origin: string
  received_on: string
}

export type PublicTraceability = {
  code: string
  product_type: string
  status: string
  availability: string
  origin: string
  timeline: Array<{
    kind: 'reception' | 'transformation'
    lot_code?: string
    origin?: string
    date: string
    quantity?: number
    input_quantity?: number
    output_code?: string
    output_quantity?: number
    stage?: string
    unit: string
  }>
}

export function fetchPublicProduct(code: string) {
  return fetch(apiUrl(`/public/products/${encodeURIComponent(code)}`)).then(parseResponse<PublicProduct>)
}

export function fetchPublicTraceability(code: string) {
  return fetch(apiUrl(`/public/products/${encodeURIComponent(code)}/traceability`)).then(parseResponse<PublicTraceability>)
}
