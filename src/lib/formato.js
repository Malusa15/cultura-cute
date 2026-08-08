const separadorDeMiles = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

// 45000 -> "45.000"
export function numero(valor) {
  return separadorDeMiles.format(valor)
}

// 45000 -> "$45.000". Se arma a mano en vez de usar el formato de moneda de Intl
// porque ese mete un espacio entre el simbolo y el numero ("$ 45.000").
export function precio(valor) {
  return `$${numero(valor)}`
}

const dia = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

// Las columnas `date` de Postgres llegan como "2026-12-20", sin hora. new Date()
// las lee como medianoche UTC, y al mostrarlas en Argentina (UTC-3) quedan a las
// 21 del día anterior: una entrega del 20 se veía "19/12". Por eso las fechas sin
// hora se arman a mano como fecha local; las que sí traen hora van derecho.
export function aFecha(valor) {
  const soloDia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor))
  return soloDia
    ? new Date(Number(soloDia[1]), Number(soloDia[2]) - 1, Number(soloDia[3]))
    : new Date(valor)
}

// "2026-08-05T14:32:00Z" -> "05/08/26". Para las listas del panel, donde la hora
// no aporta y ocupa lugar.
export function fecha(valor) {
  if (!valor) return '—'
  const d = aFecha(valor)
  return Number.isNaN(d.getTime()) ? '—' : dia.format(d)
}

// "2026-12-20" -> "20/12/2026". Con el año entero, para los mensajes que le
// llegan a la clienta.
const diaLargo = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function fechaCorta(valor) {
  if (!valor) return ''
  const d = aFecha(valor)
  return Number.isNaN(d.getTime()) ? '' : diaLargo.format(d)
}

// "08/08/2026 · 14:32:05". Para el reloj que corre en la tienda y en el panel.
// Van dos formateadores en vez de uno solo porque Intl junta fecha y hora con
// una coma, y acá queremos el separador de la marca.
const relojHora = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function fechaHora(valor) {
  if (!valor) return '—'
  const d = aFecha(valor)
  return Number.isNaN(d.getTime()) ? '—' : `${diaLargo.format(d)} · ${relojHora.format(d)}`
}
