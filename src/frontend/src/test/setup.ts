import 'fake-indexeddb/auto'

// jsdom no implementa <dialog>.showModal(); lo simulamos con el atributo open.
// El foco atrapado y Esc son del navegador y se comprueban a mano.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}
