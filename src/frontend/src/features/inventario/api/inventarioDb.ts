import { db } from '@/db/dexieDb';
import { ahoraISO } from '@/utils/clock';
import { ErrorDominio } from '@/utils/errores';

// ---- Libro de movimientos (RF08) ----

/** Disponible = recibido − consumido. Nunca se guarda como número suelto. */
export async function disponibleKg(lotCode: string): Promise<number> {
  const movs = await db.movimientos.where('lotCode').equals(lotCode).toArray()
  return movs.reduce((acc, m) => acc + (m.tipo === 'RECIBIDO' ? m.kg : -m.kg), 0)
}

export async function registrarMovimientoRecibido(lotCode: string, kg: number): Promise<void> {
  await db.movimientos.add({ lotCode, tipo: 'RECIBIDO', kg, fecha: ahoraISO() })
}

/**
 * Consume existencia en una sola transacción: valida y escribe juntos.
 * Misma clave = misma operación: devuelve aplicado=false sin consumir de nuevo.
 */
export async function consumirExistencia(i: {
  lotCode: string
  kg: number
  claveIdempotencia: string
}): Promise<{ aplicado: boolean }> {
  return db.transaction('rw', db.movimientos, async () => {
    const previo = await db.movimientos.where('claveIdempotencia').equals(i.claveIdempotencia).first()
    if (previo) return { aplicado: false }

    const disponible = await disponibleKg(i.lotCode)
    if (i.kg > disponible) {
      throw new ErrorDominio(
        'EXISTENCIA_INSUFICIENTE',
        `No se registró el consumo. Solicitó ${i.kg} kg y el lote ${i.lotCode} tiene ${disponible} kg disponibles. Reduzca la cantidad a ${disponible} kg o menos.`,
      )
    }
    await db.movimientos.add({
      lotCode: i.lotCode,
      tipo: 'CONSUMIDO',
      kg: i.kg,
      fecha: ahoraISO(),
      claveIdempotencia: i.claveIdempotencia,
    })
    return { aplicado: true }
  })
}
