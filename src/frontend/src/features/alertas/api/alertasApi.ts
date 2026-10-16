import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import { ErrorDominio } from '@/utils/errores'
import type { TipoAlerta } from '../reglas'

export interface AlertaServidor {
  tipo: TipoAlerta
  entidad: string
  regla: string
  causa: string
}

const TIPOS: TipoAlerta[] = ['merma', 'registro_incompleto', 'retraso', 'costo']

interface AlertaApi {
  type: string
  entity: string
  rule: string
  cause: string
}

/** Alertas calculadas por el servidor con regla y causa (solo administrador). El enum de tipos es cerrado. */
export async function listarAlertasApi(): Promise<AlertaServidor[]> {
  let lista: AlertaApi[]
  try {
    lista = (await axiosClient.get<AlertaApi[]>('/alerts')).data
  } catch (e) {
    throw traducirErrorApi(e)
  }
  return lista.map((a) => {
    if (!TIPOS.includes(a.type as TipoAlerta)) {
      throw new ErrorDominio('CONTRATO', `El servidor devolvió una alerta de tipo desconocido (${a.type}). No se puede mostrar. Avise al administrador.`)
    }
    return { tipo: a.type as TipoAlerta, entidad: a.entity, regla: a.rule, causa: a.cause }
  })
}
