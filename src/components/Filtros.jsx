import { useState } from 'react'
import {
  CATEGORIAS,
  COLORES,
  ESTILOS,
  PRECIO_MAXIMO,
  PRECIO_MINIMO,
  TALLES,
  subcategoriasDe,
} from '../data/productos.js'
import { precio } from '../lib/formato.js'
import { IconoChevron, IconoFiltros } from './Iconos.jsx'

export const FILTROS_INICIALES = {
  categorias: [],
  subcategorias: [],
  talles: [],
  colores: [],
  estilos: [],
  precioMax: PRECIO_MAXIMO,
  soloDisponibles: false,
}

export function hayFiltrosActivos(filtros) {
  return (
    filtros.categorias.length > 0 ||
    filtros.subcategorias.length > 0 ||
    filtros.talles.length > 0 ||
    filtros.colores.length > 0 ||
    filtros.estilos.length > 0 ||
    filtros.precioMax < PRECIO_MAXIMO ||
    filtros.soloDisponibles
  )
}

function GrupoChips({ titulo, opciones, seleccionadas, alAlternar }) {
  if (opciones.length === 0) return null

  return (
    <div>
      <span className="filtro__titulo">{titulo}</span>
      <div className="filtro__opciones">
        {opciones.map((opcion) => (
          <button
            key={opcion}
            type="button"
            className="chip"
            aria-pressed={seleccionadas.includes(opcion)}
            onClick={() => alAlternar(opcion)}
          >
            {opcion}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Filtros({ filtros, setFiltros, resultados }) {
  const [panelAbierto, setPanelAbierto] = useState(false)

  // Las subcategorías dependen de las categorías elegidas.
  const subcategorias = subcategoriasDe(filtros.categorias)

  const alternar = (campo) => (valor) => {
    setFiltros((actuales) => {
      const lista = actuales[campo]
      const nueva = lista.includes(valor)
        ? lista.filter((v) => v !== valor)
        : [...lista, valor]

      const siguiente = { ...actuales, [campo]: nueva }

      // Al cambiar de categoría, descartamos las subcategorías que ya no aplican.
      if (campo === 'categorias') {
        const validas = subcategoriasDe(nueva)
        siguiente.subcategorias = actuales.subcategorias.filter((s) => validas.includes(s))
      }

      return siguiente
    })
  }

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
          <button
            key={categoria}
            type="button"
            className="chip"
            aria-pressed={filtros.categorias.includes(categoria)}
            onClick={() => alternar('categorias')(categoria)}
          >
            {categoria}
          </button>
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
            titulo="Subcategoría"
            opciones={subcategorias}
            seleccionadas={filtros.subcategorias}
            alAlternar={alternar('subcategorias')}
          />
          <GrupoChips
            titulo="Talle"
            opciones={TALLES}
            seleccionadas={filtros.talles}
            alAlternar={alternar('talles')}
          />
          <GrupoChips
            titulo="Color"
            opciones={COLORES}
            seleccionadas={filtros.colores}
            alAlternar={alternar('colores')}
          />
          <GrupoChips
            titulo="Estilo"
            opciones={ESTILOS}
            seleccionadas={filtros.estilos}
            alAlternar={alternar('estilos')}
          />

          <div>
            <label className="filtro__titulo" htmlFor="filtro-precio">
              Precio
            </label>
            <input
              id="filtro-precio"
              className="filtro__rango"
              type="range"
              min={PRECIO_MINIMO}
              max={PRECIO_MAXIMO}
              step={1000}
              value={filtros.precioMax}
              onChange={(evento) =>
                setFiltros((a) => ({ ...a, precioMax: Number(evento.target.value) }))
              }
            />
            <span className="filtro__rango-valor">Hasta {precio(filtros.precioMax)}</span>
          </div>

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
