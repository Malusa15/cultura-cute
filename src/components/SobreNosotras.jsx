import { MARCA } from '../data/marca.js'
import { asset } from '../lib/rutas.js'

export default function SobreNosotras() {
  return (
    <section id="sobre-nosotras" aria-labelledby="titulo-sobre">
      {/* Split rojo/foto, como la página "SOBRE NOSOTROS" del portfolio. */}
      <div className="sobre">
        <div className="sobre__texto">
          <h2 id="titulo-sobre" className="sobre__titulo gotica gotica--sobre-rojo">
            Sobre
            <br />
            Nosotras
          </h2>

          <p className="sobre__parrafo parrafo">{MARCA.sobreNosotras}</p>
          <p className="sobre__parrafo parrafo">{MARCA.vision}</p>
          <p className="sobre__parrafo parrafo">{MARCA.mision}</p>

          <div className="sobre__duenas">
            {MARCA.duenas.map((duena) => (
              <div className="sobre__duena" key={duena.nombre}>
                <strong>{duena.nombre}</strong>
                <span>{duena.rol}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sobre__foto">
          <img
            src={asset('/img/editorial/editorial-3.jpg')}
            alt="Modelo con campera de piel y minifalda, producción de Cultura.Cute"
            loading="lazy"
          />
        </div>
      </div>

      <ul className="valores">
        {MARCA.valores.map((valor) => (
          <li key={valor}>{valor}</li>
        ))}
      </ul>
    </section>
  )
}
