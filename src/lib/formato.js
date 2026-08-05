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

// "2026-08-05T14:32:00Z" -> "05/08/26". Para las listas del panel, donde la hora
// no aporta y ocupa lugar.
export function fecha(valor) {
  if (!valor) return '—'
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? '—' : dia.format(d)
}
