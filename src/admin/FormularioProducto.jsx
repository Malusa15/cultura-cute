import { useEffect, useState } from 'react'
import { guardarProducto, subirFoto, traerCategorias } from '../lib/catalogo.js'
import { avisarCatalogoActualizado } from '../context/CatalogoContext.jsx'
import { ESTILOS, GENEROS, MATERIALES, ORDEN_TALLES } from '../data/taxonomia.js'

// Las medidas son campos libres, pero estas son las que se repiten en casi todas
// las prendas, así que el formulario arranca con ellas.
const MEDIDAS_HABITUALES = ['largo', 'busto', 'cintura', 'cadera']

function estadoInicial(producto) {
  return {
    id: producto?.id ?? null,
    nombre: producto?.nombre ?? '',
    precio: producto?.precio ?? '',
    genero: producto?.genero ?? 'Mujer',
    categoria_id: producto?.categoria_id ?? '',
    subcategoria_id: producto?.subcategoria_id ?? '',
    descripcion: producto?.descripcion ?? '',
    composicion: producto?.composicion ?? '',
    color: producto?.color ?? '',
    materiales: producto?.materiales ?? [],
    estilo: producto?.estilo ?? [],
    imagenes: producto?.imagenes ?? [],
    activo: producto?.activo ?? true,
    orden: producto?.orden ?? 0,
  }
}

function tallesIniciales(producto) {
  if (producto?.talles?.length) return producto.talles.map((t) => ({ ...t }))
  return [
    { talle: 'S', stock: 0 },
    { talle: 'M', stock: 0 },
    { talle: 'L', stock: 0 },
  ]
}

function medidasIniciales(producto) {
  const cargadas = Object.entries(producto?.medidas ?? {}).map(([clave, valor]) => ({
    clave,
    valor,
  }))
  const faltantes = MEDIDAS_HABITUALES.filter((m) => !cargadas.some((c) => c.clave === m)).map(
    (clave) => ({ clave, valor: '' }),
  )
  return [...cargadas, ...faltantes]
}

