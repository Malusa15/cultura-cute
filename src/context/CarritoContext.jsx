import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { buscarProducto, stockDeTalle } from '../data/productos.js'

const CarritoContext = createContext(null)

const CLAVE_STORAGE = 'cultura-cute:carrito:v1'

// En localStorage guardamos lo minimo ({ productoId, talle, cantidad }) y el
// resto lo resolvemos contra el catalogo al renderizar. Asi un cambio de precio
// o de nombre se refleja solo, sin quedar congelado en el carrito viejo.
function leerStorage() {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE)
    if (!crudo) return []
    const datos = JSON.parse(crudo)
    if (!Array.isArray(datos)) return []
    return datos.filter(
      (linea) =>
        linea &&
        typeof linea.productoId === 'string' &&
        typeof linea.talle === 'string' &&
        Number.isFinite(linea.cantidad) &&
        linea.cantidad > 0,
    )
  } catch {
    // localStorage puede estar bloqueado (modo incognito estricto) o el JSON
    // corrupto; en cualquier caso arrancamos con el carrito vacio.
    return []
  }
}

export function CarritoProvider({ children }) {
  const [lineas, setLineas] = useState(leerStorage)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(lineas))
    } catch {
      // Si no se puede persistir, el carrito sigue funcionando en memoria.
    }
  }, [lineas])

  // Resolvemos cada linea contra el catalogo y descartamos las que apuntan a un
  // producto o talle que ya no existe.
  const items = useMemo(() => {
    return lineas.flatMap((linea) => {
      const producto = buscarProducto(linea.productoId)
      if (!producto || !producto.activo) return []

      const stock = stockDeTalle(producto, linea.talle)
      if (stock <= 0) return []

      return [
        {
          ...linea,
          producto,
          stock,
          cantidad: Math.min(linea.cantidad, stock),
          subtotal: producto.precio * Math.min(linea.cantidad, stock),
        },
      ]
    })
  }, [lineas])

  const total = useMemo(() => items.reduce((acc, item) => acc + item.subtotal, 0), [items])
  const unidades = useMemo(() => items.reduce((acc, item) => acc + item.cantidad, 0), [items])

  const agregar = useCallback((producto, talle, cantidad = 1) => {
    const stock = stockDeTalle(producto, talle)
    if (stock <= 0) return false

    setLineas((actuales) => {
      const indice = actuales.findIndex(
        (linea) => linea.productoId === producto.id && linea.talle === talle,
      )

      if (indice === -1) {
        return [...actuales, { productoId: producto.id, talle, cantidad: Math.min(cantidad, stock) }]
      }

      // Nunca dejamos que la suma supere el stock de ese talle.
      const copia = [...actuales]
      copia[indice] = {
        ...copia[indice],
        cantidad: Math.min(copia[indice].cantidad + cantidad, stock),
      }
      return copia
    })

    return true
  }, [])

  const cambiarCantidad = useCallback((productoId, talle, cantidad) => {
    setLineas((actuales) => {
      if (cantidad <= 0) {
        return actuales.filter((l) => !(l.productoId === productoId && l.talle === talle))
      }

      const producto = buscarProducto(productoId)
      const stock = producto ? stockDeTalle(producto, talle) : 0

      return actuales.map((linea) =>
        linea.productoId === productoId && linea.talle === talle
          ? { ...linea, cantidad: Math.min(cantidad, stock) }
          : linea,
      )
    })
  }, [])

  const quitar = useCallback((productoId, talle) => {
    setLineas((actuales) =>
      actuales.filter((l) => !(l.productoId === productoId && l.talle === talle)),
    )
  }, [])

  const vaciar = useCallback(() => setLineas([]), [])

  // Cuanto de un talle ya esta reservado en el carrito, para que el modal de
  // producto no deje pedir mas unidades de las que quedan.
  const enCarrito = useCallback(
    (productoId, talle) =>
      lineas.find((l) => l.productoId === productoId && l.talle === talle)?.cantidad ?? 0,
    [lineas],
  )

  const valor = useMemo(
    () => ({
      items,
      total,
      unidades,
      abierto,
      abrir: () => setAbierto(true),
      cerrar: () => setAbierto(false),
      agregar,
      cambiarCantidad,
      quitar,
      vaciar,
      enCarrito,
    }),
    [items, total, unidades, abierto, agregar, cambiarCantidad, quitar, vaciar, enCarrito],
  )

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>
}

export function useCarrito() {
  const contexto = useContext(CarritoContext)
  if (!contexto) throw new Error('useCarrito tiene que usarse dentro de <CarritoProvider>')
  return contexto
}
