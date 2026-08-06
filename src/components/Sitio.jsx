import { useState } from 'react'
import Header from './Header.jsx'
import Hero from './Hero.jsx'
import SobreNosotras from './SobreNosotras.jsx'
import Servicios from './Servicios.jsx'
import PedidoAMedida from './PedidoAMedida.jsx'
import Personalizacion from './Personalizacion.jsx'
import Tienda from './Tienda.jsx'
import Contacto from './Contacto.jsx'
import Footer from './Footer.jsx'
import Carrito from './Carrito.jsx'
import { IconoWhatsApp } from './Iconos.jsx'
import { linkWhatsApp } from '../lib/whatsapp.js'

// La tienda pública. Es una sola página con secciones ancladas; el panel vive
// aparte, en /admin.
export default function Sitio() {
  // Cuál de los dos formularios largos está abierto: 'a-medida',
  // 'personalizacion' o ninguno. Vive acá arriba y no en cada formulario para
  // que abrir uno cierre el otro, y arranca en null para que al entrar (o al
  // recargar) la página se vea corta y los formularios cerrados.
  const [formulario, setFormulario] = useState(null)

  const alternar = (cual) => setFormulario((actual) => (actual === cual ? null : cual))

  return (
    <>
      <Header />

      <main>
        <Hero />
        <SobreNosotras />
        {/* Los botones de Servicios bajan al formulario: además de bajar, lo abren. */}
        <Servicios onIrAFormulario={setFormulario} />
        <PedidoAMedida
          abierto={formulario === 'a-medida'}
          alternar={() => alternar('a-medida')}
        />
        <Personalizacion
          abierto={formulario === 'personalizacion'}
          alternar={() => alternar('personalizacion')}
        />
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
