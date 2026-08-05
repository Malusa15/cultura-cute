import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { CatalogoProvider } from './context/CatalogoContext.jsx'
import { CarritoProvider } from './context/CarritoContext.jsx'
import './styles/global.css'

// El carrito resuelve sus líneas contra el catálogo, así que va por dentro.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CatalogoProvider>
      <CarritoProvider>
        <App />
      </CarritoProvider>
    </CatalogoProvider>
  </React.StrictMode>,
)
