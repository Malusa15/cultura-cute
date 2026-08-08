import { supabase } from './supabase.js'

// Economía de la marca: dónde está la plata (cajas) y cada vez que entra o sale
// (movimientos). Acá viven las listas fijas, las cuentas de saldo y resumen, y
// el acceso a la base. Las tablas están en supabase/economia.sql.

// --- Listas fijas ------------------------------------------------------------

export const TIPOS_CAJA = {
  chica: 'Caja chica',
  grande: 'Caja grande',
}

// Cada tipo de movimiento ya sabe para qué lado va la plata, así el formulario
// no pregunta dos veces lo mismo. Los que tienen `direccion: null` son los que
// pueden ir para cualquiera de los dos lados y hay que elegir.
export const TIPOS_MOVIMIENTO = {
  venta: { label: 'Cobro de venta', direccion: 'entra' },
  ingreso: { label: 'Otro ingreso', direccion: 'entra' },
  aporte: { label: 'Aporte de plata', direccion: 'entra' },
  gasto: { label: 'Gasto', direccion: 'sale' },
  sueldo: { label: 'Sueldo', direccion: 'sale' },
  pago: { label: 'Pago a proveedor', direccion: 'sale' },
  retiro: { label: 'Retiro', direccion: 'sale' },
  ajuste: { label: 'Ajuste de caja', direccion: null },
  traspaso: { label: 'Traspaso entre cajas', direccion: null },
}

// Solo las etiquetas, para los selects y las tablas.
export const ETIQUETAS_TIPO = Object.fromEntries(
  Object.entries(TIPOS_MOVIMIENTO).map(([clave, t]) => [clave, t.label]),
)

// Los que se eligen a mano al cargar un movimiento. El traspaso queda afuera
// porque escribe dos renglones a la vez y tiene su propio formulario.
export const TIPOS_A_MANO = Object.fromEntries(
  Object.entries(ETIQUETAS_TIPO).filter(([clave]) => clave !== 'traspaso'),
)

// El rubro es para poder contestar "¿en qué se me fue la plata este mes?". La
// lista es corta a propósito: si hay veinte rubros no se elige ninguno.
export const RUBROS = {
  materiales: 'Telas y avíos',
  produccion: 'Producción y taller',
  personal: 'Personal',
  envios: 'Envíos',
  packaging: 'Packaging',
  publicidad: 'Publicidad y redes',
  servicios: 'Servicios (luz, internet, teléfono)',
  alquiler: 'Alquiler',
  impuestos: 'Impuestos y comisiones',
  herramientas: 'Herramientas y máquinas',
  web: 'Web (dominio, hosting)',
  otros: 'Otros',
}

export const METODOS_PAGO = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  mercadopago: 'Mercado Pago',
  debito: 'Débito',
  credito: 'Crédito',
  otro: 'Otro',
}

// --- Las cuentas -------------------------------------------------------------

