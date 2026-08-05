import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '../lib/supabase.js'
import { useSesion } from './useSesion.js'
import Login from './Login.jsx'
import ListaProductos from './ListaProductos.jsx'
import FormularioProducto from './FormularioProducto.jsx'
import Categorias from './Categorias.jsx'
import Ventas from './Ventas.jsx'
import Encargos from './Encargos.jsx'
import Reservas from './Reservas.jsx'
import Envios from './Envios.jsx'

// El orden sigue el recorrido de una prenda: primero el catálogo, después lo que
// pasa cuando alguien la compra.
const SOLAPAS = [
  { id: 'prendas', label: 'Prendas' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'encargos', label: 'Encargos' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'envios', label: 'Envíos' },
]

// Aviso para cuando el panel se abre sin credenciales cargadas. Sin esto, el
// login fallaría sin explicar por qué.
function FaltaConfigurar() {
  return (
    <div className="admin-login">
      <div className="admin-login__caja">
        <h1 className="admin-login__titulo gotica">Falta conectar la base</h1>
        <p>
          El panel necesita las credenciales de Supabase para funcionar. Hay que crear el
          proyecto, correr <code>supabase/schema.sql</code> y cargar <code>VITE_SUPABASE_URL</code>{' '}
          y <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <p>Los pasos están en el README del repositorio.</p>
        <Link className="boton boton--fantasma" to="/">
          Volver a la tienda
        </Link>
      </div>
    </div>
  )
}

export default function Admin() {
  const { sesion, cargando } = useSesion()
  const [solapa, setSolapa] = useState('prendas')
  // null = no hay formulario abierto. Un producto = editar. 'nuevo' = alta.
  const [editando, setEditando] = useState(null)

  if (!supabaseConfigurado) return <FaltaConfigurar />

  if (cargando) {
    return (
      <div className="admin-login">
        <div className="admin-login__caja">
          <p>Cargando…</p>
        </div>
      </div>
    )
  }

  if (!sesion) return <Login />

  return (
    <div className="admin">
      <header className="admin__header">
        <div className="admin__marca">
          <span className="gotica admin__titulo">Cultura.Cute</span>
          <span className="admin__subtitulo">Panel de administración</span>
        </div>

        <nav className="admin__solapas">
          {SOLAPAS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="admin__solapa"
              aria-current={solapa === s.id}
              onClick={() => {
                setSolapa(s.id)
                setEditando(null)
              }}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="admin__sesion">
          <span className="admin__mail">{sesion?.user?.email}</span>
          <Link className="admin__link" to="/">
            Ver tienda
          </Link>
          <button
            type="button"
            className="admin__link"
            onClick={() => supabase.auth.signOut()}
          >
            Salir
          </button>
        </div>
      </header>

      <main className="admin__contenido">
        {solapa === 'prendas' &&
          (editando ? (
            <FormularioProducto
              producto={editando === 'nuevo' ? null : editando}
              alCerrar={() => setEditando(null)}
            />
          ) : (
            <ListaProductos alEditar={setEditando} />
          ))}

        {solapa === 'categorias' && <Categorias />}
        {solapa === 'ventas' && <Ventas />}
        {solapa === 'encargos' && <Encargos />}
        {solapa === 'reservas' && <Reservas />}
        {solapa === 'envios' && <Envios />}
      </main>
    </div>
  )
}
