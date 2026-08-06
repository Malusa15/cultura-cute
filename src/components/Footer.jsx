import { Link } from 'react-router-dom'
import { MARCA } from '../data/marca.js'
import { asset } from '../lib/rutas.js'
import { linkWhatsApp } from '../lib/whatsapp.js'
import { IconoInstagram, IconoWhatsApp } from './Iconos.jsx'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="contenedor footer__grid">
        <div className="footer__marca">
          <img src={asset('/img/marca/monograma-cc.png')} alt="" aria-hidden />
          <div>
            <p className="gotica footer__nombre">{MARCA.nombre}</p>
            <p className="bajada">{MARCA.tagline}</p>
          </div>
        </div>

        <div className="footer__enlaces">
          <a
            className="boton boton--crema"
            href={MARCA.instagramUrl}
            target="_blank"
            rel="noreferrer"
          >
            <IconoInstagram width={18} height={18} />@{MARCA.instagram}
          </a>
          <a
            className="boton boton--wsp"
            href={linkWhatsApp('Hola Cultura.Cute!')}
            target="_blank"
            rel="noreferrer"
          >
            <IconoWhatsApp width={18} height={18} />
            WhatsApp
          </a>
        </div>

        <p className="footer__copy">
          <span>
            © {new Date().getFullYear()} {MARCA.nombre} · {MARCA.ciudad} · Prendas artesanales y
            limitadas.
          </span>

          {/* Entrada al panel. Va acá abajo y apagada a propósito: la encuentra
              quien la busca y no le llama la atención a quien vino a ver prendas.
              No es un secreto —/admin pide usuario y contraseña igual—, es no
              ensuciar la tienda con un botón que no es para la clienta. */}
          <Link className="footer__panel" to="/admin">
            Panel
          </Link>
        </p>
      </div>
    </footer>
  )
}
