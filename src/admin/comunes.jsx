import { useCallback, useEffect, useState } from 'react'

// Las secciones nuevas hacen todas lo mismo: traer una lista, mostrar el error
// si falla, y recargar después de cada cambio. Esto es ese andamiaje.
//
// `inicial` es lo que se muestra mientras carga. Casi siempre una lista vacía,
// pero Economía trae varias listas juntas y necesita un objeto.
export function useLista(traer, inicial = []) {
  const [datos, setDatos] = useState(inicial)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(await traer())
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [traer])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Corre una acción y refresca. Si falla, el error queda visible y la lista no
  // se toca, así no parece que el cambio se guardó.
  const correr = useCallback(
    async (accion) => {
      setError(null)
      try {
        await accion()
        await cargar()
      } catch (e) {
        setError(e.message)
      }
    },
    [cargar],
  )

  return { datos, cargando, error, setError, cargar, correr }
}

// Select de estado. `opciones` es el objeto { valor: 'Etiqueta' } de ventas.js.
export function SelectEstado({ valor, opciones, alCambiar, etiqueta }) {
  return (
    <select
      className="admin-estado__select"
      value={valor}
      data-estado={valor}
      aria-label={etiqueta}
      onChange={(e) => alCambiar(e.target.value)}
    >
      {Object.entries(opciones).map(([clave, texto]) => (
        <option key={clave} value={clave}>
          {texto}
        </option>
      ))}
    </select>
  )
}

// Botón de borrar que pide confirmación en el lugar, igual que en Prendas.
export function BotonEliminar({ activo, alPedir, alCancelar, alConfirmar }) {
  if (!activo) {
    return (
      <button type="button" className="admin__link admin__link--peligro" onClick={alPedir}>
        Eliminar
      </button>
    )
  }

  return (
    <>
      <button type="button" className="admin__link admin__link--peligro" onClick={alConfirmar}>
        Confirmar
      </button>
      <button type="button" className="admin__link" onClick={alCancelar}>
        Cancelar
      </button>
    </>
  )
}

export function Vacio({ children }) {
  return <p className="admin__vacio">{children}</p>
}
