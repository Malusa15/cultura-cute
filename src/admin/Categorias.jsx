import { useCallback, useEffect, useState } from 'react'
import {
  crearCategoria,
  crearSubcategoria,
  eliminarCategoria,
  eliminarSubcategoria,
  traerCategorias,
} from '../lib/catalogo.js'
import { avisarCatalogoActualizado } from '../context/CatalogoContext.jsx'

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [nueva, setNueva] = useState('')
  const [descripcion, setDescripcion] = useState('')
  // { [categoriaId]: texto } — el campo de subcategoría de cada tarjeta.
  const [nuevaSub, setNuevaSub] = useState({})
  const [confirmando, setConfirmando] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setCategorias(await traerCategorias())
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const correr = async (accion) => {
    setError(null)
    try {
      await accion()
      avisarCatalogoActualizado()
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Categorías</h2>
      </div>

      <p className="admin-ayuda">
        Al eliminar una categoría se borran también sus subcategorías, y las prendas que la usaban
        quedan sin categoría (no se borran).
      </p>

      {error && <p className="admin-error">{error}</p>}

      <form
        className="admin-fila admin-fila--alta"
        onSubmit={(e) => {
          e.preventDefault()
          if (!nueva.trim()) return
          correr(() => crearCategoria(nueva, descripcion))
          setNueva('')
          setDescripcion('')
        }}
      >
        <input
          className="admin-campo__control"
          value={nueva}
          placeholder="Nombre de la categoría"
          onChange={(e) => setNueva(e.target.value)}
        />
        <input
          className="admin-campo__control"
          value={descripcion}
          placeholder="Aclaración (opcional)"
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <button type="submit" className="boton">
          Agregar
        </button>
      </form>

      {cargando ? (
        <p>Cargando…</p>
      ) : (
        <div className="admin-categorias">
          {categorias.map((categoria) => (
            <section className="admin-categoria" key={categoria.id}>
              <header className="admin-categoria__header">
                <div>
                  <h3 className="admin-categoria__nombre">{categoria.nombre}</h3>
                  {categoria.descripcion && (
                    <span className="admin-ayuda">{categoria.descripcion}</span>
                  )}
                </div>

                {confirmando === categoria.id ? (
                  <div className="admin-tabla__acciones">
                    <button
                      type="button"
                      className="admin__link admin__link--peligro"
                      onClick={() => {
                        correr(() => eliminarCategoria(categoria.id))
                        setConfirmando(null)
                      }}
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
                  </div>
                ) : (
                  <button
                    type="button"
                    className="admin__link admin__link--peligro"
                    onClick={() => setConfirmando(categoria.id)}
                  >
                    Eliminar
                  </button>
                )}
              </header>

              <ul className="admin-subcategorias">
                {categoria.subcategorias.map((sub) => (
                  <li key={sub.id}>
                    <span>{sub.nombre}</span>
                    <button
                      type="button"
                      className="admin__link admin__link--peligro"
                      onClick={() => correr(() => eliminarSubcategoria(sub.id))}
                      aria-label={`Eliminar ${sub.nombre}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <form
                className="admin-fila"
                onSubmit={(e) => {
                  e.preventDefault()
                  const texto = nuevaSub[categoria.id]?.trim()
                  if (!texto) return
                  correr(() => crearSubcategoria(categoria.id, texto))
                  setNuevaSub((s) => ({ ...s, [categoria.id]: '' }))
                }}
              >
                <input
                  className="admin-campo__control"
                  value={nuevaSub[categoria.id] ?? ''}
                  placeholder="Nueva subcategoría"
                  onChange={(e) =>
                    setNuevaSub((s) => ({ ...s, [categoria.id]: e.target.value }))
                  }
                />
                <button type="submit" className="admin__link">
                  + Agregar
                </button>
              </form>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
