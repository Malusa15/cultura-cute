import { supabase } from './supabase.js'
import { aFecha } from './formato.js'
import { calcular as calcularPresupuesto, traerPresupuestos } from './presupuestos.js'

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

// Los precios de la tienda son pesos enteros, pero un gasto puede traer
// centavos, y `precio()` de formato.js los redondea: una columna de $1.234,50
// se veía "$1.235" mientras el saldo usaba el número exacto, y no cerraba por un
// peso. Acá los centavos se muestran solo cuando existen.
const sinCentavos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const conCentavos = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function plata(valor) {
  const n = num(valor)
  const formato = Number.isInteger(n) ? sinCentavos : conCentavos
  // El signo va antes del peso: "− $6.700" y no "$-6.700".
  return `${n < 0 ? '− ' : ''}$${formato.format(Math.abs(n))}`
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

// Date -> "2026-08-08". A mano y no con toISOString(): esa devuelve UTC, y
// después de las 21 en Argentina daría el día siguiente.
function aTexto(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function hoy() {
  return aTexto(new Date())
}

// El mismo día del mes que viene, para repetir un gasto fijo. Si el día no
// existe en el mes destino se usa el último: un alquiler del 31 de enero cae el
// 28 de febrero y no el 3 de marzo.
export function proximoMes(fecha) {
  const d = aFecha(fecha)
  if (Number.isNaN(d.getTime())) return hoy()

  const destino = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
  destino.setDate(Math.min(d.getDate(), ultimo))
  return aTexto(destino)
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

// "2026-08" menos 3 -> "2026-05"
function mesMenos(clave, cuantos) {
  const [anio, mes] = String(clave).split('-').map(Number)
  const d = new Date(anio, mes - 1 - cuantos, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// --- Comparar meses ----------------------------------------------------------

// La cuenta de los últimos meses, del más viejo al más nuevo, para ver si el mes
// que estás mirando fue mejor o peor que los anteriores.
//
// Los meses sin nada cargado se devuelven en cero en vez de saltarse: un mes
// vacío es información, y si desapareciera la tira mentiría sobre la seguidilla.
export function ultimosMeses(movimientos, cantidad = 6, hasta = mesActual()) {
  const claves = []
  for (let i = cantidad - 1; i >= 0; i--) claves.push(mesMenos(hasta, i))

  const porMes = new Map(claves.map((c) => [c, []]))
  for (const m of movimientos) {
    porMes.get(mesDe(m.fecha))?.push(m)
  }

  return claves.map((mes) => ({ mes, ...resumen(porMes.get(mes)) }))
}

// --- Qué se vendió -----------------------------------------------------------

// Para cruzar el nombre de una prenda vendida con el de un presupuesto: los dos
// los escribe una persona, así que "Corset Azul " y "corset azul" son el mismo.
function normalizar(texto) {
  return String(texto ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// Qué prendas se vendieron en el período y cuánto facturó cada una.
//
// El costo solo aparece cuando hay un presupuesto con ese mismo nombre de
// prenda, que es el único lugar del panel donde hoy se anota lo que cuesta
// hacer algo (materiales + horas). Las prendas del catálogo no tienen costo
// cargado en ninguna parte, así que de esas se sabe lo que entró, no lo que
// dejaron. El componente lo dice con todas las letras.
export function porPrenda(ventas, presupuestos, mes) {
  const costos = new Map()
  for (const p of presupuestos) {
    const clave = normalizar(p.prenda)
    if (!clave || costos.has(clave)) continue
    costos.set(clave, calcularPresupuesto(p, p.materiales ?? []).costo)
  }

  const prendas = new Map()

  for (const venta of ventas) {
    if (mes !== 'todos' && mesDe(venta.creada_en) !== mes) continue

    for (const item of venta.items ?? []) {
      const clave = normalizar(item.nombre)
      const fila = prendas.get(clave) ?? {
        nombre: item.nombre,
        unidades: 0,
        facturado: 0,
        costoUnitario: costos.get(clave) ?? null,
      }
      fila.unidades += num(item.cantidad)
      fila.facturado += num(item.precio_unitario) * num(item.cantidad)
      prendas.set(clave, fila)
    }
  }

  return [...prendas.values()]
    .map((f) => ({
      ...f,
      costo: f.costoUnitario == null ? null : f.costoUnitario * f.unidades,
      margen: f.costoUnitario == null ? null : f.facturado - f.costoUnitario * f.unidades,
    }))
    .sort((a, b) => b.facturado - a.facturado)
}

// --- Arqueo de caja ----------------------------------------------------------

// Contás la plata que hay de verdad y esto arma el ajuste que hace falta para
// que el panel diga lo mismo. Devuelve null si ya coincidía: sin esto se
// cargaría un movimiento de cero pesos cada vez que la caja da justo.
export function ajusteDeArqueo({ caja_id, contado, saldoActual, fecha }) {
  const diferencia = num(contado) - num(saldoActual)
  if (diferencia === 0) return null

  return {
    caja_id,
    fecha: fecha || hoy(),
    tipo: 'ajuste',
    direccion: diferencia > 0 ? 'entra' : 'sale',
    monto: Math.abs(diferencia),
    concepto: `Arqueo de caja: contado ${plata(contado)}`,
    rubro: '',
    metodo: 'efectivo',
    persona: '',
    comprobante: '',
    notas:
      diferencia > 0
        ? 'Había más plata de la que decía el panel.'
        : 'Faltaba plata contra lo que decía el panel.',
  }
}

// --- Exportar ----------------------------------------------------------------

// Punto y coma como separador y coma decimal porque es lo que espera el Excel en
// castellano; con comas abriría todo apretado en una sola columna. El BOM del
// principio es lo que hace que Excel no rompa los acentos.
// Sin este carácter invisible al principio del archivo, Excel lee el CSV como
// si no fuera UTF-8 y todos los acentos salen rotos.
const BOM = '\ufeff'

function celda(valor) {
  const texto = String(valor ?? '')
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function armarCsv(movimientos, cajas) {
  const nombreDeCaja = new Map(cajas.map((c) => [c.id, c.nombre]))

  const encabezado = [
    'N°', 'Fecha', 'Qué es', 'Entra o sale', 'Concepto', 'Rubro',
    'Caja', 'Cómo se pagó', 'A quién / de quién', 'Comprobante', 'Monto', 'Notas',
  ]

  const filas = movimientos.map((m) => [
    m.numero,
    m.fecha,
    ETIQUETAS_TIPO[m.tipo] ?? m.tipo,
    m.direccion === 'entra' ? 'Entra' : 'Sale',
    m.concepto,
    m.rubro ? RUBROS[m.rubro] ?? m.rubro : '',
    nombreDeCaja.get(m.caja_id) ?? '',
    METODOS_PAGO[m.metodo] ?? m.metodo,
    m.persona ?? '',
    m.comprobante ?? '',
    // Con signo, para que la columna se pueda sumar derecho en el Excel.
    String((m.direccion === 'entra' ? 1 : -1) * num(m.monto)).replace('.', ','),
    m.notas ?? '',
  ])

  return BOM + [encabezado, ...filas].map((f) => f.map(celda).join(';')).join('\r\n')
}

export function descargarCsv(texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
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

// Las ventas que ya se cerraron y por lo tanto se cobran. Sirve para dos cosas:
// el select de "Cobro de venta" y el listado de qué prendas se vendieron, por
// eso vienen también los renglones.
export async function traerVentasCobrables() {
  const { data, error } = await supabase
    .from('ventas')
    .select('id, numero, cliente_nombre, total, creada_en, venta_items ( nombre, cantidad, precio_unitario )')
    .in('estado', ['confirmada', 'entregada'])
    .order('numero', { ascending: false })

  if (error) throw error
  return data.map((v) => ({ ...v, items: v.venta_items ?? [] }))
}

// Los encargos que ya cobraron seña: esa plata entró de verdad y tiene que
// aparecer en alguna caja.
export async function traerEncargosConSena() {
  const { data, error } = await supabase
    .from('encargos')
    .select('id, numero, cliente_nombre, descripcion, sena, creado_en')
    .gt('sena', 0)
    .neq('estado', 'cancelado')
    .order('numero', { ascending: false })

  if (error) throw error
  return data
}

// Los envíos con costo cargado: es plata que salió.
export async function traerEnviosConCosto() {
  const { data, error } = await supabase
    .from('envios')
    .select('id, costo, metodo, creado_en, ventas ( numero, cliente_nombre )')
    .gt('costo', 0)
    .order('creado_en', { ascending: false })

  if (error) throw error
  return data.map((e) => ({ ...e, venta: e.ventas ?? null }))
}

// --- Qué plata quedó sin registrar -------------------------------------------

// El agujero más grande de una caja no es un número mal puesto: es acordarse de
// cargarlo. Una venta se confirma en su solapa, una seña se anota en el encargo,
// el costo del envío en el suyo, y Economía no se entera de nada.
//
// Esto compara lo que ya está anotado en el resto del panel con lo que tiene
// movimiento, y devuelve la diferencia lista para cargar de un click.
export function pendientes({ movimientos, ventas, encargos, envios, enlaces }) {
  const conVenta = new Set(movimientos.map((m) => m.venta_id).filter(Boolean))
  const conEncargo = new Set(movimientos.map((m) => m.encargo_id).filter(Boolean))
  const conEnvio = new Set(movimientos.map((m) => m.envio_id).filter(Boolean))

  const lista = []

  for (const v of ventas) {
    if (conVenta.has(v.id)) continue
    lista.push({
      clase: 'venta',
      id: v.id,
      etiqueta: `Venta #${v.numero}`,
      detalle: v.cliente_nombre ?? 'Sin nombre',
      fecha: mesDe(v.creada_en) ? String(v.creada_en).slice(0, 10) : hoy(),
      monto: num(v.total),
      tipo: 'venta',
      direccion: 'entra',
      concepto: `Cobro de la venta #${v.numero}`,
      persona: v.cliente_nombre ?? '',
      rubro: '',
      enlace: { venta_id: v.id },
    })
  }

  // Los encargos y los envíos necesitan las columnas que agrega la segunda parte
  // de economia.sql. Sin ellas no hay forma de saber cuáles ya se cargaron, y
  // ofrecerlos igual llevaría a cargar el mismo cobro todos los meses.
  if (enlaces) {
    for (const e of encargos) {
      if (conEncargo.has(e.id)) continue
      lista.push({
        clase: 'encargo',
        id: e.id,
        etiqueta: `Encargo #${e.numero}`,
        detalle: e.cliente_nombre,
        fecha: String(e.creado_en).slice(0, 10),
        monto: num(e.sena),
        tipo: 'ingreso',
        direccion: 'entra',
        concepto: `Seña del encargo #${e.numero}`,
        persona: e.cliente_nombre ?? '',
        rubro: '',
        enlace: { encargo_id: e.id },
      })
    }

    for (const e of envios) {
      if (conEnvio.has(e.id)) continue
      const nombre = e.venta ? `la venta #${e.venta.numero}` : 'una venta'
      lista.push({
        clase: 'envio',
        id: e.id,
        etiqueta: e.venta ? `Envío de la venta #${e.venta.numero}` : 'Envío',
        detalle: e.venta?.cliente_nombre ?? '',
        fecha: String(e.creado_en).slice(0, 10),
        monto: num(e.costo),
        tipo: 'pago',
        direccion: 'sale',
        concepto: `Envío de ${nombre}`,
        persona: '',
        rubro: 'envios',
        enlace: { envio_id: e.id },
      })
    }
  }

  return lista.sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
}

// El SQL de la base se corre a mano, así que la solapa puede abrirse antes de
// que las tablas existan. Sin esto se vería el error crudo de Postgres
// («relation "public.cajas" does not exist»), que no le dice a nadie qué hacer.
function faltaElSql(e) {
  const codigo = e?.code ?? ''
  return codigo === '42P01' || codigo === 'PGRST205' || /schema cache/i.test(e?.message ?? '')
}

// Las columnas `encargo_id` y `envio_id` las agrega la segunda parte de
// economia.sql, y ese archivo se corre a mano. Preguntando por una de ellas se
// sabe si ya está: da 400 si la columna no existe, y ese error no rompe nada
// porque no se pide junto con los datos de verdad.
async function hayEnlaces() {
  const { error } = await supabase.from('movimientos').select('encargo_id').limit(1)
  return !error
}

// Todas las listas de la solapa en un solo viaje: se necesitan siempre juntas
// (sin las cajas no se puede calcular un saldo) y así la pantalla no aparece a
// pedazos.
export async function traerEconomia() {
  try {
    const [cajas, movimientos, ventas, enlaces, presupuestos] = await Promise.all([
      traerCajas(),
      traerMovimientos(),
      traerVentasCobrables(),
      hayEnlaces(),
      traerPresupuestos(),
    ])

    // Encargos y envíos solo si se pueden enlazar: sin eso la lista de
    // pendientes no sabría cuáles ya se cargaron y sería peor que no tenerla.
    const [encargos, envios] = enlaces
      ? await Promise.all([traerEncargosConSena(), traerEnviosConCosto()])
      : [[], []]

    return { cajas, movimientos, ventas, encargos, envios, presupuestos, enlaces }
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

// `enlaces` dice si la base ya tiene las columnas encargo_id / envio_id. Cuando
// no las tiene ni se mencionan en el insert: nombrar una columna que no existe
// hace fallar el guardado entero, y cargar un gasto no puede depender de un SQL
// que todavía no se corrió.
function filaDeMovimiento(mov, enlaces) {
  const fila = {
    caja_id: mov.caja_id,
    fecha: mov.fecha || hoy(),
    tipo: mov.tipo,
    direccion: direccionDe(mov.tipo, mov.direccion),
    monto: num(mov.monto),
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

  if (enlaces) {
    fila.encargo_id = mov.encargo_id || null
    fila.envio_id = mov.envio_id || null
  }

  return fila
}

export async function guardarMovimiento(mov, enlaces = false) {
  if (num(mov.monto) <= 0) throw new Error('El monto tiene que ser mayor a cero.')

  const fila = filaDeMovimiento(mov, enlaces)

  if (mov.id) {
    const { error } = await supabase.from('movimientos').update(fila).eq('id', mov.id)
    if (error) throw error
    return mov.id
  }

  const { data, error } = await supabase.from('movimientos').insert(fila).select('id').single()
  if (error) throw error
  return data.id
}

// Carga de una todos los pendientes elegidos, en la caja que se haya indicado.
// Van en un solo insert para que no quede la mitad cargada si algo falla.
export async function registrarPendientes(lista, caja_id, metodo, enlaces) {
  if (!caja_id) throw new Error('Hay que elegir en qué caja entra esa plata.')
  if (!lista.length) return

  const filas = lista.map((p) =>
    filaDeMovimiento(
      {
        ...p,
        caja_id,
        metodo,
        comprobante: '',
        notas: 'Cargado desde los pendientes del panel.',
        ...p.enlace,
      },
      enlaces,
    ),
  )

  const { error } = await supabase.from('movimientos').insert(filas)
  if (error) throw error
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
