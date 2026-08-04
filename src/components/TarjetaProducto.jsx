import { precio } from '../lib/formato.js'
import { stockTotal } from '../data/productos.js'

const UMBRAL_ULTIMAS = 3

export default function TarjetaProducto({ producto, alAbrir }) {
  const stock = stockTotal(producto)
  const [principal, segunda] = producto.imagenes

  return (
    <button type="button" className="producto" onClick={() => alAbrir(producto)}>
      <div className="producto__foto">
        <img src={principal} alt={producto.nombre} loading="lazy" />
        {/* Si hay segunda toma, el hover cambia de foto. */}
        {segunda && (
          <img className="producto__foto--hover" src={segunda} alt="" aria-hidden loading="lazy" />
        )}

        {stock === 0 && <span className="producto__badge producto__badge--agotado">Agotado</span>}
        {stock > 0 && stock <= UMBRAL_ULTIMAS && (
          <span className="producto__badge producto__badge--ultimas">
            {stock === 1 ? 'Última' : `Quedan ${stock}`}
          </span>
        )}
      </div>

      <div className="producto__datos">
        <span className="producto__nombre">{producto.nombre}</span>
        <span className="producto__precio">{precio(producto.precio)}</span>
      </div>
      <span className="producto__meta">{producto.subcategoria}</span>
    </button>
  )
}
