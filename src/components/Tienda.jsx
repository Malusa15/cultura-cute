import { useMemo, useState } from 'react'
import { CATALOGO, hayProductosCon, hayStock } from '../data/productos.js'
import { linkWhatsApp } from '../lib/whatsapp.js'
import Filtros, { FILTROS_INICIALES, hayFiltrosActivos } from './Filtros.jsx'
import TarjetaProducto from './TarjetaProducto.jsx'
import ModalProducto from './ModalProducto.jsx'
import { IconoWhatsApp } from './Iconos.jsx'

function pasaFiltros(producto, filtros) {
  if (filtros.generos.length && !filtros.generos.includes(producto.genero)) return false
  if (filtros.categorias.length && !filtros.categorias.includes(producto.categoria)) return false
  if (filtros.subcategorias.length && !filtros.subcategorias.includes(producto.subcategoria)) {
    return false
  }
  if (filtros.colores.length && !filtros.colores.includes(producto.color)) return false
  if (filtros.materiales.length && !producto.materiales.some((m) => filtros.materiales.includes(m))) {
    return false
  }
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

// Distingue dos motivos distintos por los que la tienda puede quedar vacía:
// que la categoría elegida todavía no tenga prendas cargadas (va "Próximamente"),
// o que la combinación de filtros no dé resultados aunque cada opción por
// separado sí tenga prendas (va el mensaje de siempre).
const CAMPOS_DE_TAXONOMIA = [
  ['genero', 'generos'],
  ['categoria', 'categorias'],
  ['subcategoria', 'subcategorias'],
  ['material', 'materiales'],
  ['color', 'colores'],
  ['talle', 'talles'],
  ['estilo', 'estilos'],
]

function seleccionSinPrendas(filtros) {
  return CAMPOS_DE_TAXONOMIA.some(([campo, clave]) =>
    filtros[clave].some((valor) => !hayProductosCon(campo, valor)),
  )
}

export default function Tienda() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [productoAbierto, setProductoAbierto] = useState(null)

  const visibles = useMemo(
    () => CATALOGO.filter((producto) => pasaFiltros(producto, filtros)),
    [filtros],
  )

  const proximamente = visibles.length === 0 && seleccionSinPrendas(filtros)

  return (
    <section className="seccion" id="tienda" aria-labelledby="titulo-tienda">
      <div className="contenedor">
        <div className="tienda__encabezado">
          <h2 id="titulo-tienda" className="titulo-seccion gotica gotica--sobre-crema">
            Tienda
          </h2>
        </div>

        <Filtros filtros={filtros} setFiltros={setFiltros} resultados={visibles.length} />

        {visibles.length > 0 && (
          <div className="grid-productos">
            {visibles.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} alAbrir={setProductoAbierto} />
            ))}
          </div>
        )}

        {proximamente && (
          <div className="tienda__vacio">
            <p className="tienda__proximamente">Próximamente</p>
            <p>
              Estamos preparando las prendas de esta categoría. Si buscás algo puntual,
              escribinos y lo hacemos a pedido.
            </p>
            <div className="tienda__vacio-acciones">
              <a
                className="boton boton--wsp"
                href={linkWhatsApp('Hola! Vi que esta categoría está por salir, quiero consultar')}
                target="_blank"
                rel="noreferrer"
              >
                <IconoWhatsApp width={18} height={18} />
                Consultar
              </a>
              <button
                type="button"
                className="boton boton--fantasma"
                onClick={() => setFiltros(FILTROS_INICIALES)}
              >
                Ver todo
              </button>
            </div>
          </div>
        )}

        {visibles.length === 0 && !proximamente && (
          <div className="tienda__vacio">
            <p>No hay prendas que coincidan con esos filtros.</p>
            {hayFiltrosActivos(filtros) && (
              <div className="tienda__vacio-acciones">
                <button
                  type="button"
                  className="boton boton--fantasma"
                  onClick={() => setFiltros(FILTROS_INICIALES)}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {productoAbierto && (
        <ModalProducto producto={productoAbierto} alCerrar={() => setProductoAbierto(null)} />
      )}
    </section>
  )
}
