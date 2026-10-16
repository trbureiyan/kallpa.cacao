// [DECISION] navigator.onLine solo dice si hay interfaz de red, no si el servidor contesta. Render (plan gratuito)
// duerme el contenedor y tarda cerca de un minuto en despertar: sin sondeo eso se veía como "Sin conexión".
// Por eso se distinguen cuatro estados y se sondea /health con retroceso hasta que responda.
export type EstadoServidor = 'en_linea' | 'conectando' | 'sin_red' | 'no_responde'

const ESPERAS_MS = [2000, 4000, 8000, 15000, 30000]
/** Pasado este tiempo sin respuesta ya no parece un arranque en frío; se sigue reintentando igual. */
export const LIMITE_ARRANQUE_MS = 90_000
/** Espera de cada sondeo: debe cubrir el arranque en frío completo. */
export const ESPERA_SONDEO_MS = 60_000

export function esperaReintento(intento: number): number {
  return ESPERAS_MS[Math.min(intento, ESPERAS_MS.length - 1)]
}

/** /health vive en la raíz del servidor, fuera del prefijo /api/v1. */
export function urlSalud(baseApi: string): string {
  return `${baseApi.replace(/\/+$/, '').replace(/\/api\/v\d+$/, '')}/health`
}

interface OpcionesMonitor {
  sondear: () => Promise<boolean>
  navegadorEnLinea: () => boolean
  ahora: () => number
  alCambiar: (estado: EstadoServidor) => void
}

export function crearMonitor({ sondear, navegadorEnLinea, ahora, alCambiar }: OpcionesMonitor) {
  let estado: EstadoServidor | null = null
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let fallos = 0
  let primerFallo: number | null = null
  let corrida = 0
  let activo = false

  const fijar = (nuevo: EstadoServidor) => {
    if (nuevo === estado) return
    estado = nuevo
    alCambiar(nuevo)
  }

  const cancelar = () => {
    clearTimeout(temporizador)
    temporizador = undefined
  }

  async function intentar() {
    cancelar()
    if (!activo) return
    if (!navegadorEnLinea()) {
      fijar('sin_red')
      return
    }
    // en línea se mantiene mientras se comprueba: solo un fallo confirmado lo cambia
    if (estado === null || estado === 'sin_red') fijar('conectando')
    const mia = ++corrida
    const respondio = await sondear().catch(() => false)
    // un sondeo más nuevo o un detener() invalidan este resultado
    if (!activo || mia !== corrida) return
    if (respondio) {
      fallos = 0
      primerFallo = null
      fijar('en_linea')
      return
    }
    if (!navegadorEnLinea()) {
      fijar('sin_red')
      return
    }
    primerFallo ??= ahora()
    fijar(ahora() - primerFallo >= LIMITE_ARRANQUE_MS ? 'no_responde' : 'conectando')
    temporizador = setTimeout(() => void intentar(), esperaReintento(fallos))
    fallos++
  }

  return {
    iniciar() {
      activo = true
      void intentar()
    },
    /** Al volver la red o al fallar una petición sin respuesta. */
    sondearYa() {
      if (activo) void intentar()
    },
    /** El navegador avisó que perdió la red: no tiene sentido sondear hasta que vuelva. */
    sinRed() {
      cancelar()
      corrida++
      fijar('sin_red')
    },
    detener() {
      activo = false
      corrida++
      cancelar()
    },
  }
}
