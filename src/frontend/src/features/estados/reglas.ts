import type { EstadoLote, RolUsuario } from '@/types/app'

interface CambioEstado {
  rol: RolUsuario
  actual: EstadoLote
  nuevo: EstadoLote
  motivo: string
}

export type CodigoRechazo = 'PERMISO_DENEGADO' | 'MOTIVO_OBLIGATORIO' | 'ESTADO_SIN_CAMBIO'
export type ResultadoCambio = { ok: true } | { ok: false; codigo: CodigoRechazo; mensaje: string }

/** Solo el administrador cambia el estado, con motivo y hacia un estado distinto. */
export function evaluarCambioEstado(i: CambioEstado): ResultadoCambio {
  if (i.rol !== 'ADMINISTRADOR') {
    return {
      ok: false,
      codigo: 'PERMISO_DENEGADO',
      mensaje:
        'No se cambió el estado. Solo el administrador puede liberar o bloquear un lote. Solicite el cambio a un administrador.',
    }
  }
  if (!i.motivo.trim()) {
    return {
      ok: false,
      codigo: 'MOTIVO_OBLIGATORIO',
      mensaje: 'No se cambió el estado. El motivo es obligatorio para dejar constancia en la auditoría. Escriba el motivo e intente de nuevo.',
    }
  }
  if (i.actual === i.nuevo) {
    return { ok: false, codigo: 'ESTADO_SIN_CAMBIO', mensaje: `No se cambió el estado. El lote ya está ${i.nuevo}. Elija un estado distinto.` }
  }
  return { ok: true }
}
