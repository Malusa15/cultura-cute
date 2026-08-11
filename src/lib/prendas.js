// El link propio de cada prenda: /prenda/corset-azul-satinado-fa3d5560
//
// POR QUÉ EL LINK LLEVA EL NOMBRE Y ADEMÁS UN CÓDIGO
//
// El nombre es lo que hace que el link se entienda al leerlo y lo que Google
// usa para encontrarla. Pero un nombre cambia —se corrige una falta, se le suma
// "edición limitada"— y si el link dependiera solo del nombre, todos los que ya
// se mandaron por WhatsApp o quedaron en un posteo dejarían de funcionar.
//
// Por eso al final va un pedazo del id, que no cambia nunca. Para encontrar la
// prenda se usa **solo ese código**: el nombre es decorado. Así se le puede
// cambiar el nombre a una prenda cuantas veces haga falta sin romper un link.

// Cuántos caracteres del id van al final. Ocho de un uuid son 4.300 millones de
// combinaciones: de sobra para que dos prendas no choquen nunca.
const LARGO_CODIGO = 8

// "Pantalón flare naranja" -> "pantalon-flare-naranja"
export function aTextoDeUrl(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    // Saca los acentos: en una dirección web conviene que no haya.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function codigoDe(producto) {
  return String(producto?.id ?? '').replace(/-/g, '').slice(0, LARGO_CODIGO)
}

export function linkDePrenda(producto) {
  if (!producto?.id) return null
  const nombre = aTextoDeUrl(producto.nombre)
  const codigo = codigoDe(producto)
  return `/prenda/${nombre ? `${nombre}-` : ''}${codigo}`
}

// Del link vuelve al código: lo último después del último guión.
export function codigoDelLink(slug) {
  const limpio = String(slug ?? '').trim().toLowerCase()
  const ultimo = limpio.slice(limpio.lastIndexOf('-') + 1)
  return /^[a-f0-9]{4,32}$/.test(ultimo) ? ultimo : null
}

export function buscarPorLink(productos, slug) {
  const codigo = codigoDelLink(slug)
  if (!codigo) return null
  return productos.find((p) => codigoDe(p).startsWith(codigo)) ?? null
}
