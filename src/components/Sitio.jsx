import Header from './Header.jsx'
import Hero from './Hero.jsx'
import SobreNosotras from './SobreNosotras.jsx'
import Servicios from './Servicios.jsx'
import Tienda from './Tienda.jsx'
import Contacto from './Contacto.jsx'
import Footer from './Footer.jsx'
import Carrito from './Carrito.jsx'
import { IconoWhatsApp } from './Iconos.jsx'
import { linkWhatsApp } from '../lib/whatsapp.js'

// La tienda pública. Es una sola página con secciones ancladas; el panel vive
// aparte, en /admin.
export default function Sitio() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <SobreNosotras />
        <Servicios />
        <Tienda />
        <Contacto />
      </main>

      <Footer />
      <Carrito />

      <a
        className="wsp-flotante"
        href={linkWhatsApp('Hola Cultura.Cute! Quiero hacer una consulta')}
        target="_blank"
        rel="noreferrer"
        aria-label="Escribinos por WhatsApp"
      >
        <IconoWhatsApp width={26} height={26} />
      </a>
    </>
  )
}
