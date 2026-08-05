import { MARCA } from '../data/marca.js'
import { precio } from './formato.js'

// wa.me abre WhatsApp Web en desktop y la app en el celular, con el texto ya cargado.
export function linkWhatsApp(mensaje = '') {
  const base = `https://wa.me/${MARCA.whatsapp}`
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base
}

// Mensaje del checkout. `items` son las lineas del carrito ya resueltas contra
// el catalogo (ver CarritoContext). `numero` es el del pedido que quedo guardado
// en la base: es lo que permite encontrar el chat en la solapa Ventas del panel.
export function mensajePedido(items, total, numero = null) {
  const lineas = items.map(
    (item) =>
      `- ${item.producto.nombre} (talle ${item.talle}) x${item.cantidad} — ${precio(
        item.producto.precio * item.cantidad,
      )}`,
  )

  return [
    numero ? `¡Hola! Quiero comprar (pedido #${numero}):` : '¡Hola! Quiero comprar:',
    ...lineas,
    '',
    `Total: ${precio(total)}`,
  ].join('\n')
}

export function mensajeConsulta(texto) {
  return texto
}
