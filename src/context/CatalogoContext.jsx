import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { PRODUCTOS } from '../data/productos.js'
import { ORDEN_TALLES } from '../data/taxonomia.js'
import { supabaseConfigurado } from '../lib/supabase.js'
import { traerCatalogoPublico } from '../lib/catalogo.js'

const CatalogoContext = createContext(null)

// Todo lo que la tienda deriva del catálogo se calcula acá, una sola vez por
// carga, porque depende de qué productos hay y eso ahora puede venir de Supabase.
function derivar(catalogo) {
  const valores = {
    genero: new Set(catalogo.map((p) => p.genero)),
    categoria: new Set(catalogo.map((p) => p.categoria)),
    subcategoria: new Set(catalogo.map((p) => p.subcategoria)),
    color: new Set(catalogo.map((p) => p.color)),
    // Un talle agotado no cuenta como disponible para filtrar.
    talle: new Set(catalogo.flatMap((p) => p.talles.filter((t) => t.stock > 0).map((t) => t.talle))),
    material: new Set(catalogo.flatMap((p) => p.materiales)),
    estilo: new Set(catalogo.flatMap((p) => p.estilo)),
  }

  const precios = catalogo.map((p) => p.precio)

  return {
    hayProductosCon: (campo, valor) => valores[campo]?.has(valor) ?? false,

    // Los colores no son una lista cerrada como el resto de la taxonomía: cada
    // prenda puede traer uno nuevo, así que salen del catálogo.
    colores: [...valores.color].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')),

    talles: [...new Set(catalogo.flatMap((p) => p.talles.map((t) => t.talle)))].sort(
      (a, b) => ORDEN_TALLES.indexOf(a) - ORDEN_TALLES.indexOf(b),
    ),

    // Con el catálogo vacío, Math.max de nada da -Infinity y rompe el slider.
    precioMinimo: precios.length ? Math.min(...precios) : 0,
    precioMaximo: precios.length ? Math.max(...precios) : 0,
  }
}

export function CatalogoProvider({ children }) {
  const [productos, setProductos] = useState(supabaseConfigurado ? [] : PRODUCTOS)
  const [cargando, setCargando] = useState(supabaseConfigurado)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    if (!supabaseConfigurado) return

    setCargando(true)
    setError(null)
    try {
      setProductos(await traerCatalogoPublico())
    } catch (e) {
      // Si la base falla, mostramos el catálogo local antes que una tienda vacía.
      // Los errores de Supabase son objetos: sin desarmarlos, la consola muestra
      // "[object Object]" y no se sabe qué pasó.
      console.error(
        'No se pudo leer el catálogo de Supabase:',
        e?.message ?? String(e),
        e?.details ?? '',
        e?.hint ?? '',
      )
      setError(e)
      setProductos(PRODUCTOS)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Cuando el panel guarda un cambio, avisa por acá para que la tienda se
  // actualice sin recargar la página.
  useEffect(() => {
    if (!supabaseConfigurado) return
    const alCambiar = () => cargar()
    window.addEventListener('catalogo:actualizado', alCambiar)
    return () => window.removeEventListener('catalogo:actualizado', alCambiar)
  }, [cargar])

  const valor = useMemo(() => {
    const activos = productos.filter((p) => p.activo)
    return {
      catalogo: activos,
      cargando,
      error,
      recargar: cargar,
      buscarProducto: (id) => productos.find((p) => p.id === id),
      ...derivar(activos),
    }
  }, [productos, cargando, error, cargar])

  return <CatalogoContext.Provider value={valor}>{children}</CatalogoContext.Provider>
}

export function useCatalogo() {
  const contexto = useContext(CatalogoContext)
  if (!contexto) throw new Error('useCatalogo tiene que usarse dentro de <CatalogoProvider>')
  return contexto
}

// Le avisa a la tienda que el catálogo cambió desde el panel.
export function avisarCatalogoActualizado() {
  window.dispatchEvent(new Event('catalogo:actualizado'))
}
