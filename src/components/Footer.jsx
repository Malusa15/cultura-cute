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
          © {new Date().getFullYear()} {MARCA.nombre} · {MARCA.ciudad} · Prendas artesanales y
          limitadas.
        </p>
      </div>
    </footer>
  )
}
