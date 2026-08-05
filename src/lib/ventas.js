import { supabase } from './supabase.js'

// Capa de datos de las cuatro secciones nuevas del panel: ventas, encargos,
// reservas y envíos. El catálogo sigue viviendo en catalogo.js.
//
// Todo lo de acá pide sesión salvo `registrarPedido`, que es lo único que la
// tienda pública puede llamar (ver supabase/ventas.sql).

// --- Etiquetas ---------------------------------------------------------------
//
// Los estados se guardan en inglés-de-base ('en_proceso') y se muestran en
// castellano. Tenerlos acá evita repetir el mapeo en cada componente.

export const ESTADOS_VENTA = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
}

export const ESTADOS_ENCARGO = {
  pedido: 'Pedido',
  en_proceso: 'En proceso',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const ESTADOS_RESERVA = {
  activa: 'Activa',
  concretada: 'Concretada',
  cancelada: 'Cancelada',
  vencida: 'Vencida',
}

export const ESTADOS_ENVIO = {
  pendiente: 'Pendiente',
  despachado: 'Despachado',
  entregado: 'Entregado',
}

export const METODOS_ENVIO = {
  correo: 'Correo',
  moto: 'Moto / cadete',
  retiro: 'Retira en persona',
}

// --- Ventas ------------------------------------------------------------------

const SELECT_VENTA = `
  id, numero, origen, estado, cliente_nombre, cliente_contacto, total, notas, creada_en,
  venta_items ( id, producto_id, nombre, talle, cantidad, precio_unitario ),
  envios ( id, estado, metodo, seguimiento )
`

export async function traerVentas() {
  const { data, error } = await supabase
    .from('ventas')
    .select(SELECT_VENTA)
    .order('numero', { ascending: false })

  if (error) throw error

  return data.map((v) => ({
    ...v,
    items: v.venta_items ?? [],
    // La relación viene como array aunque el envío sea uno solo (unique en venta_id).
    envio: v.envios?.[0] ?? null,
  }))
}

// El trigger de la base es el que mueve el stock según el estado nuevo; acá solo
// se guarda el cambio.
export async function cambiarEstadoVenta(id, estado) {
  const { error } = await supabase.from('ventas').update({ estado }).eq('id', id)
  if (error) throw error
}

export async function guardarNotaVenta(id, notas) {
  const { error } = await supabase.from('ventas').update({ notas }).eq('id', id)
  if (error) throw error
}

export async function eliminarVenta(id) {
  // Los items y el envío se van solos por el on delete cascade.
  const { error } = await supabase.from('ventas').delete().eq('id', id)
  if (error) throw error
}

// Lo único que llama la tienda pública. Devuelve el número corto de pedido para
// poder nombrarlo en el chat.
export async function registrarPedido({ nombre, contacto, items }) {
  const { data, error } = await supabase.rpc('registrar_pedido', {
    p_cliente_nombre: nombre ?? null,
    p_cliente_contacto: contacto ?? null,
    p_items: items.map((item) => ({
      producto_id: item.productoId,
      talle: item.talle,
      cantidad: item.cantidad,
    })),
  })

  if (error) throw error
  return data?.[0] ?? null
}

// --- Encargos ----------------------------------------------------------------

export async function traerEncargos() {
  const { data, error } = await supabase
    .from('encargos')
    .select('*')
    .order('numero', { ascending: false })

  if (error) throw error
  return data
}

export async function guardarEncargo(encargo) {
  const fila = {
    cliente_nombre: encargo.cliente_nombre.trim(),
    cliente_contacto: encargo.cliente_contacto?.trim() || null,
    descripcion: encargo.descripcion.trim(),
    talle: encargo.talle?.trim() || null,
    precio_estimado: encargo.precio_estimado === '' ? null : Number(encargo.precio_estimado),
    sena: Number(encargo.sena) || 0,
    estado: encargo.estado,
    fecha_entrega: encargo.fecha_entrega || null,
    notas: encargo.notas?.trim() || null,
  }

  if (encargo.id) {
    const { error } = await supabase.from('encargos').update(fila).eq('id', encargo.id)
    if (error) throw error
    return encargo.id
  }

  const { data, error } = await supabase.from('encargos').insert(fila).select('id').single()
  if (error) throw error
  return data.id
}

export async function cambiarEstadoEncargo(id, estado) {
  const { error } = await supabase.from('encargos').update({ estado }).eq('id', id)
  if (error) throw error
}

export async function eliminarEncargo(id) {
  const { error } = await supabase.from('encargos').delete().eq('id', id)
  if (error) throw error
}

// --- Reservas ----------------------------------------------------------------

export async function traerReservas() {
  const { data, error } = await supabase
    .from('reservas')
    .select('*, productos ( nombre )')
    .order('numero', { ascending: false })

  if (error) throw error
  return data.map((r) => ({ ...r, producto_nombre: r.productos?.nombre ?? 'Prenda borrada' }))
}

// Al crear la reserva el trigger aparta el stock, así que la prenda deja de
// figurar disponible en la tienda.
export async function crearReserva(reserva) {
  const { error } = await supabase.from('reservas').insert({
    producto_id: reserva.producto_id,
    talle: reserva.talle,
    cantidad: Number(reserva.cantidad) || 1,
    cliente_nombre: reserva.cliente_nombre.trim(),
    cliente_contacto: reserva.cliente_contacto?.trim() || null,
    vence_en: reserva.vence_en || null,
    notas: reserva.notas?.trim() || null,
  })
  if (error) throw error
}

export async function cambiarEstadoReserva(id, estado) {
  const { error } = await supabase.from('reservas').update({ estado }).eq('id', id)
  if (error) throw error
}

export async function eliminarReserva(id) {
  const { error } = await supabase.from('reservas').delete().eq('id', id)
  if (error) throw error
}

// --- Envíos ------------------------------------------------------------------

export async function traerEnvios() {
  const { data, error } = await supabase
    .from('envios')
    .select('*, ventas ( numero, cliente_nombre, total )')
    .order('creado_en', { ascending: false })

  if (error) throw error
  return data.map((e) => ({ ...e, venta: e.ventas ?? null }))
}

// Las ventas que todavía no tienen envío armado: es lo que se ofrece al crear uno.
export async function traerVentasSinEnvio() {
  const { data, error } = await supabase
    .from('ventas')
    .select('id, numero, cliente_nombre, total, envios ( id )')
    .in('estado', ['confirmada', 'entregada'])
    .order('numero', { ascending: false })

  if (error) throw error
  return data.filter((v) => !v.envios?.length)
}

export async function guardarEnvio(envio) {
  const fila = {
    venta_id: envio.venta_id,
    metodo: envio.metodo,
    destinatario: envio.destinatario?.trim() || null,
    direccion: envio.direccion?.trim() || null,
    localidad: envio.localidad?.trim() || null,
    codigo_postal: envio.codigo_postal?.trim() || null,
    costo: Number(envio.costo) || 0,
    seguimiento: envio.seguimiento?.trim() || null,
    notas: envio.notas?.trim() || null,
  }

  if (envio.id) {
    const { error } = await supabase.from('envios').update(fila).eq('id', envio.id)
    if (error) throw error
    return envio.id
  }

  const { data, error } = await supabase.from('envios').insert(fila).select('id').single()
  if (error) throw error
  return data.id
}

export async function cambiarEstadoEnvio(id, estado) {
  const { error } = await supabase
    .from('envios')
    .update({
      estado,
      // Se sella la fecha la primera vez que sale; volver a 'pendiente' la borra.
      despachado_en: estado === 'pendiente' ? null : new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function eliminarEnvio(id) {
  const { error } = await supabase.from('envios').delete().eq('id', id)
  if (error) throw error
}
