import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import { CatalogoProvider } from './context/CatalogoContext.jsx'
import { CarritoProvider } from './context/CarritoContext.jsx'
import './styles/global.css'
// admin.css NO se importa acá: viaja con el panel (ver src/admin/Admin.jsx), que
// se carga aparte. Son 23 KB de estilos de tablas y formularios que quien entra
// a ver prendas no necesita.

// Contraparte de public/404.html: si se entró directo a una ruta que GitHub
// Pages no conoce, la recuperamos antes de que el router lea la URL.
const base = import.meta.env.BASE_URL
const pendiente = sessionStorage.getItem('cultura-cute:ruta-pendiente')
if (pendiente) {
  sessionStorage.removeItem('cultura-cute:ruta-pendiente')
  history.replaceState(null, '', base.replace(/\/$/, '') + '/' + pendiente.replace(/^\//, ''))
}

// El carrito resuelve sus líneas contra el catálogo, así que va por dentro.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={base}>
      <CatalogoProvider>
        <CarritoProvider>
          <App />
          {/* El contador de Vercel, que cuenta las mismas visitas por su lado y
              las muestra en su panel. Es la segunda opinión del contador propio
              de la solapa Estadísticas. Solo hace algo cuando el sitio corre en
              Vercel, así que en desarrollo no molesta. */}
          <Analytics />
        </CarritoProvider>
      </CatalogoProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
