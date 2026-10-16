import { isAxiosError } from 'axios'
import { axiosClient } from '@/api/axiosClient'
import { traducirErrorApi } from '@/api/errores'
import { estadoDeApi, numero } from '@/api/mapeos'
import { idDeLote } from '@/features/inventario/api/inventarioApi'
import type { RolUsuario } from '@/types/app'
import { calcularMerma } from '@/utils/calculations'
import { formatearKg, formatearPct } from '@/utils/formato'
import type { TimelineStep, TraceInfo } from './trazabilidadDb'

type Num = number | string | null | undefined
interface LoteDto { id: number; code: string; origin: string; received_on: string; received_quantity: Num; status: string; status_reason?: string | null }
interface TransformacionDto { id: number; stage: string; occurred_at: string; input_quantity: Num }
interface Subida { transformation: TransformacionDto; output_lot?: LoteDto }
interface Bajada { transformation: TransformacionDto; outputs?: { quantity: Num }[] }
interface TrazaDto {
  lot: LoteDto
  producer?: { name: string }
  origin_lots: { lot: LoteDto; producer?: { name: string } }[]
  upstream_transformations: Subida[]
  downstream_transformations: Bajada[]
  current_inventory: Num
}

function pasoEtapa(t: TransformacionDto, salida: number | null): TimelineStep {
  const entrada = numero(t.input_quantity)
  const merma = entrada !== null && salida !== null ? calcularMerma(entrada, salida) : null
  return {
    title: `Transformación (${t.stage})`,
    description: `Entrada: ${entrada === null ? 'sin dato' : formatearKg(entrada)} · Salida: ${
      salida === null ? 'sin dato' : formatearKg(salida)
    } · Merma: ${merma === null ? 'no calculable' : formatearPct(merma)}`,
    date: t.occurred_at.slice(0, 10),
    icon: 'process',
  }
}

/** Recorrido del lote según el servidor. null si el código no existe. */
export async function obtenerTrazabilidadApi(rol: RolUsuario, codigo: string): Promise<TraceInfo | null> {
  const id = await idDeLote(rol, codigo)
  if (id === null) return null

  let d: TrazaDto
  try {
    d = (await axiosClient.get<TrazaDto>(`/lots/${id}/traceability`)).data
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return null
    throw traducirErrorApi(e)
  }

  // cada lote de origen conserva su propia pareja origen + recepción (mezcla de lotes)
  const origenes: TimelineStep[] = d.origin_lots.flatMap(({ lot, producer }) => [
    { title: 'Origen en finca', description: `${producer?.name ?? 'Productor sin nombre'} · ${lot.origin}`, date: lot.received_on, icon: 'sprout' as const },
    {
      title: 'Recepción del lote',
      description: `${lot.code} · Peso recibido: ${formatearKg(numero(lot.received_quantity) ?? 0)}`,
      date: lot.received_on,
      icon: 'box' as const,
    },
  ])

  // la misma etapa puede venir por la subida y por la bajada: se muestra una vez
  const etapas = new Map<number, TimelineStep>()
  for (const s of d.upstream_transformations) {
    etapas.set(s.transformation.id, pasoEtapa(s.transformation, numero(s.output_lot?.received_quantity)))
  }
  for (const b of d.downstream_transformations) {
    if (etapas.has(b.transformation.id)) continue
    const salidas = (b.outputs ?? []).map((o) => numero(o.quantity))
    etapas.set(b.transformation.id, pasoEtapa(b.transformation, salidas.length && salidas.every((n) => n !== null) ? salidas.reduce((a, n) => a + (n as number), 0) : null))
  }

  const estado = estadoDeApi(d.lot.status)
  const cambioEstado: TimelineStep[] =
    estado === 'PENDIENTE'
      ? []
      : [
          {
            title: `Estado: ${estado}`,
            description: d.lot.status_reason || 'Sin motivo registrado',
            date: '',
            icon: estado === 'BLOQUEADO' ? 'lock' : 'certificate',
          },
        ]

  const ordenadas = [...etapas.values()].sort((a, b) => a.date.localeCompare(b.date))
  return {
    lotCode: d.lot.code,
    producer: d.producer?.name ?? 'Productor sin nombre',
    origin: `${d.lot.origin}, Huila`,
    availableQty: numero(d.current_inventory) ?? 0,
    status: estado,
    steps: [...origenes, ...ordenadas, ...cambioEstado],
  }
}
