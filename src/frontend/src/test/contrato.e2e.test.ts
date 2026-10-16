// Prueba de contrato contra la API REAL. Se omite sin E2E_API para no depender de un servidor en CI.
// Uso (con la API en http://localhost:8000 y datos de demostración):
//   E2E_API=1 pnpm exec vitest run src/test/contrato.e2e.test.ts
// Cada ejecución crea lotes nuevos en la base de la API: apúntela a una base de pruebas, nunca a datos reales.
import { beforeAll, describe, expect, it } from 'vitest'
import { iniciarSesionApi } from '@/api/autenticacion'
import { axiosClient } from '@/api/axiosClient'
import { guardarToken } from '@/api/token'
import { listarAlertasApi } from '@/features/alertas/api/alertasApi'
import { listarAuditoriaApi } from '@/features/auditoria/api/auditoriaApi'
import { listarEconomiaApi } from '@/features/economia/api/economiaApi'
import { obtenerFichaPublica } from '@/features/ficha-comercial/api/fichaApi'
import { listarFilasApi } from '@/features/inventario/api/inventarioApi'
import { cargarFincas } from '@/features/recepcion/api/fincasApi'
import { encolarRecepcionApi } from '@/features/recepcion/api/recepcionDb'
import { sincronizarRecepcionesPendientes } from '@/features/recepcion/api/recepcionSync'
import { descargarCsvApi } from '@/features/reportes/exportApi'
import { cambiarEstadoApi } from '@/features/estados/api/estadosApi'
import { listarProcesosApi, registrarProcesoApi } from '@/features/transformacion/api/procesoApi'
import { obtenerTrazabilidadApi } from '@/features/trazabilidad/api/trazabilidadApi'
import { db } from '@/db/dexieDb'
import { limpiarDb } from '@/test/limpiarDb'

const ADMIN = { usuario: import.meta.env.E2E_ADMIN ?? 'admin', clave: import.meta.env.E2E_ADMIN_CLAVE ?? 'Admin123!' }
const OPERADOR = { usuario: import.meta.env.E2E_OPERADOR ?? 'operador', clave: import.meta.env.E2E_OPERADOR_CLAVE ?? 'Operador123!' }

