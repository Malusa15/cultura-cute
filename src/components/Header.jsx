import { useEffect, useState } from 'react'
import { MARCA, NAVEGACION } from '../data/marca.js'
import { useCarrito } from '../context/CarritoContext.jsx'
import { asset } from '../lib/rutas.js'
import { linkWhatsApp } from '../lib/whatsapp.js'
import { IconoCarrito, IconoCerrar, IconoMenu, IconoWhatsApp } from './Iconos.jsx'
import Reloj from './Reloj.jsx'

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { unidades, abrir } = useCarrito()

  // El menu se cierra con Escape, igual que el modal y el carrito.
  useEffect(() => {
    if (!menuAbierto) return
    const alPresionar = (evento) => evento.key === 'Escape' && setMenuAbierto(false)
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [menuAbierto])

  return (
    <header className="header">
      <div className="contenedor">
        {/* La franja de arriba: las palabras de la marca y, al final, la fecha y
            la hora corriendo. En pantallas chicas la regla del CSS esconde las
            del medio, así que quedan «2026» y el reloj. */}
        <div className="header__eyebrow eyebrow">
          {MARCA.eyebrow.map((palabra) => (
            <span key={palabra}>{palabra}</span>
          ))}
          <Reloj className="reloj--eyebrow" />
        </div>

        <div className="header__barra">
          <div className="header__izquierda">
            <a
              className="icono-boton"
              href={linkWhatsApp('Hola Cultura.Cute! Quiero hacer una consulta')}
              target="_blank"
              rel="noreferrer"
              aria-label="Escribinos por WhatsApp"
            >
              <IconoWhatsApp />
            </a>
          </div>

          <a
            className="header__logo"
            href="#inicio"
            aria-label={`${MARCA.nombre} — ir al inicio`}
            onClick={() => setMenuAbierto(false)}
          >
            <img src={asset('/img/marca/wordmark.png')} alt={MARCA.nombre} />
          </a>

          <div className="header__acciones">
            <button
              type="button"
              className="icono-boton"
              onClick={abrir}
              aria-label={`Abrir carrito (${unidades} ${unidades === 1 ? 'prenda' : 'prendas'})`}
            >
              <IconoCarrito />
              {unidades > 0 && <span className="icono-boton__contador">{unidades}</span>}
            </button>

            <button
              type="button"
              className="icono-boton"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              aria-expanded={menuAbierto}
              aria-controls="menu-principal"
              aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            >
              {menuAbierto ? <IconoCerrar /> : <IconoMenu />}
            </button>
          </div>
        </div>
      </div>

      <nav id="menu-principal" className="menu" data-abierto={menuAbierto} aria-hidden={!menuAbierto}>
        <div className="contenedor">
          <ul className="menu__lista">
            {NAVEGACION.map((item) => (
              <li key={item.id}>
                <a
                  className="menu__link gotica"
                  href={`#${item.id}`}
                  onClick={() => setMenuAbierto(false)}
                  tabIndex={menuAbierto ? 0 : -1}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  )
}
