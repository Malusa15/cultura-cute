import { useState } from 'react'
import { TABLAS, armarRespaldo, descargarRespaldo, totalDeFilas } from '../lib/respaldo.js'
import { fechaHora, numero } from '../lib/formato.js'

function peso(bytes) {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Respaldo() {
  const [bajando, setBajando] = useState(false)
  const [avance, setAvance] = useState([])
  const [hecho, setHecho] = useState(null)
  const [error, setError] = useState(null)

  const bajar = async () => {
    setBajando(true)
    setError(null)
    setHecho(null)
    setAvance([])

    try {
      const respaldo = await armarRespaldo((paso) => setAvance((a) => [...a, paso]))
      const bytes = descargarRespaldo(respaldo)
      setHecho({
        cuando: respaldo.generado_en,
        filas: totalDeFilas(respaldo),
        bytes,
        problemas: respaldo.problemas,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setBajando(false)
    }
  }

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Respaldo</h2>
        <button type="button" className="boton" onClick={bajar} disabled={bajando}>
          {bajando ? 'Armando la copia…' : 'Bajar copia de seguridad'}
        </button>
      </div>

      <p className="admin-ayuda">
        Baja un archivo con <strong>todo lo que hay cargado en la base</strong>: las prendas y su
        stock, las categorías, las ventas, los encargos, las reservas, los envíos, los presupuestos,
        la economía y las visitas. Guardalo donde guardes las cosas importantes — sirve para
        reconstruir si algo se rompe, y para poder mirar los datos aunque Supabase esté caído.
      </p>

      <p className="admin-ayuda">
        <strong>Las fotos de las prendas no van adentro, y no hace falta:</strong> hoy son archivos
        del proyecto, así que ya están guardadas junto con el código. El archivo sí lleva anotada la
        ruta de cada una. Si alguna vez subís fotos desde el panel, esas van a vivir en Supabase y el
        respaldo va a tener el link pero no la imagen.
      </p>

      {error && <p className="admin-error">{error}</p>}

      {(bajando || avance.length > 0) && (
        <div className="admin-bloque">
          <h3 className="admin-bloque__titulo">
            {bajando ? 'Copiando…' : 'Qué se copió'}
          </h3>
          <ul className="admin-cuenta">
            {avance.map((p) => (
              <li key={p.nombre}>
                <span>{p.titulo}</span>
                <span>
                  {p.filas === 0 ? (
                    <span className="admin-ayuda">vacía</span>
                  ) : (
                    `${numero(p.filas)} ${p.filas === 1 ? 'fila' : 'filas'}`
                  )}
                </span>
              </li>
            ))}
          </ul>
          {bajando && (
            <p className="admin-ayuda">
              {avance.length} de {TABLAS.length}
            </p>
          )}
        </div>
      )}

      {hecho && (
        <>
          <div className="admin-resumen">
            <div className="admin-resumen__dato" data-signo="entra">
              <span className="admin-resumen__label">Se bajó</span>
              <span className="admin-resumen__valor">{peso(hecho.bytes)}</span>
            </div>
            <div className="admin-resumen__dato" data-signo="entra">
              <span className="admin-resumen__label">Filas guardadas</span>
              <span className="admin-resumen__valor">{numero(hecho.filas)}</span>
            </div>
          </div>

          <p className="admin-ayuda">
            Listo: {fechaHora(hecho.cuando)}. Buscalo en la carpeta de descargas, se llama{' '}
            <code>cultura-cute-respaldo-…json</code>.
          </p>

          {hecho.problemas.length > 0 && (
            <div className="admin-error">
              <p>
                Estas tablas no se pudieron copiar. El resto del respaldo sí está completo, pero
                conviene revisarlas:
              </p>
              <ul>
                {hecho.problemas.map((p) => (
                  <li key={p.tabla}>
                    <strong>{p.tabla}</strong>: {p.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <details className="admin-desplegable">
        <summary className="admin-bloque__titulo">Si alguna vez hay que restaurar</summary>
        <p className="admin-ayuda">
          El archivo es de los que lee cualquier programador: adentro está cada tabla con sus filas,
          y una lista con el orden en que hay que volver a cargarlas (primero las categorías, después
          las prendas, después los talles, y así). Restaurar no se hace desde acá a propósito:
          sobrescribir una base es de las pocas cosas del panel que no tienen vuelta atrás, y
          conviene que la haga alguien mirando qué está pisando.
        </p>
        <p className="admin-ayuda">
          Lo más práctico es bajar una copia cada tanto —una vez por mes alcanza— y sobre todo{' '}
          <strong>antes de tocar algo grande</strong>: cargar muchas prendas de una, o borrar cosas.
        </p>
      </details>
    </>
  )
}
