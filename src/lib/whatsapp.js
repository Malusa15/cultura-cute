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

// Mensaje del formulario de personalización de la home. La idea es que llegue
// con todo lo necesario para presupuestar sin tener que preguntar de vuelta,
// así se puede cargar derecho en la solapa Presupuestos del panel.
export function mensajePersonalizacion(datos) {
  const lineas = [
    '¡Hola Cultura.Cute! Quiero personalizar una prenda:',
    '',
    `Prenda: ${datos.prenda}`,
    `Qué quiero personalizar: ${datos.alcance}`,
  ]

  if (datos.detalles.length) lineas.push(`Apliques y detalles: ${datos.detalles.join(', ')}`)
  if (datos.talle) lineas.push(`Talle habitual: ${datos.talle}`)

  lineas.push('', `Soy ${datos.nombre}`)
  if (datos.contacto) lineas.push(`Contacto: ${datos.contacto}`)
  if (datos.comentario) lineas.push('', datos.comentario)

  return lineas.join('\n')
}
