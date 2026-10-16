import { describe, expect, it } from 'vitest'
import { generarCsv, filtrarLotes } from './csv'
import { construirFilas } from './resumen'

const fila = { codigo: 'CAC001', origen: 'Rivera', recibidoKg: 100, consumidoKg: 100, disponibleKg: 0, estado: 'PENDIENTE', costoUnitario: 20000 } as const

describe('generarCsv', () => {
  it('escribe encabezado y una fila', () => {
    expect(generarCsv([fila])).toBe(
      'Codigo,Origen,Recibido_kg,Consumido_kg,Disponible_kg,Estado,CostoUnitario_COP_kg\r\nCAC001,Rivera,100,100,0,PENDIENTE,20000',
    )
  })
  it('escapa comas, comillas y saltos de línea', () => {
    const csv = generarCsv([{ ...fila, origen: 'Vereda "El Sol", Rivera\nHuila' }])
    expect(csv).toContain('"Vereda ""El Sol"", Rivera\nHuila"')
  })
  it.each(['=SUMA(A1)', '+1', '-1', '@cmd', '\tx'])('neutraliza texto que Excel leería como fórmula (%j)', (origen) => {
    const linea = generarCsv([{ ...fila, origen }]).split('\r\n')[1]
    expect(linea.split(',')[1].replace(/^"/, '').startsWith("'")).toBe(true)
  })
  it('no altera los números', () => {
    expect(generarCsv([{ ...fila, costoUnitario: -5 }]).endsWith(',-5')).toBe(true)
  })
  it('costo no calculable queda vacío', () => {
    expect(generarCsv([{ ...fila, costoUnitario: null }]).endsWith('PENDIENTE,')).toBe(true)
  })
  it('lista vacía devuelve solo el encabezado', () => {
    expect(generarCsv([])).toBe('Codigo,Origen,Recibido_kg,Consumido_kg,Disponible_kg,Estado,CostoUnitario_COP_kg')
  })
})

describe('filtrarLotes', () => {
  const lotes = [
    { origin: 'Rivera', status: 'LIBERADO' as const },
    { origin: 'Rivera', status: 'BLOQUEADO' as const },
    { origin: 'Algeciras', status: 'LIBERADO' as const },
    { origin: 'Rivera' },
  ]
  it('sin filtros devuelve todo', () => expect(filtrarLotes(lotes, {})).toHaveLength(4))
  it('por origen y estado combinados', () => expect(filtrarLotes(lotes, { origen: 'Rivera', estado: 'LIBERADO' })).toHaveLength(1))
  it('un lote sin estado cuenta como PENDIENTE', () => expect(filtrarLotes(lotes, { estado: 'PENDIENTE' })).toEqual([{ origin: 'Rivera' }]))
})

describe('construirFilas', () => {
  const lotes = [{ lotCode: 'CAC001', origin: 'Rivera', status: 'LIBERADO' as const }, { lotCode: 'CAC002', origin: 'Algeciras' }]
  const movs = [
    { lotCode: 'CAC001', tipo: 'RECIBIDO' as const, kg: 100, fecha: 'x' },
    { lotCode: 'CAC001', tipo: 'CONSUMIDO' as const, kg: 40, fecha: 'x' },
    { lotCode: 'CAC002', tipo: 'RECIBIDO' as const, kg: 150, fecha: 'x' },
  ]
  const procesos = [{ lotCode: 'CAC001', outputQty: 80, costoTotalCOP: 1_600_000 }]
  it('deriva recibido, consumido, disponible y costo unitario', () => {
    const [a, b] = construirFilas(lotes, movs, procesos)
    expect(a).toMatchObject({ codigo: 'CAC001', recibidoKg: 100, consumidoKg: 40, disponibleKg: 60, estado: 'LIBERADO', costoUnitario: 20000 })
    expect(b).toMatchObject({ codigo: 'CAC002', disponibleKg: 150, estado: 'PENDIENTE', costoUnitario: null })
  })
})
