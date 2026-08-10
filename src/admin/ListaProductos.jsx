import { useCallback, useEffect, useMemo, useState } from 'react'
import { cambiarPublicacion, eliminarProducto, traerTodosLosProductos } from '../lib/catalogo.js'
import { avisarCatalogoActualizado } from '../context/CatalogoContext.jsx'
import { alertasDeStock, stockTotal } from '../lib/stock.js'
import { precio } from '../lib/formato.js'
import { fotoUrl } from '../lib/rutas.js'

export default function ListaProductos({ alEditar }) {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  // Id de la prenda con el borrado pendiente de confirmar.
  const [confirmando, setConfirmando] = useState(null)
  // A partir de cuántas unidades avisar. Arranca en 1 —o sea, "queda la última"—
  // porque con tandas chicas un número más alto marca casi todo y deja de servir.
  const [umbral, setUmbral] = useState(1)

  const alertas = useMemo(() => alertasDeStock(productos, umbral), [productos, umbral])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setProductos(await traerTodosLosProductos())
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const alternarPublicacion = async (producto) => {
    try {
      await cambiarPublicacion(producto.id, !producto.activo)
      avisarCatalogoActualizado()
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  const borrar = async (id) => {
    try {
      await eliminarProducto(id)
      setConfirmando(null)
      avisarCatalogoActualizado()
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Prendas</h2>
        <button type="button" className="boton" onClick={() => alEditar('nuevo')}>
          Cargar prenda
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {alertas.length > 0 && (
        <div className="admin-pendientes">
          <h3 className="admin-bloque__titulo">Se están por agotar</h3>
          <p className="admin-ayuda">
            Prendas publicadas a las que les falta stock. Las que no se pueden comprar en ningún
            talle van primero: esas están en la tienda pero nadie las puede llevar.
          </p>

          <ul className="admin-pendientes__lista">
            {alertas.map(({ producto, agotados, bajos, sinNada }) => (
              <li key={producto.id}>
                <span>
                  <strong>{producto.nombre}</strong>
                  {sinNada && <span className="admin-origen">Sin stock</span>}
                  <span className="admin-ayuda">
                    {' '}
                    {agotados.length > 0 && `Agotado en ${agotados.join(', ')}.`}
                    {bajos.length > 0 &&
                      ` ${bajos.map((t) => `Talle ${t.talle}: ${t.stock}`).join(' · ')}.`}
                  </span>
                </span>
                <button type="button" className="admin__link" onClick={() => alEditar(producto)}>
                  Reponer
                </button>
              </li>
            ))}
          </ul>

          <label className="admin-campo">
            <span className="admin-campo__label">Avisarme cuando queden</span>
            <select
              className="admin-campo__control"
              value={umbral}
              onChange={(e) => setUmbral(Number(e.target.value))}
            >
              <option value={1}>1 unidad o menos</option>
              <option value={2}>2 o menos</option>
              <option value={3}>3 o menos</option>
              <option value={5}>5 o menos</option>
            </select>
          </label>
        </div>
      )}

      {cargando ? (
        <p>Cargando prendas…</p>
      ) : productos.length === 0 ? (
        <p className="admin__vacio">
          Todavía no hay prendas cargadas. Empezá con &laquo;Cargar prenda&raquo;.
        </p>
      ) : (
        <div className="admin-tabla__scroll">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => {
                const stock = stockTotal(producto)
                return (
                  <tr key={producto.id} data-inactivo={!producto.activo}>
                    <td>
                      {producto.imagenes[0] ? (
                        <img
                          className="admin-tabla__foto"
                          src={fotoUrl(producto.imagenes[0])}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span className="admin-tabla__foto admin-tabla__foto--vacia" />
                      )}
                    </td>
                    <td>{producto.nombre}</td>
                    <td>
                      {producto.categoria ?? '—'}
                      {producto.subcategoria ? ` · ${producto.subcategoria}` : ''}
                    </td>
                    <td>{precio(producto.precio)}</td>
                    <td>
                      <span data-agotado={stock === 0}>{stock}</span>
                    </td>
                    <td>
                      <span className="admin-estado" data-activo={producto.activo}>
                        {producto.activo ? 'Publicada' : 'Oculta'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-tabla__acciones">
                        <button
                          type="button"
                          className="admin__link"
                          onClick={() => alEditar(producto)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="admin__link"
                          onClick={() => alternarPublicacion(producto)}
                        >
                          {producto.activo ? 'Ocultar' : 'Publicar'}
                        </button>

                        {/* El borrado pide confirmación en la misma fila: es
                            irreversible y se pierde el historial de la prenda. */}
                        {confirmando === producto.id ? (
                          <>
                            <button
                              type="button"
                              className="admin__link admin__link--peligro"
                              onClick={() => borrar(producto.id)}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              className="admin__link"
                              onClick={() => setConfirmando(null)}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="admin__link admin__link--peligro"
                            onClick={() => setConfirmando(producto.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
