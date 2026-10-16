import { validarCOP, validarKg } from '@/utils/validacion'

interface EntradaTransformacion {
  entradaKg: number
  salidaKg: number
  disponibleKg: number
  justificacion?: string
}

/**
 * Valida una transformación contra la existencia del lote.
 * Devuelve mensajes listos para mostrar (qué pasó, por qué importa, qué hacer); vacío = válida.
 */
export function validarTransformacion(i: EntradaTransformacion): string[] {
  const errores: string[] = []

  if (!Number.isFinite(i.entradaKg) || i.entradaKg <= 0) {
    errores.push(
      'No se registró la transformación. La cantidad de entrada no es válida y no se puede calcular la merma. Ingrese un número mayor a 0 kg.',
    )
  } else if (i.entradaKg > i.disponibleKg) {
    errores.push(
      `No se registró la transformación. Solicitó ${i.entradaKg} kg y el lote tiene ${i.disponibleKg} kg disponibles. Reduzca la cantidad a ${i.disponibleKg} kg o menos.`,
    )
  }

  if (!Number.isFinite(i.salidaKg) || i.salidaKg <= 0) {
    errores.push(
      'No se registró la transformación. La cantidad de salida no es válida y no se puede calcular el costo unitario. Ingrese un número mayor a 0 kg.',
    )
  } else if (Number.isFinite(i.entradaKg) && i.salidaKg > i.entradaKg && !i.justificacion?.trim()) {
    errores.push(
      'No se registró la transformación. La salida supera la entrada y el balance de masa no cierra sin explicación. Escriba la justificación, por ejemplo adición de insumos.',
    )
  }

  return errores
}

export type CampoCifra = 'entrada' | 'salida' | 'costo' | 'precio'

/** Valida cada cifra por separado: un opcional con basura bloquea el envío en lugar de viajar como "sin dato". */
export function validarCifrasProceso(v: Record<CampoCifra, string>) {
  const entrada = validarKg(v.entrada, 'La cantidad de entrada')
  const salida = validarKg(v.salida, 'La salida vendible')
  const costo = validarCOP(v.costo, { opcional: true, campo: 'El costo total de la etapa' })
  const precio = validarCOP(v.precio, { opcional: true, campo: 'El precio de venta' })
  const errores: Partial<Record<CampoCifra, string>> = {}
  if ('error' in entrada) errores.entrada = entrada.error
  if ('error' in salida) errores.salida = salida.error
  if ('error' in costo) errores.costo = costo.error
  if ('error' in precio) errores.precio = precio.error
  return { errores, valores: { entrada, salida, costo, precio } }
}

