import { useCarrito } from '../context/CarritoContext.jsx'
import { precio } from '../lib/formato.js'
import { linkWhatsApp, mensajePedido } from '../lib/whatsapp.js'
import { usePanel } from '../hooks/usePanel.js'
import { IconoCerrar, IconoWhatsApp } from './Iconos.jsx'

export default function Carrito() {
  const { items, total, abierto, cerrar, cambiarCantidad, quitar } = useCarrito()

  usePanel(abierto, cerrar)

  if (!abierto) return null

  return (
    <>
      <div className="overlay" onClick={cerrar} />
      <aside className="carrito" role="dialog" aria-modal="true" aria-labelledby="carrito-titulo">
        <div className="carrito__encabezado">
          <h2 id="carrito-titulo" className="carrito__titulo">
            Tu carrito
          </h2>
          <button type="button" className="icono-boton" onClick={cerrar} aria-label="Cerrar carrito">
            <IconoCerrar />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="carrito__vacio">
            <p>Todavía no agregaste ninguna prenda.</p>
            <a className="boton boton--fantasma" href="#tienda" onClick={cerrar}>
              Ver tienda
            </a>
          </div>
        ) : (
          <>
            <ul className="carrito__lista">
              {items.map((item) => (
                <li className="linea" key={`${item.productoId}-${item.talle}`}>
                  <img
                    className="linea__foto"
                    src={item.producto.imagenes[0]}
                    alt={item.producto.nombre}
                  />

                  <div className="linea__cuerpo">
                    <div className="linea__fila">
                      <div>
                        <p className="linea__nombre">{item.producto.nombre}</p>
                        <p className="linea__talle">Talle {item.talle}</p>
                      </div>
                      <span className="linea__subtotal">{precio(item.subtotal)}</span>
                    </div>

                    <div className="linea__fila">
                      <div className="cantidad">
                        <button
                          type="button"
                          onClick={() =>
                            cambiarCantidad(item.productoId, item.talle, item.cantidad - 1)
                          }
                          aria-label={`Quitar una unidad de ${item.producto.nombre}`}
                        >
                          −
                        </button>
                        <span>{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() =>
                            cambiarCantidad(item.productoId, item.talle, item.cantidad + 1)
                          }
                          disabled={item.cantidad >= item.stock}
                          aria-label={`Agregar una unidad de ${item.producto.nombre}`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="linea__quitar"
                        onClick={() => quitar(item.productoId, item.talle)}
                      >
                        Quitar
                      </button>
                    </div>

                    {item.cantidad >= item.stock && (
                      <p className="linea__tope">
                        Es todo el stock disponible en talle {item.talle}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="carrito__pie">
              <div className="carrito__total">
                <span>Total</span>
                <span>{precio(total)}</span>
              </div>

              <a
                className="boton boton--wsp boton--ancho"
                href={linkWhatsApp(mensajePedido(items, total))}
                target="_blank"
                rel="noreferrer"
              >
                <IconoWhatsApp width={18} height={18} />
                Finalizar compra
              </a>

              <p className="carrito__nota">
                La compra se cierra por WhatsApp: te abrimos el chat con el pedido ya escrito y
                ahí coordinamos pago y envío.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
