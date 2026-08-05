import { useCallback, useEffect, useState } from 'react'
import { cambiarPublicacion, eliminarProducto, traerTodosLosProductos } from '../lib/catalogo.js'
import { avisarCatalogoActualizado } from '../context/CatalogoContext.jsx'
import { stockTotal } from '../lib/stock.js'
import { precio } from '../lib/formato.js'

export default function ListaProductos({ alEditar }) {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  // Id de la prenda con el borrado pendiente de confirmar.
  const [confirmando, setConfirmando] = useState(null)

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
                          src={producto.imagenes[0]}
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
