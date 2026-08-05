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
