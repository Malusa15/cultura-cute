import { MARCA } from '../data/marca.js'
import { fechaCorta, precio } from './formato.js'

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

// Mensaje del formulario de prendas a pedido. `numero` es el del presupuesto
// que quedó en borrador en el panel: es lo que permite encontrar el chat en la
// solapa Presupuestos. Si la base falló llega en null y el mensaje sale igual.
export function mensajePedidoAMedida(datos, numero = null) {
  const lineas = [
    numero
      ? `¡Hola Cultura.Cute! Quiero pedir una prenda a medida (presupuesto #${numero}):`
      : '¡Hola Cultura.Cute! Quiero pedir una prenda a medida:',
    '',
    `Prenda: ${datos.prenda}`,
    datos.tipo,
  ]

  if (datos.referencia) lineas.push(`Referencia: ${datos.referencia}`)
  if (datos.cambios.length) lineas.push(`Le cambiaría: ${datos.cambios.join(', ')}`)
  if (datos.talle) lineas.push(`Talle habitual: ${datos.talle}`)
  // Sin formatear salía la fecha cruda de la base ("2026-12-20").
  if (datos.fechaEntrega) lineas.push(`La necesito para: ${fechaCorta(datos.fechaEntrega)}`)

  lineas.push('', `Soy ${datos.nombre}`)
  if (datos.contacto) lineas.push(`Contacto: ${datos.contacto}`)
  if (datos.comentario) lineas.push('', datos.comentario)

  return lineas.join('\n')
}

// Mensaje del formulario de personalización de la home. `numero` es el del
// presupuesto que quedó en borrador en el panel, igual que en prendas a pedido:
// es lo que permite encontrar el chat en la solapa Presupuestos.
export function mensajePersonalizacion(datos, numero = null) {
  const lineas = [
    numero
      ? `¡Hola Cultura.Cute! Quiero personalizar una prenda (presupuesto #${numero}):`
      : '¡Hola Cultura.Cute! Quiero personalizar una prenda:',
    '',
    `Prenda: ${datos.prenda}`,
  ]

  // Con la Cutie no viajan ni el alcance ni los apliques: el sentido es
  // justamente que los elija la marca.
  if (datos.cutie) {
    lineas.push('PERSONALIZACIÓN CUTIE: la intervienen ustedes a su criterio.')
  } else {
    lineas.push(`Qué quiero personalizar: ${datos.alcance}`)
    if (datos.detalles.length) lineas.push(`Apliques y detalles: ${datos.detalles.join(', ')}`)
  }

  if (datos.talle) lineas.push(`Talle habitual: ${datos.talle}`)

  lineas.push('', `Soy ${datos.nombre}`)
  if (datos.contacto) lineas.push(`Contacto: ${datos.contacto}`)
  if (datos.comentario) lineas.push('', datos.comentario)

  return lineas.join('\n')
}
