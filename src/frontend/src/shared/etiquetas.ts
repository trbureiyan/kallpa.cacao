// Etiquetas de presentación en un solo lugar (AGENTS.md: Estados del lote).
// [DECISION] El backend usa valores en inglés (pending/released/blocked, admin/operator); el cliente los
// traduce solo aquí, en el borde. Desviación respecto a AGENTS.md anotada en el informe de integración.

export type EstadoLote = 'pending' | 'released' | 'blocked'
export type RolApi = 'admin' | 'operator'

export const ESTADOS: Record<
  EstadoLote,
  { valor: 'pendiente' | 'liberado' | 'bloqueado'; etiqueta: string; tono: 'amber' | 'green' | 'red' }
> = {
  pending: { valor: 'pendiente', etiqueta: 'Pendiente', tono: 'amber' },
  released: { valor: 'liberado', etiqueta: 'Liberado', tono: 'green' },
  blocked: { valor: 'bloqueado', etiqueta: 'Bloqueado', tono: 'red' },
}

export function estadoDe(estado: string) {
  return ESTADOS[estado as EstadoLote] ?? { valor: estado, etiqueta: estado, tono: 'amber' as const }
}

export const ROLES: Record<RolApi, string> = {
  admin: 'Administrador',
  operator: 'Operador',
}

export const ACCIONES_AUDITORIA: Record<string, string> = {
  received: 'Recepción del lote',
  status_changed: 'Cambio de estado',
  inventory_consumed: 'Consumo de inventario',
  created: 'Transformación registrada',
}

export const TIPOS_ALERTA: Record<string, string> = {
  merma: 'Merma',
  costo: 'Costo',
  registro_incompleto: 'Registro incompleto',
  retraso: 'Retraso',
}