// Number('') es 0 pero Number('hola') es NaN: esto deja todo en algo sumable.
function num(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

// La dirección de un tipo cerrado (un gasto siempre sale) o la que se eligió a
// mano en los que pueden ir para los dos lados.
export function direccionDe(tipo, elegida) {
  return TIPOS_MOVIMIENTO[tipo]?.direccion ?? elegida ?? 'sale'
}

function conSigno(mov) {
  return (mov.direccion === 'entra' ? 1 : -1) * num(mov.monto)
}

// Saldo real de una caja: lo que había el día que se empezó a anotar, más todo
// lo que entró, menos todo lo que salió.
//
// Se calcula sobre la lista completa y no sobre la filtrada: el saldo de la caja
// es uno solo, no cambia porque estés mirando marzo.
export function saldoDeCaja(caja, movimientos) {
  return movimientos
    .filter((m) => m.caja_id === caja.id)
    .reduce((suma, m) => suma + conSigno(m), num(caja.saldo_inicial))
}

export function saldoTotal(cajas, movimientos) {
  return cajas.reduce((suma, c) => suma + saldoDeCaja(c, movimientos), 0)
}

// Entradas, salidas y resultado de un período, más el desglose por tipo y por
// rubro para saber en qué se fue.
//
// Los traspasos quedan afuera de la cuenta: pasar plata de la caja chica a la
// grande no es ni un ingreso ni un gasto, la misma plata cambió de bolsillo. Si
// contaran, cada traspaso inflaría las entradas y las salidas del mes por igual.
export function resumen(movimientos) {
  const reales = movimientos.filter((m) => m.tipo !== 'traspaso')

  let entradas = 0
  let salidas = 0
  const porTipo = {}
  const porRubro = {}

  for (const m of reales) {
    const monto = num(m.monto)

    if (m.direccion === 'entra') entradas += monto
    else salidas += monto

    porTipo[m.tipo] = (porTipo[m.tipo] ?? 0) + monto

    if (m.direccion === 'sale') {
      const rubro = m.rubro || 'otros'
      porRubro[rubro] = (porRubro[rubro] ?? 0) + monto
    }
  }

  return {
    entradas,
    salidas,
    resultado: entradas - salidas,
    porTipo,
    // Ordenado de mayor a menor: lo primero que se quiere ver es el rubro que
    // más se llevó.
    porRubro: Object.entries(porRubro).sort((a, b) => b[1] - a[1]),
  }
}

// --- Fechas ------------------------------------------------------------------

// "2026-08-08". A mano y no con toISOString(): esa devuelve UTC, y después de
// las 21 en Argentina daría el día siguiente.
export function hoy() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

// "2026-08-08" -> "2026-08". La clave con la que se agrupa por mes.
export function mesDe(fecha) {
  return String(fecha).slice(0, 7)
}

export function mesActual() {
  return mesDe(hoy())
}

const mesLargo = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' })

// "2026-08" -> "Agosto de 2026"
export function nombreDeMes(clave) {
  const [anio, mes] = String(clave).split('-')
  const texto = mesLargo.format(new Date(Number(anio), Number(mes) - 1, 1))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Los meses que tienen algo cargado, del más nuevo al más viejo. El mes actual
// va siempre, aunque todavía esté vacío: es el que se mira por defecto.
export function mesesDe(movimientos) {
  const meses = new Set(movimientos.map((m) => mesDe(m.fecha)))
  meses.add(mesActual())
  return [...meses].sort().reverse()
}

// --- Base de datos -----------------------------------------------------------

export async function traerCajas() {
  const { data, error } = await supabase
    .from('cajas')
    .select('*')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) throw error
  return data
}

export async function traerMovimientos() {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*, cajas ( id, nombre, tipo ), ventas ( numero, cliente_nombre )')
    .order('fecha', { ascending: false })
    .order('numero', { ascending: false })

  if (error) throw error

  return data.map((m) => ({
    ...m,
    caja: m.cajas ?? null,
    venta: m.ventas ?? null,
  }))
}

// Las ventas que ya se cerraron y por lo tanto se cobran. Es lo que se ofrece al
// cargar un movimiento de tipo "Cobro de venta".
export async function traerVentasCobrables() {
  const { data, error } = await supabase
    .from('ventas')
    .select('id, numero, cliente_nombre, total')
    .in('estado', ['confirmada', 'entregada'])
    .order('numero', { ascending: false })

  if (error) throw error
  return data
}

// El SQL de la base se corre a mano, así que la solapa puede abrirse antes de
// que las tablas existan. Sin esto se vería el error crudo de Postgres
// («relation "public.cajas" does not exist»), que no le dice a nadie qué hacer.
function faltaElSql(e) {
  const codigo = e?.code ?? ''
  return codigo === '42P01' || codigo === 'PGRST205' || /schema cache/i.test(e?.message ?? '')
}

// Las tres listas de la solapa en un solo viaje: se necesitan siempre juntas
// (sin las cajas no se puede calcular un saldo) y así la pantalla no aparece a
// pedazos.
export async function traerEconomia() {
  try {
    const [cajas, movimientos, ventas] = await Promise.all([
      traerCajas(),
      traerMovimientos(),
      traerVentasCobrables(),
    ])
    return { cajas, movimientos, ventas }
  } catch (e) {
    if (faltaElSql(e)) {
      throw new Error(
        'Todavía no están creadas las tablas de economía. Hay que abrir el SQL Editor de Supabase y correr supabase/economia.sql (antes tienen que estar corridos schema.sql y ventas.sql).',
      )
    }
    throw e
  }
}

export async function guardarCaja(caja) {
  const fila = {
    nombre: caja.nombre.trim(),
    tipo: caja.tipo,
    saldo_inicial: num(caja.saldo_inicial),
    activa: caja.activa !== false,
    orden: num(caja.orden),
    notas: caja.notas?.trim() || null,
  }

  if (caja.id) {
    const { error } = await supabase.from('cajas').update(fila).eq('id', caja.id)
    if (error) throw error
    return caja.id
  }

  const { data, error } = await supabase.from('cajas').insert(fila).select('id').single()
  if (error) throw error
  return data.id
}

// La base tiene `on delete restrict`, así que borrar una caja con movimientos
// falla igual; el chequeo de acá es para que el error se lea, en vez de mostrar
// el mensaje de Postgres sobre la clave foránea.
export async function eliminarCaja(id, movimientos) {
  if (movimientos.some((m) => m.caja_id === id)) {
    throw new Error(
      'Esa caja tiene movimientos cargados. Para sacarla de la vista, desmarcá «Activa» en vez de borrarla.',
    )
  }

  const { error } = await supabase.from('cajas').delete().eq('id', id)
  if (error) throw error
}

export async function guardarMovimiento(mov) {
  const monto = num(mov.monto)
  if (monto <= 0) throw new Error('El monto tiene que ser mayor a cero.')

  const fila = {
    caja_id: mov.caja_id,
    fecha: mov.fecha || hoy(),
    tipo: mov.tipo,
    direccion: direccionDe(mov.tipo, mov.direccion),
    monto,
    concepto: mov.concepto.trim(),
    rubro: mov.rubro || null,
    metodo: mov.metodo || 'efectivo',
    persona: mov.persona?.trim() || null,
    comprobante: mov.comprobante?.trim() || null,
    // La venta solo se guarda si el movimiento es un cobro: si se eligió una y
    // después se cambió el tipo, el vínculo dejaría de tener sentido.
    venta_id: mov.tipo === 'venta' ? mov.venta_id || null : null,
    notas: mov.notas?.trim() || null,
  }

  if (mov.id) {
    const { error } = await supabase.from('movimientos').update(fila).eq('id', mov.id)
    if (error) throw error
    return mov.id
  }

  const { data, error } = await supabase.from('movimientos').insert(fila).select('id').single()
  if (error) throw error
  return data.id
}

// Un traspaso son dos renglones: sale de una caja y entra en la otra. Van en un
// solo insert porque Postgres lo resuelve en una única transacción, así nunca
// queda la salida sin su entrada (que descuadraría las dos cajas a la vez).
export async function registrarTraspaso({ origen, destino, fecha, monto, metodo, notas }) {
  if (!origen || !destino) throw new Error('Hay que elegir de qué caja sale y a cuál entra.')
  if (origen.id === destino.id) throw new Error('El traspaso tiene que ir a una caja distinta.')

  const importe = num(monto)
  if (importe <= 0) throw new Error('El monto del traspaso tiene que ser mayor a cero.')

  const comun = {
    fecha: fecha || hoy(),
    tipo: 'traspaso',
    monto: importe,
    metodo: metodo || 'efectivo',
    traspaso_id: crypto.randomUUID(),
    notas: notas?.trim() || null,
  }

  const { error } = await supabase.from('movimientos').insert([
    { ...comun, caja_id: origen.id, direccion: 'sale', concepto: `Traspaso a ${destino.nombre}` },
    { ...comun, caja_id: destino.id, direccion: 'entra', concepto: `Traspaso desde ${origen.nombre}` },
  ])

  if (error) throw error
}

// Borrar una pata de un traspaso se lleva la otra: si quedara sola, una caja
// mostraría plata que la otra nunca perdió.
export async function eliminarMovimiento(mov) {
  const consulta = supabase.from('movimientos').delete()
  const { error } = mov.traspaso_id
    ? await consulta.eq('traspaso_id', mov.traspaso_id)
    : await consulta.eq('id', mov.id)

  if (error) throw error
}
