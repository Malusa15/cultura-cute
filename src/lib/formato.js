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
