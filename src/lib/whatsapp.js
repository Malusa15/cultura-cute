import { MARCA } from '../data/marca.js'
import { precio } from './formato.js'

// wa.me abre WhatsApp Web en desktop y la app en el celular, con el texto ya cargado.
export function linkWhatsApp(mensaje = '') {
  const base = `https://wa.me/${MARCA.whatsapp}`
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base
}

// Mensaje del checkout. `items` son las lineas del carrito ya resueltas contra
// el catalogo (ver CarritoContext).
export function mensajePedido(items, total) {
  const lineas = items.map(
    (item) =>
      `- ${item.producto.nombre} (talle ${item.talle}) x${item.cantidad} — ${precio(
        item.producto.precio * item.cantidad,
      )}`,
  )

  return ['¡Hola! Quiero comprar:', ...lineas, '', `Total: ${precio(total)}`].join('\n')
}

export function mensajeConsulta(texto) {
  return texto
}
