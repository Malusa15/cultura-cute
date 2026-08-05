import { useState } from 'react'
import { useCarrito } from '../context/CarritoContext.jsx'
import { precio } from '../lib/formato.js'
import { fotoUrl } from '../lib/rutas.js'
import { linkWhatsApp, mensajePedido } from '../lib/whatsapp.js'
import { registrarPedido } from '../lib/ventas.js'
import { supabaseConfigurado } from '../lib/supabase.js'
import { usePanel } from '../hooks/usePanel.js'
import { IconoCerrar, IconoWhatsApp } from './Iconos.jsx'

export default function Carrito() {
  const { items, total, abierto, cerrar, cambiarCantidad, quitar } = useCarrito()
  const [enviando, setEnviando] = useState(false)
  // Antes de mandar el pedido se pide el nombre, para que la venta no llegue al
  // panel como "sin nombre".
  const [pidiendoNombre, setPidiendoNombre] = useState(false)
  const [nombre, setNombre] = useState('')

  usePanel(abierto, cerrar)

  // El pedido queda guardado en la base (entra al panel como venta pendiente) y
  // recién después se abre WhatsApp con el mensaje.
  //
  // Si la base falla, igual se abre el chat: perder el registro es molesto, pero
  // perder la venta es peor.
  const finalizar = async (evento) => {
    evento.preventDefault()
    if (enviando || items.length === 0 || !nombre.trim()) return
    setEnviando(true)

    // La pestaña se abre ANTES del await a propósito: si se abriera después, el
    // navegador la trataría como popup y la bloquearía. Este handler todavía
    // cuenta como gesto de la clienta, así que acá se puede.
    const pestana = window.open('', '_blank')

    let numero = null
    if (supabaseConfigurado) {
      try {
        numero = (await registrarPedido({ nombre: nombre.trim(), items }))?.numero ?? null
      } catch (e) {
        console.error('No se pudo registrar el pedido:', e?.message ?? String(e))
      }
    }

    const url = linkWhatsApp(mensajePedido(items, total, numero))
    if (pestana) pestana.location = url
    else window.location.href = url

    setEnviando(false)
    setPidiendoNombre(false)
  }

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
                    src={fotoUrl(item.producto.imagenes[0])}
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

              <button
                type="button"
                className="boton boton--wsp boton--ancho"
                onClick={() => setPidiendoNombre(true)}
              >
                <IconoWhatsApp width={18} height={18} />
                Finalizar compra
              </button>

              <p className="carrito__nota">
                La compra se cierra por WhatsApp: te abrimos el chat con el pedido ya escrito y
                ahí coordinamos pago y envío.
              </p>
            </div>
          </>
        )}
      </aside>

      {/* Se monta por encima del carrito, no lo reemplaza: si cancela, vuelve a
          ver su pedido intacto. */}
      {pidiendoNombre && (
        <div className="nombre-modal" role="dialog" aria-modal="true" aria-labelledby="nombre-titulo">
          <form className="nombre-modal__caja" onSubmit={finalizar}>
            <h3 id="nombre-titulo" className="nombre-modal__titulo gotica">
              ¿A nombre de quién?
            </h3>
            <p className="nombre-modal__texto">
              Lo usamos para identificar tu pedido cuando nos escribas.
            </p>

            <label className="nombre-modal__campo">
              <span className="filtro__titulo">Nombre</span>
              <input
                className="nombre-modal__input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tu nombre y apellido"
                autoFocus
                required
                maxLength={80}
              />
            </label>

            <div className="nombre-modal__botones">
              <button
                type="button"
                className="boton boton--fantasma"
                onClick={() => setPidiendoNombre(false)}
                disabled={enviando}
              >
                Volver
              </button>
              <button
                type="submit"
                className="boton boton--wsp"
                disabled={enviando || !nombre.trim()}
              >
                <IconoWhatsApp width={18} height={18} />
                {enviando ? 'Preparando…' : 'Ir a WhatsApp'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