export default function FormularioProducto({ producto, alCerrar }) {
  const [datos, setDatos] = useState(() => estadoInicial(producto))
  const [talles, setTalles] = useState(() => tallesIniciales(producto))
  const [medidas, setMedidas] = useState(() => medidasIniciales(producto))
  const [categorias, setCategorias] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    traerCategorias().then(setCategorias).catch((e) => setError(e.message))
  }, [])

  const campo = (nombre) => (evento) =>
    setDatos((d) => ({ ...d, [nombre]: evento.target.value }))

  const alternarLista = (nombre, valor) =>
    setDatos((d) => ({
      ...d,
      [nombre]: d[nombre].includes(valor)
        ? d[nombre].filter((v) => v !== valor)
        : [...d[nombre], valor],
    }))

  const categoriaElegida = categorias.find((c) => c.id === datos.categoria_id)

  const subirArchivos = async (evento) => {
    const archivos = [...evento.target.files]
    if (!archivos.length) return

    setSubiendo(true)
    setError(null)
    try {
      const urls = await Promise.all(archivos.map(subirFoto))
      setDatos((d) => ({ ...d, imagenes: [...d.imagenes, ...urls] }))
    } catch (e) {
      setError(`No se pudo subir la foto: ${e.message}`)
    } finally {
      setSubiendo(false)
      evento.target.value = ''
    }
  }

  const moverFoto = (indice, salto) => {
    setDatos((d) => {
      const destino = indice + salto
      if (destino < 0 || destino >= d.imagenes.length) return d
      const copia = [...d.imagenes]
      ;[copia[indice], copia[destino]] = [copia[destino], copia[indice]]
      return { ...d, imagenes: copia }
    })
  }

  const enviar = async (evento) => {
    evento.preventDefault()
    setError(null)

    const precioNumero = Number(datos.precio)
    if (!Number.isFinite(precioNumero) || precioNumero < 0) {
      setError('El precio tiene que ser un número.')
      return
    }

    setGuardando(true)
    try {
      await guardarProducto(
        {
          ...datos,
          precio: Math.round(precioNumero),
          // Solo se guardan las medidas que tienen valor.
          medidas: Object.fromEntries(
            medidas.filter((m) => m.clave.trim() && m.valor.trim()).map((m) => [m.clave.trim(), m.valor.trim()]),
          ),
        },
        talles,
      )
      avisarCatalogoActualizado()
      alCerrar()
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={enviar}>
      <div className="admin__barra">
        <h2 className="admin__seccion">{producto ? 'Editar prenda' : 'Cargar prenda'}</h2>
        <button type="button" className="admin__link" onClick={alCerrar}>
          Volver al listado
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-form__grilla">
        <label className="admin-campo admin-campo--ancho">
          <span className="admin-campo__label">Nombre</span>
          <input
            className="admin-campo__control"
            value={datos.nombre}
            onChange={campo('nombre')}
            required
          />
        </label>

        <label className="admin-campo">
          <span className="admin-campo__label">Precio (ARS)</span>
          <input
            className="admin-campo__control"
            type="number"
            min="0"
            step="500"
            value={datos.precio}
            onChange={campo('precio')}
            required
          />
        </label>

        <label className="admin-campo">
          <span className="admin-campo__label">Género</span>
          <select className="admin-campo__control" value={datos.genero} onChange={campo('genero')}>
            {GENEROS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-campo">
          <span className="admin-campo__label">Categoría</span>
          <select
            className="admin-campo__control"
            value={datos.categoria_id}
            onChange={(e) =>
              // Al cambiar de categoría, la subcategoría vieja deja de aplicar.
              setDatos((d) => ({ ...d, categoria_id: e.target.value, subcategoria_id: '' }))
            }
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-campo">
          <span className="admin-campo__label">Subcategoría</span>
          <select
            className="admin-campo__control"
            value={datos.subcategoria_id}
            onChange={campo('subcategoria_id')}
            disabled={!categoriaElegida}
          >
            <option value="">Sin subcategoría</option>
            {(categoriaElegida?.subcategorias ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-campo">
          <span className="admin-campo__label">Color</span>
          <input className="admin-campo__control" value={datos.color} onChange={campo('color')} />
        </label>

        <label className="admin-campo admin-campo--ancho">
          <span className="admin-campo__label">Descripción</span>
          <textarea
            className="admin-campo__control"
            rows={3}
            value={datos.descripcion}
            onChange={campo('descripcion')}
          />
        </label>

        <label className="admin-campo admin-campo--ancho">
          <span className="admin-campo__label">Composición (texto que se muestra en la ficha)</span>
          <input
            className="admin-campo__control"
            value={datos.composicion}
            onChange={campo('composicion')}
            placeholder="Satén de poliéster, forrería de algodón"
          />
        </label>
      </div>

      {/* Talles y stock ------------------------------------------------------ */}
      <fieldset className="admin-bloque">
        <legend className="admin-campo__label">Talles y stock</legend>

        {talles.map((t, indice) => (
          <div className="admin-fila" key={indice}>
            <input
              className="admin-campo__control"
              list="talles-sugeridos"
              value={t.talle}
              placeholder="Talle"
              onChange={(e) =>
                setTalles((ts) => ts.map((x, i) => (i === indice ? { ...x, talle: e.target.value } : x)))
              }
            />
            <input
              className="admin-campo__control"
              type="number"
              min="0"
              value={t.stock}
              placeholder="Stock"
              onChange={(e) =>
                setTalles((ts) =>
                  ts.map((x, i) => (i === indice ? { ...x, stock: Number(e.target.value) } : x)),
                )
              }
            />
            <button
              type="button"
              className="admin__link admin__link--peligro"
              onClick={() => setTalles((ts) => ts.filter((_, i) => i !== indice))}
            >
              Quitar
            </button>
          </div>
        ))}

        <datalist id="talles-sugeridos">
          {ORDEN_TALLES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>

        <button
          type="button"
          className="admin__link"
          onClick={() => setTalles((ts) => [...ts, { talle: '', stock: 0 }])}
        >
          + Agregar talle
        </button>
      </fieldset>

      {/* Medidas ------------------------------------------------------------- */}
      <fieldset className="admin-bloque">
        <legend className="admin-campo__label">Medidas</legend>

        {medidas.map((m, indice) => (
          <div className="admin-fila" key={indice}>
            <input
              className="admin-campo__control"
              value={m.clave}
              placeholder="Largo"
              onChange={(e) =>
                setMedidas((ms) => ms.map((x, i) => (i === indice ? { ...x, clave: e.target.value } : x)))
              }
            />
            <input
              className="admin-campo__control"
              value={m.valor}
              placeholder="34 cm"
              onChange={(e) =>
                setMedidas((ms) => ms.map((x, i) => (i === indice ? { ...x, valor: e.target.value } : x)))
              }
            />
            <button
              type="button"
              className="admin__link admin__link--peligro"
              onClick={() => setMedidas((ms) => ms.filter((_, i) => i !== indice))}
            >
              Quitar
            </button>
          </div>
        ))}

        <button
          type="button"
          className="admin__link"
          onClick={() => setMedidas((ms) => [...ms, { clave: '', valor: '' }])}
        >
          + Agregar medida
        </button>
      </fieldset>

      {/* Tags ---------------------------------------------------------------- */}
      <fieldset className="admin-bloque">
        <legend className="admin-campo__label">Material</legend>
        <div className="filtro__opciones">
          {MATERIALES.map((m) => (
            <button
              key={m}
              type="button"
              className="chip"
              aria-pressed={datos.materiales.includes(m)}
              onClick={() => alternarLista('materiales', m)}
            >
              {m}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="admin-bloque">
        <legend className="admin-campo__label">Estilo</legend>
        <div className="filtro__opciones">
          {ESTILOS.map((e) => (
            <button
              key={e}
              type="button"
              className="chip"
              aria-pressed={datos.estilo.includes(e)}
              onClick={() => alternarLista('estilo', e)}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Fotos --------------------------------------------------------------- */}
      <fieldset className="admin-bloque">
        <legend className="admin-campo__label">Fotos</legend>
        <p className="admin-ayuda">La primera es la que se ve en la tienda.</p>

        <div className="admin-fotos">
          {datos.imagenes.map((url, indice) => (
            <div className="admin-foto" key={url}>
              <img src={url} alt="" />
              <div className="admin-foto__acciones">
                <button type="button" className="admin__link" onClick={() => moverFoto(indice, -1)}>
                  ←
                </button>
                <button type="button" className="admin__link" onClick={() => moverFoto(indice, 1)}>
                  →
                </button>
                <button
                  type="button"
                  className="admin__link admin__link--peligro"
                  onClick={() =>
                    setDatos((d) => ({ ...d, imagenes: d.imagenes.filter((_, i) => i !== indice) }))
                  }
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        <input type="file" accept="image/*" multiple onChange={subirArchivos} disabled={subiendo} />
        {subiendo && <p className="admin-ayuda">Subiendo…</p>}
      </fieldset>

      <div className="admin-form__pie">
        <label className="admin-check">
          <input
            type="checkbox"
            checked={datos.activo}
            onChange={(e) => setDatos((d) => ({ ...d, activo: e.target.checked }))}
          />
          Publicada en la tienda
        </label>

        <div className="admin-form__botones">
          <button type="button" className="boton boton--fantasma" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" className="boton" disabled={guardando || subiendo}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  )
}
