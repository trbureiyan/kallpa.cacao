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
