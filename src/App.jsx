import { Route, Routes } from 'react-router-dom'
import Sitio from './components/Sitio.jsx'
import Admin from './admin/Admin.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Sitio />} />
      {/* El panel cuelga de /admin/* para poder tener subpantallas adentro. */}
      <Route path="/admin/*" element={<Admin />} />
      {/* Cualquier otra ruta cae en la tienda en vez de en una pantalla en blanco. */}
      <Route path="*" element={<Sitio />} />
    </Routes>
  )
}
