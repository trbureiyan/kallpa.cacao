import { isAxiosError } from 'axios'
import { ErrorDominio } from '@/utils/errores'

// FastAPI manda `detail` como texto (errores de dominio) o como lista (validación de esquema).
function detalleTexto(data: unknown): string | null {
  const detail = (data as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => `${(d.loc ?? []).slice(1).join('.') || 'dato'}: ${d.msg ?? 'no válido'}`)
      .join('; ')
  }
  return null
}

export function traducirErrorApi(e: unknown): ErrorDominio {
  if (e instanceof ErrorDominio) return e
  if (!isAxiosError(e)) {
    return new ErrorDominio('DESCONOCIDO', 'No se pudo completar la operación. Ocurrió un error inesperado. Intente de nuevo y, si persiste, avise al administrador.')
  }
  if (!e.response) {
    return new ErrorDominio('SIN_RED', 'No se pudo contactar al servidor. Sin conexión no se puede completar esta acción. Revise la red e intente de nuevo.')
  }
  const { status, data } = e.response
  const detalle = detalleTexto(data)
  switch (status) {
    case 401:
      return new ErrorDominio('SESION', 'Su sesión no es válida o venció. Por seguridad se cerró. Inicie sesión de nuevo.')
    case 403:
      return new ErrorDominio('PERMISO', 'Su rol no permite esta acción. Solo otro rol puede hacerla. Pídala a un administrador.')
    case 404:
      return new ErrorDominio('NO_ENCONTRADO', `No se encontró lo solicitado${detalle ? `: ${detalle}` : ''}. Revise el código e intente de nuevo.`)
    case 409:
      return new ErrorDominio('CONFLICTO', `No se registró la operación. ${detalle ?? 'Choca con un dato existente.'} Revise los datos y corrija antes de reintentar.`)
    case 422:
      return new ErrorDominio('VALIDACION', `Hay datos que no son válidos. ${detalle ?? 'El servidor los rechazó.'} Corríjalos y envíe de nuevo.`)
    default:
      return new ErrorDominio('SERVIDOR', 'El servidor no pudo atender la solicitud. No se perdió ningún dato guardado. Intente de nuevo en unos minutos.')
  }
}
