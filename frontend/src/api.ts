import type { Farm, ReceptionPayload } from './db'

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

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
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  return parseResponse<{ access_token: string; token_type: string }>(response)
}

export async function fetchFarms(token: string) {
  const response = await fetch(`${baseUrl}/farms`, { headers: { Authorization: `Bearer ${token}` } })
  return parseResponse<Farm[]>(response)
}

export async function sendReception(token: string, payload: ReceptionPayload) {
  const response = await fetch(`${baseUrl}/receptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse<{ reception_id: number; lot_id: number }>(response)
}

export function isHttpError(error: unknown, status: number) {
  return error instanceof Error && 'status' in error && error.status === status
}
