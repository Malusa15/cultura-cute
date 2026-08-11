import { Link } from 'react-router-dom'
import { precio } from '../lib/formato.js'
import { fotoUrl } from '../lib/rutas.js'
import { stockTotal } from '../lib/stock.js'
import { linkDePrenda } from '../lib/prendas.js'

const UMBRAL_ULTIMAS = 3

export default function TarjetaProducto({ producto, alAbrir }) {
  const stock = stockTotal(producto)
  const [principal, segunda] = producto.imagenes.map(fotoUrl)

  // Es un link y no un botón aunque abra una ficha sin recargar la página. Un
  // link de verdad se puede copiar, abrir en otra pestaña y —lo importante— lo
  // sigue Google, que es la única forma de que las prendas aparezcan una por
  // una en las búsquedas. El clic común lo maneja React y no recarga nada.
  return (
    <Link
      className="producto"
      to={linkDePrenda(producto)}
      onClick={(e) => {
        // Con Ctrl o el botón del medio, que el navegador haga lo suyo y la
        // abra en una pestaña nueva.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        alAbrir(producto)
      }}
    >
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
    </Link>
  )
}
