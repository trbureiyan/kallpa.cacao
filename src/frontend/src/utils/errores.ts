// Error de dominio: el mensaje ya viene listo para mostrarse al usuario.
export class ErrorDominio extends Error {
  readonly codigo: string
  constructor(codigo: string, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorDominio'
    this.codigo = codigo
  }
}
