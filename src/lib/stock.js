// Funciones puras sobre una prenda. Viven aparte del catálogo porque no dependen
// de dónde salieron los datos: sirven igual para el archivo local y para Supabase.

export function stockTotal(producto) {
  return producto.talles.reduce((acc, t) => acc + t.stock, 0)
}

export function stockDeTalle(producto, talle) {
  return producto.talles.find((t) => t.talle === talle)?.stock ?? 0
}

export function hayStock(producto) {
  return stockTotal(producto) > 0
}

// Prendas publicadas que se están quedando sin talles.
//
// Va agrupado por prenda y no por talle a propósito: las tandas son chicas —hoy
// casi todos los talles tienen entre 0 y 3 unidades— así que una lista por talle
// serían veinte renglones y no se leería ninguno. Agrupadas son unas pocas.
//
// Solo mira las publicadas: el stock de una prenda oculta no lo ve nadie, así
// que avisar por ella sería ruido.
export function alertasDeStock(productos, umbral = 1) {
  return productos
    .filter((p) => p.activo)
    .map((producto) => ({
      producto,
      agotados: producto.talles.filter((t) => t.stock === 0).map((t) => t.talle),
      bajos: producto.talles.filter((t) => t.stock > 0 && t.stock <= umbral),
      total: stockTotal(producto),
    }))
    .map((a) => ({ ...a, sinNada: a.total === 0 }))
    .filter((a) => a.agotados.length > 0 || a.bajos.length > 0)
    // Primero las que ya no se pueden comprar en ningún talle, y dentro de cada
    // grupo las que menos unidades tienen: es el orden en que hay que reponer.
    .sort((a, b) => b.sinNada - a.sinNada || a.total - b.total)
}
