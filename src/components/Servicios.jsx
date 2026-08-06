import { SERVICIOS } from '../data/marca.js'
import { linkWhatsApp } from '../lib/whatsapp.js'
import { IconoWhatsApp } from './Iconos.jsx'

export default function Servicios() {
  return (
    <section className="seccion" id="servicios" aria-labelledby="titulo-servicios">
      <div className="contenedor">
        <h2 id="titulo-servicios" className="titulo-seccion gotica gotica--sobre-crema">
          Servicios
        </h2>

        <div className="servicios__grid">
          {SERVICIOS.map((servicio) => (
            <article className="servicio" key={servicio.id}>
              <h3 className="servicio__titulo">{servicio.titulo}</h3>
              <p className="servicio__texto">{servicio.texto}</p>

              {/* Los servicios que tienen `ancla` bajan a un formulario de la
                  misma página en vez de abrir el chat con un mensaje vacío. */}
              {servicio.ancla ? (
                <a className="boton" href={`#${servicio.ancla}`}>
                  {servicio.accion}
                </a>
              ) : (
                <a
                  className="boton boton--wsp"
                  href={linkWhatsApp(servicio.consulta)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconoWhatsApp width={18} height={18} />
                  Consultar
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
