import { SERVICIOS } from '../data/marca.js'
import { linkWhatsApp } from '../lib/whatsapp.js'
import { IconoWhatsApp } from './Iconos.jsx'

// Los dos servicios que bajan a un formulario plegado: el link tiene que
// abrirlo, si no la persona llega a la sección y encuentra solo el título.
const FORMULARIOS = ['a-medida', 'personalizacion']

export default function Servicios({ onIrAFormulario }) {
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

              {/* Los servicios que tienen `ancla` bajan a una sección de la
                  misma página en vez de abrir el chat con un mensaje vacío. El
                  href sigue siendo el que baja; el onClick solo abre el
                  formulario que hay al final del viaje. */}
              {servicio.ancla ? (
                <a
                  className="boton"
                  href={`#${servicio.ancla}`}
                  onClick={() => {
                    if (FORMULARIOS.includes(servicio.ancla)) onIrAFormulario(servicio.ancla)
                  }}
                >
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
