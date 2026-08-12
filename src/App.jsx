import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Sitio from './components/Sitio.jsx'

// El panel se carga aparte y solo al entrar a /admin.
//
// Es mucho más código que la tienda —diez solapas, tablas, formularios, el
// armado de PDFs— y quien entra a mirar prendas no lo va a usar nunca. Con el
// import común viajaba todo junto en el mismo archivo, así que cada visita
// desde el celular se bajaba el panel entero para nada. Así, la tienda se lleva
// lo suyo y el panel se descarga recién cuando alguien lo abre.
const Admin = lazy(() => import('./admin/Admin.jsx'))

// Se ve una fracción de segundo mientras baja el panel.
//
// Los estilos van escritos acá adentro y no en una clase a propósito: la hoja de
// estilos del panel viaja con el panel, o sea que todavía no llegó cuando esto
// se pinta. Con una clase, este cartel aparecería sin formato justo en el
// momento en que se lo ve.
function CargandoPanel() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#a9170b',
        color: '#fffce8',
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing: '0.08em',
      }}
    >
      Cargando el panel…
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Sitio />} />
      {/* Cada prenda tiene su propia dirección. Es la misma página de siempre:
          la tienda mira el final de la dirección y abre esa ficha. Sirve para
          poder mandar el link de una prenda puntual por WhatsApp o Instagram, y
          para que Google las muestre una por una. Los datos que ve WhatsApp al
          armar la vista previa los pone api/prenda.js, porque los buscadores y
          las redes no ejecutan JavaScript. */}
      <Route path="/prenda/:slug" element={<Sitio />} />
      {/* El panel cuelga de /admin/* para poder tener subpantallas adentro. */}
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<CargandoPanel />}>
            <Admin />
          </Suspense>
        }
      />
      {/* Cualquier otra ruta cae en la tienda en vez de en una pantalla en blanco. */}
      <Route path="*" element={<Sitio />} />
    </Routes>
  )
}