describe.skipIf(!process.env.E2E_API)('contrato con la API real', () => {
  let crudo = ''
  let salida = ''
  const clave = crypto.randomUUID()
  const hoy = new Date().toLocaleDateString('sv-SE')

  beforeAll(async () => {
    await limpiarDb()
    guardarToken(null)
  })

  it('administrador inicia sesión y recibe el rol traducido', async () => {
    expect(await iniciarSesionApi(ADMIN.usuario, ADMIN.clave)).toMatchObject({ rol: 'ADMINISTRADOR' })
  })

  it('credenciales incorrectas dan error de credenciales', async () => {
    await expect(iniciarSesionApi(ADMIN.usuario, 'incorrecta')).rejects.toMatchObject({ codigo: 'CREDENCIALES' })
    await iniciarSesionApi(ADMIN.usuario, ADMIN.clave)
  })

  it('recepción: se encola, se sincroniza y el servidor asigna el código CACxxx', async () => {
    const fincas = await cargarFincas()
    expect(fincas.length).toBeGreaterThan(0)
    await encolarRecepcionApi({ farmId: fincas[0].id, farmName: fincas[0].name, region: fincas[0].region, date: hoy, quantity: 100, purchaseTotalCop: 1_200_000 })
    expect(await sincronizarRecepcionesPendientes('api')).toBe(1)
    const [l] = await db.recepciones.toArray()
    expect(l.syncStatus).toBe('SYNCED')
    expect(l.lotCode).toMatch(/^CAC\d+/)
    crudo = l.lotCode
  })

  it('el inventario del administrador muestra el lote con 100 kg disponibles', async () => {
    const f = (await listarFilasApi('ADMINISTRADOR')).find((x) => x.codigo === crudo)
    expect(f).toMatchObject({ recibidoKg: 100, consumidoKg: 0, disponibleKg: 100, estado: 'PENDIENTE' })
  })

  it('transformación 100 → 80 kg: baja el disponible y reenviar con la misma clave no consume otra vez', async () => {
    const datos = { lotCode: crudo, stage: 'SECADO', inputQty: 100, outputQty: 80, responsible: 'x', costoTotalCOP: 1_600_000, precioVentaCOP: 25_000, claveIdempotencia: clave, ocurridoEn: new Date().toISOString() }
    const r = await registrarProcesoApi('ADMINISTRADOR', datos)
    salida = r.outputCode
    expect(salida).toContain(crudo)
    const antes = (await listarFilasApi('ADMINISTRADOR')).find((x) => x.codigo === crudo)
    expect(antes?.disponibleKg).toBe(0)
    // reintento tras perder la respuesta: debe devolver lo mismo, sin error y sin doble consumo
    await expect(registrarProcesoApi('ADMINISTRADOR', datos)).resolves.toEqual({ outputCode: salida })
    expect((await listarFilasApi('ADMINISTRADOR')).find((x) => x.codigo === crudo)?.disponibleKg).toBe(0)
  })

  it('consumir más que la existencia lo rechaza el servidor', async () => {
    await expect(
      registrarProcesoApi('ADMINISTRADOR', { lotCode: crudo, stage: 'SECADO', inputQty: 10, outputQty: 8, responsible: 'x', claveIdempotencia: crypto.randomUUID() }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/existencia|disponible/i) })
  })

  it('el historial trae la merma de 20 % y su alerta', async () => {
    const p = (await listarProcesosApi('ADMINISTRADOR')).find((x) => x.lotCode === crudo)
    expect(p).toMatchObject({ inputQty: 100, outputQty: 80, shrinkagePercent: 20 })
    expect(p?.alertas.map((a) => a.tipo)).toContain('merma')
  })

  it('trazabilidad del producto: origen, recepción y etapa', async () => {
    const t = await obtenerTrazabilidadApi('ADMINISTRADOR', salida)
    const titulos = t?.steps.map((s) => s.title) ?? []
    expect(titulos).toContain('Origen en finca')
    expect(titulos).toContain('Recepción del lote')
    expect(titulos.some((x) => x.startsWith('Transformación'))).toBe(true)
  })

  it('economía: 20.000 COP/kg y margen de 20 %', async () => {
    const e = await listarEconomiaApi()
    expect(e.porCodigo[salida]).toEqual({ costoUnitario: 20000, margenPct: 20 })
    expect(e.formula).toBeTruthy()
  })

  it('bloquear con motivo y liberar el producto; la ficha pública los refleja sin costos', async () => {
    await cambiarEstadoApi({ lotCode: crudo, nuevo: 'BLOQUEADO', motivo: 'Reclamo del comprador', rol: 'ADMINISTRADOR' })
    await cambiarEstadoApi({ lotCode: salida, nuevo: 'LIBERADO', motivo: 'Cumple calidad', rol: 'ADMINISTRADOR' })
    expect(await obtenerFichaPublica(crudo, { permitirLocal: false })).toMatchObject({ estado: 'BLOQUEADO', ofrecible: false })
    const ficha = await obtenerFichaPublica(salida, { permitirLocal: false })
    expect(ficha).toMatchObject({ estado: 'LIBERADO', ofrecible: true })
    expect(JSON.stringify(ficha)).not.toMatch(/1600000|20000|25000|costo/i)
    expect(Object.keys(ficha ?? {}).sort()).toEqual(['codigo', 'estado', 'etapas', 'fechaRecepcion', 'ofrecible', 'origen'])
  })

  it('auditoría global: bloqueo con motivo, liberación y proceso, con código de lote legible', async () => {
    const a = await listarAuditoriaApi()
    expect(a.find((x) => x.action === 'BLOQUEO' && x.lotCode === crudo)?.reason).toBe('Reclamo del comprador')
    expect(a.some((x) => x.action === 'LIBERACIÓN')).toBe(true)
    expect(a.some((x) => x.action === 'PROCESO' && x.lotCode === crudo)).toBe(true)
    expect(a.every((x) => !x.lotCode.startsWith('Lote '))).toBe(true)
  })

  it('alertas del servidor: merma con regla y causa', async () => {
    const m = (await listarAlertasApi()).find((x) => x.tipo === 'merma' && x.entidad === salida)
    expect(m?.regla).toMatch(/15/)
    expect(m?.causa).toBeTruthy()
  })

  it('CSV del servidor incluye el lote', async () => {
    const csv = await descargarCsvApi({})
    expect(csv).toContain('identificador')
    expect(csv).toContain(crudo)
  })

  it('operador: ve existencias sin recibido ni consumido y se le niega lo de administrador', async () => {
    await iniciarSesionApi(OPERADOR.usuario, OPERADOR.clave)
    const f = (await listarFilasApi('OPERADOR')).find((x) => x.codigo === salida)
    expect(f?.recibidoKg).toBeNull()
    await expect(cambiarEstadoApi({ lotCode: salida, nuevo: 'BLOQUEADO', motivo: 'intento', rol: 'OPERADOR' })).rejects.toMatchObject({ codigo: 'PERMISO_DENEGADO' })
    // saltando la regla local: el servidor también lo niega
    await expect(axiosClient.patch('/lots/1/status', { status: 'blocked', reason: 'intento' })).rejects.toMatchObject({ response: { status: 403 } })
    await expect(listarAuditoriaApi()).rejects.toMatchObject({ codigo: 'PERMISO' })
    await expect(listarAlertasApi()).rejects.toMatchObject({ codigo: 'PERMISO' })
    await expect(listarEconomiaApi()).rejects.toMatchObject({ codigo: 'PERMISO' })
    await expect(descargarCsvApi({})).rejects.toMatchObject({ codigo: 'PERMISO' })
  })
})
