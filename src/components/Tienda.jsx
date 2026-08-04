import { useMemo, useState } from 'react'
import { CATALOGO, hayStock } from '../data/productos.js'
import Filtros, { FILTROS_INICIALES, hayFiltrosActivos } from './Filtros.jsx'
import TarjetaProducto from './TarjetaProducto.jsx'
import ModalProducto from './ModalProducto.jsx'

function pasaFiltros(producto, filtros) {
  if (filtros.categorias.length && !filtros.categorias.includes(producto.categoria)) return false
  if (filtros.subcategorias.length && !filtros.subcategorias.includes(producto.subcategoria)) {
    return false
  }
  if (filtros.colores.length && !filtros.colores.includes(producto.color)) return false
  if (filtros.estilos.length && !producto.estilo.some((e) => filtros.estilos.includes(e))) {
    return false
  }
  if (producto.precio > filtros.precioMax) return false
  if (filtros.soloDisponibles && !hayStock(producto)) return false

  // Filtrar por talle implica querer comprarlo: pedimos que ese talle tenga stock.
  if (filtros.talles.length) {
    const tieneTalle = producto.talles.some((t) => filtros.talles.includes(t.talle) && t.stock > 0)
    if (!tieneTalle) return false
  }

  return true
}

export default function Tienda() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [productoAbierto, setProductoAbierto] = useState(null)

  const visibles = useMemo(
    () => CATALOGO.filter((producto) => pasaFiltros(producto, filtros)),
    [filtros],
  )

  return (
    <section className="seccion" id="tienda" aria-labelledby="titulo-tienda">
      <div className="contenedor">
        <div className="tienda__encabezado">
          <h2 id="titulo-tienda" className="titulo-seccion gotica gotica--sobre-crema">
            Tienda
          </h2>
        </div>

        <Filtros filtros={filtros} setFiltros={setFiltros} resultados={visibles.length} />

        {visibles.length > 0 ? (
          <div className="grid-productos">
            {visibles.map((producto) => (
              <TarjetaProducto
                key={producto.id}
                producto={producto}
                alAbrir={setProductoAbierto}
              />
            ))}
          </div>
        ) : (
          <div className="tienda__vacio">
            <p>No hay prendas que coincidan con esos filtros.</p>
            {hayFiltrosActivos(filtros) && (
              <button
                type="button"
                className="boton boton--fantasma"
                onClick={() => setFiltros(FILTROS_INICIALES)}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {productoAbierto && (
        <ModalProducto
          producto={productoAbierto}
          alCerrar={() => setProductoAbierto(null)}
        />
      )}
    </section>
  )
}
