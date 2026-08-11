import { Route, Routes } from 'react-router-dom'
import Sitio from './components/Sitio.jsx'
import Admin from './admin/Admin.jsx'

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
      <Route path="/admin/*" element={<Admin />} />
      {/* Cualquier otra ruta cae en la tienda en vez de en una pantalla en blanco. */}
      <Route path="*" element={<Sitio />} />
    </Routes>
  )
}
