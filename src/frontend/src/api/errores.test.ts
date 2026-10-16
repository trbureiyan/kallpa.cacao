import { AxiosError, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { ErrorDominio } from '@/utils/errores'
import { traducirErrorApi } from './errores'

const conRespuesta = (status: number, data: unknown) =>
  new AxiosError('x', 'ERR', undefined, undefined, { status, data } as AxiosResponse)

describe('traducirErrorApi', () => {
  it('conserva un ErrorDominio tal cual', () => {
    const e = new ErrorDominio('X', 'ya listo')
    expect(traducirErrorApi(e)).toBe(e)
  })
  it('409 muestra el detalle del servidor y qué hacer', () => {
    const r = traducirErrorApi(conRespuesta(409, { detail: 'Existencia insuficiente: disponible 100 kg' }))
    expect(r.codigo).toBe('CONFLICTO')
    expect(r.message).toContain('Existencia insuficiente: disponible 100 kg')
    expect(r.message).toMatch(/Revise/)
  })
  it('422 con lista de errores nombra el campo y no vuelca el JSON', () => {
    const r = traducirErrorApi(conRespuesta(422, { detail: [{ loc: ['body', 'quantity_kg'], msg: 'Input should be greater than 0' }] }))
    expect(r.codigo).toBe('VALIDACION')
    expect(r.message).toContain('quantity_kg')
    expect(r.message).not.toContain('{')
  })
  it.each([
    [401, 'SESION'],
    [403, 'PERMISO'],
    [404, 'NO_ENCONTRADO'],
    [500, 'SERVIDOR'],
  ])('%i se traduce a %s', (status, codigo) => {
    expect(traducirErrorApi(conRespuesta(status, { detail: 'interno' })).codigo).toBe(codigo)
  })
  it('500 no expone el detalle interno', () => {
    expect(traducirErrorApi(conRespuesta(500, { detail: 'Traceback psycopg2' })).message).not.toContain('psycopg2')
  })
  it('sin respuesta es SIN_RED', () => {
    expect(traducirErrorApi(new AxiosError('Network Error', 'ERR_NETWORK')).codigo).toBe('SIN_RED')
  })
  it('un error desconocido no filtra su texto', () => {
    const r = traducirErrorApi(new Error('boom interno'))
    expect(r.codigo).toBe('DESCONOCIDO')
    expect(r.message).not.toContain('boom')
  })
})
