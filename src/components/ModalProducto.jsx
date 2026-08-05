import { useEffect, useMemo, useState } from 'react'
import { useCarrito } from '../context/CarritoContext.jsx'
import { stockDeTalle, stockTotal } from '../lib/stock.js'
import { precio } from '../lib/formato.js'
import { fotoUrl } from '../lib/rutas.js'
import { usePanel } from '../hooks/usePanel.js'
import { IconoCerrar } from './Iconos.jsx'

const ETIQUETAS_MEDIDAS = {
  largo: 'Largo',
  busto: 'Busto',
  cintura: 'Cintura',
  cadera: 'Cadera',
}

export default function ModalProducto({ producto, alCerrar }) {
  const { agregar, abrir, enCarrito } = useCarrito()

  const primerTalleDisponible = useMemo(
    () => producto.talles.find((t) => t.stock > 0)?.talle ?? null,
    [producto],
  )

  const [talle, setTalle] = useState(primerTalleDisponible)
  const [cantidad, setCantidad] = useState(1)
  const [foto, setFoto] = useState(0)

  usePanel(true, alCerrar)

  // Al cambiar de talle volvemos a 1: el tope depende del stock de ese talle.
  useEffect(() => setCantidad(1), [talle])

  const agotado = stockTotal(producto) === 0
  const stock = talle ? stockDeTalle(producto, talle) : 0
  const yaEnCarrito = talle ? enCarrito(producto.id, talle) : 0
  const disponible = Math.max(stock - yaEnCarrito, 0)

  const alAgregar = () => {
    if (!talle || disponible === 0) return
    agregar(producto, talle, cantidad)
    alCerrar()
    abrir()
  }

  return (
    <>
      <div className="overlay" onClick={alCerrar} />
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-nombre">
        <div className="modal__caja">
          <button type="button" className="modal__cerrar" onClick={alCerrar} aria-label="Cerrar">
            <IconoCerrar />
          </button>

          <div className="modal__galeria">
            <div className="galeria__principal">
              <img src={fotoUrl(producto.imagenes[foto])} alt={producto.nombre} />
            </div>

            {producto.imagenes.length > 1 && (
              <div className="galeria__miniaturas">
                {producto.imagenes.map((imagen, indice) => (
                  <button
                    key={imagen}
                    type="button"
                    className="galeria__miniatura"
                    aria-current={indice === foto}
                    aria-label={`Ver foto ${indice + 1}`}
                    onClick={() => setFoto(indice)}
                  >
                    <img src={fotoUrl(imagen)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ficha">
            <div>
              <p className="ficha__categoria">
                {producto.categoria} · {producto.subcategoria}
              </p>
              <h2 id="modal-nombre" className="ficha__nombre">
                {producto.nombre}
              </h2>
            </div>

            <p className="ficha__precio">{precio(producto.precio)}</p>
            <p>{producto.descripcion}</p>

            <div className="ficha__bloque">
              <span className="filtro__titulo">Talle</span>
              <div className="talles">
                {producto.talles.map((opcion) => (
                  <button
                    key={opcion.talle}
                    type="button"
                    className="talle"
                    aria-pressed={talle === opcion.talle}
                    disabled={opcion.stock === 0}
                    title={opcion.stock === 0 ? 'Sin stock' : `${opcion.stock} disponibles`}
                    onClick={() => setTalle(opcion.talle)}
                  >
                    {opcion.talle}
                  </button>
                ))}
              </div>

              {talle && disponible > 0 && disponible <= 3 && (
                <p className="talle__aviso">
                  {disponible === 1
                    ? 'Queda 1 unidad de este talle'
                    : `Quedan ${disponible} unidades de este talle`}
                </p>
              )}
              {talle && disponible === 0 && !agotado && (
                <p className="talle__aviso">Ya tenés todo el stock de este talle en el carrito</p>
              )}
            </div>

            {producto.medidas && (
              <div className="ficha__bloque">
                <span className="filtro__titulo">Medidas</span>
                <table className="medidas">
                  <tbody>
                    {Object.entries(producto.medidas).map(([clave, valor]) => (
                      <tr key={clave}>
                        <th scope="row">{ETIQUETAS_MEDIDAS[clave] ?? clave}</th>
                        <td>{valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {producto.composicion && (
              <div className="ficha__bloque">
                <span className="filtro__titulo">Materiales</span>
                <p>{producto.composicion}</p>
              </div>
            )}

            <div className="ficha__acciones">
              <div className="cantidad">
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  disabled={cantidad <= 1}
                  aria-label="Quitar una unidad"
                >
                  −
                </button>
                <span aria-live="polite">{cantidad}</span>
                <button
                  type="button"
                  onClick={() => setCantidad((c) => Math.min(disponible, c + 1))}
                  disabled={cantidad >= disponible}
                  aria-label="Agregar una unidad"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="boton"
                onClick={alAgregar}
                disabled={agotado || !talle || disponible === 0}
              >
                {agotado ? 'Sin stock' : 'Agregar al carrito'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
