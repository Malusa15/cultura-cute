import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import SobreNosotras from './components/SobreNosotras.jsx'
import Servicios from './components/Servicios.jsx'
import Tienda from './components/Tienda.jsx'
import Contacto from './components/Contacto.jsx'
import Footer from './components/Footer.jsx'
import Carrito from './components/Carrito.jsx'
import { IconoWhatsApp } from './components/Iconos.jsx'
import { linkWhatsApp } from './lib/whatsapp.js'

export default function App() {
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
