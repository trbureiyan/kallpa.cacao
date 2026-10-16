import { Icon } from "./index"
import type { EstadoConexion } from "./conexion"
import type { EstadoLote, IconName } from "@/types/app"

// Etiquetas de estado en un solo lugar (AGENTS.md): ningún componente las escribe suelto.
const ESTADOS: Record<EstadoLote, { texto: string; icono: IconName; clase: string }> = {
  PENDIENTE: { texto: "Pendiente", icono: "clock", clase: "chip-pendiente" },
  LIBERADO: { texto: "Liberado", icono: "check", clase: "chip-liberado" },
  BLOQUEADO: { texto: "Bloqueado", icono: "lock", clase: "chip-bloqueado" },
}

/** Estado del lote: color + icono + texto, nunca solo color. */
export function ChipEstado({ estado }: { estado: EstadoLote }) {
  const e = ESTADOS[estado]
  return (
    <span className={`chip ${e.clase}`}>
      <Icon name={e.icono} size={14} />
      {e.texto}
    </span>
  )
}

/** Código del lote en monoespaciada; es el rasgo más repetido de la marca. */
export function SelloLote({ codigo }: { codigo: string }) {
  return <span className="sello">{codigo}</span>
}

/** Punto de 10 px + texto, siempre ambos. role=status anuncia el cambio sin robar el foco. */
export function IndicadorConexion({ estado, pendientes }: { estado: EstadoConexion; pendientes: number }) {
  const texto: Record<EstadoConexion, string> = {
    sin_red: "Sin conexión",
    conectando: "Conectando con el servidor...",
    no_responde: "El servidor no responde",
    pendiente: `${pendientes} por enviar`,
    sincronizado: "Sincronizado",
    error: "Error al sincronizar",
    descartado: "Descartado",
  }
  return (
    <span role="status" className={`conexion conexion-${estado.replace("_", "-")}`}>
      <span className="conexion-punto" aria-hidden="true" />
      {texto[estado]}
    </span>
  )
}
