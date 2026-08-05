import { useState } from 'react'
import { useCatalogo } from '../context/CatalogoContext.jsx'
import {
  CATEGORIAS,
  DESCRIPCIONES_CATEGORIA,
  ESTILOS,
  GENEROS,
  MATERIALES,
  subcategoriasDe,
} from '../data/taxonomia.js'
import { precio } from '../lib/formato.js'
import { IconoChevron, IconoFiltros } from './Iconos.jsx'

// precioMax en null significa "sin tope". No se puede inicializar con el precio
// más caro del catálogo porque ese valor ahora llega de Supabase y no se conoce
// hasta después de la primera carga.
export const FILTROS_INICIALES = {
  generos: [],
  categorias: [],
  subcategorias: [],
  talles: [],
  colores: [],
  materiales: [],
  estilos: [],
  precioMax: null,
  soloDisponibles: false,
}

export function hayFiltrosActivos(filtros) {
  return (
    filtros.generos.length > 0 ||
    filtros.categorias.length > 0 ||
    filtros.subcategorias.length > 0 ||
    filtros.talles.length > 0 ||
    filtros.colores.length > 0 ||
    filtros.materiales.length > 0 ||
    filtros.estilos.length > 0 ||
    filtros.precioMax !== null ||
    filtros.soloDisponibles
  )
}

// Un chip por opción. Todas quedan clickeables, incluso las que todavía no tienen
// prendas cargadas: al elegirlas, la tienda muestra el cartel de "Próximamente"
// en vez de un resultado vacío.
function Chip({ valor, campo, activo, alAlternar, titulo }) {
  const { hayProductosCon } = useCatalogo()
  const conPrendas = hayProductosCon(campo, valor)

  const ayuda = [titulo, conPrendas ? null : 'Próximamente'].filter(Boolean).join(' — ')

  return (
    <button
      type="button"
      className="chip"
      aria-pressed={activo}
      title={ayuda}
      onClick={() => alAlternar(valor)}
    >
      {valor}
    </button>
  )
}

function GrupoChips({ titulo, campo, opciones, seleccionadas, alAlternar }) {
  if (opciones.length === 0) return null

  return (
    <div>
      <span className="filtro__titulo">{titulo}</span>
      <div className="filtro__opciones">
        {opciones.map((opcion) => (
          <Chip
            key={opcion}
            valor={opcion}
            campo={campo}
            activo={seleccionadas.includes(opcion)}
            alAlternar={alAlternar}
          />
        ))}
      </div>
    </div>
  )
}

export default function Filtros({ filtros, setFiltros, resultados }) {
  const [panelAbierto, setPanelAbierto] = useState(false)
  const { colores, talles, precioMinimo, precioMaximo } = useCatalogo()

  // La subcategoría recién tiene sentido con una categoría elegida: sin filtrar
  // serían más de veinte chips sueltos.
  const subcategorias = subcategoriasDe(filtros.categorias)

  const alternar = (campo) => (valor) => {
    setFiltros((actuales) => {
      const lista = actuales[campo]
      const nueva = lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]
      const siguiente = { ...actuales, [campo]: nueva }

      // Al cambiar de categoría, descartamos las subcategorías que ya no aplican.
      if (campo === 'categorias') {
        const validas = subcategoriasDe(nueva)
        siguiente.subcategorias = actuales.subcategorias.filter((s) => validas.includes(s))
      }

      return siguiente
    })
  }

  const topeActual = filtros.precioMax ?? precioMaximo
  const hayRangoDePrecio = precioMaximo > precioMinimo

  return (
    <div className="filtros">
      <div className="filtros__categorias">
        <button
          type="button"
          className="chip"
          aria-pressed={filtros.categorias.length === 0}
          onClick={() => setFiltros((a) => ({ ...a, categorias: [], subcategorias: [] }))}
        >
          Todo
        </button>
        {CATEGORIAS.map((categoria) => (
          <Chip
            key={categoria}
            valor={categoria}
            campo="categoria"
            activo={filtros.categorias.includes(categoria)}
            alAlternar={alternar('categorias')}
            titulo={DESCRIPCIONES_CATEGORIA[categoria]}
          />
        ))}
      </div>

      <div className="filtros__barra">
        <button
          type="button"
          className="filtros__toggle"
          aria-expanded={panelAbierto}
          aria-controls="panel-filtros"
          onClick={() => setPanelAbierto((abierto) => !abierto)}
        >
          <IconoFiltros />
          Filtros
          <IconoChevron />
        </button>

        <span className="tienda__conteo">
          {resultados} {resultados === 1 ? 'prenda' : 'prendas'}
        </span>

        {hayFiltrosActivos(filtros) && (
          <button
            type="button"
            className="filtros__limpiar"
            onClick={() => setFiltros(FILTROS_INICIALES)}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {panelAbierto && (
        <div className="filtros__panel" id="panel-filtros">
          <GrupoChips
            titulo="Género"
            campo="genero"
            opciones={GENEROS}
            seleccionadas={filtros.generos}
            alAlternar={alternar('generos')}
          />
          <GrupoChips
            titulo="Subcategoría"
            campo="subcategoria"
            opciones={subcategorias}
            seleccionadas={filtros.subcategorias}
            alAlternar={alternar('subcategorias')}
          />
          <GrupoChips
            titulo="Talle"
            campo="talle"
            opciones={talles}
            seleccionadas={filtros.talles}
            alAlternar={alternar('talles')}
          />
          <GrupoChips
            titulo="Color"
            campo="color"
            opciones={colores}
            seleccionadas={filtros.colores}
            alAlternar={alternar('colores')}
          />
          <GrupoChips
            titulo="Material"
            campo="material"
            opciones={MATERIALES}
            seleccionadas={filtros.materiales}
            alAlternar={alternar('materiales')}
          />
          <GrupoChips
            titulo="Estilo"
            campo="estilo"
            opciones={ESTILOS}
            seleccionadas={filtros.estilos}
            alAlternar={alternar('estilos')}
          />

          {hayRangoDePrecio && (
            <div>
              <label className="filtro__titulo" htmlFor="filtro-precio">
                Precio
              </label>
              <input
                id="filtro-precio"
                className="filtro__rango"
                type="range"
                min={precioMinimo}
                max={precioMaximo}
                step={1000}
                value={topeActual}
                onChange={(evento) =>
                  setFiltros((a) => ({ ...a, precioMax: Number(evento.target.value) }))
                }
              />
              <span className="filtro__rango-valor">Hasta {precio(topeActual)}</span>
            </div>
          )}

          <div>
            <span className="filtro__titulo">Disponibilidad</span>
            <div className="filtro__opciones">
              <button
                type="button"
                className="chip"
                aria-pressed={filtros.soloDisponibles}
                onClick={() => setFiltros((a) => ({ ...a, soloDisponibles: !a.soloDisponibles }))}
              >
                Solo con stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
