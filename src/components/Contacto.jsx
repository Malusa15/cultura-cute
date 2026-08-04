import { MARCA } from '../data/marca.js'
import { asset } from '../lib/rutas.js'
import { linkWhatsApp } from '../lib/whatsapp.js'
import { IconoInstagram, IconoMail, IconoTelefono, IconoWhatsApp } from './Iconos.jsx'

export default function Contacto() {
  return (
    <section className="contacto" id="contacto" aria-labelledby="titulo-contacto">
      <div className="contacto__foto">
        <img
          src={asset('/img/editorial/editorial-4.jpg')}
          alt="Detrás de escena de una producción de Cultura.Cute"
          loading="lazy"
        />
      </div>

      <div className="contacto__panel">
        <h2 id="titulo-contacto" className="contacto__titulo gotica gotica--sobre-rojo">
          Contacto
        </h2>

        <div className="contacto__datos">
          <a className="contacto__dato" href={`tel:+${MARCA.whatsapp}`}>
            <IconoTelefono width={18} height={18} />
            {MARCA.whatsappVisible}
          </a>
          <a className="contacto__dato" href={`mailto:${MARCA.email}`}>
            <IconoMail width={18} height={18} />
            {MARCA.email}
          </a>
          <a
            className="contacto__dato"
            href={MARCA.instagramUrl}
            target="_blank"
            rel="noreferrer"
          >
            <IconoInstagram width={18} height={18} />@{MARCA.instagram}
          </a>
        </div>

        <div>
          <a
            className="boton boton--sobre-rojo"
            href={linkWhatsApp('Hola Cultura.Cute! Quiero hacer una consulta')}
            target="_blank"
            rel="noreferrer"
          >
            <IconoWhatsApp width={18} height={18} />
            Escribinos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}
