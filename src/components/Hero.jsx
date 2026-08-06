import { useEffect, useRef, useState } from 'react'
import { MARCA } from '../data/marca.js'
import { asset } from '../lib/rutas.js'
import NombreMarca from './NombreMarca.jsx'

const FOTOS = [
  { src: asset('/img/editorial/editorial-1.jpg'), alt: 'Dos modelos con prendas Cultura.Cute en una escalera' },
  { src: asset('/img/editorial/editorial-2.jpg'), alt: 'Modelos retocándose el maquillaje de noche' },
  { src: asset('/img/editorial/editorial-3.jpg'), alt: 'Modelo con campera de piel y minifalda' },
  { src: asset('/img/editorial/editorial-4.jpg'), alt: 'Retrato en movimiento con luces rojas' },
]

const INTERVALO = 5000
const UMBRAL_SWIPE = 50 // px que hay que arrastrar para que cuente como swipe

export default function Hero() {
  const [activo, setActivo] = useState(0)
  const [pausado, setPausado] = useState(false)
  const inicioTactil = useRef(null)

  useEffect(() => {
    if (pausado) return
    const id = setInterval(() => setActivo((i) => (i + 1) % FOTOS.length), INTERVALO)
    return () => clearInterval(id)
  }, [pausado])

  const irA = (indice) => setActivo((indice + FOTOS.length) % FOTOS.length)

  const alTocar = (evento) => {
    inicioTactil.current = evento.touches[0].clientX
    setPausado(true)
  }

  const alSoltar = (evento) => {
    const inicio = inicioTactil.current
    setPausado(false)
    if (inicio == null) return

    const recorrido = evento.changedTouches[0].clientX - inicio
    if (Math.abs(recorrido) > UMBRAL_SWIPE) irA(activo + (recorrido < 0 ? 1 : -1))
    inicioTactil.current = null
  }

  return (
    <section
      className="hero"
      id="inicio"
      onTouchStart={alTocar}
      onTouchEnd={alSoltar}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="hero__carrusel" aria-roledescription="carrusel">
        {FOTOS.map((foto, indice) => (
          <div
            key={foto.src}
            className="hero__slide"
            data-activo={indice === activo}
            aria-hidden={indice !== activo}
          >
            <img src={foto.src} alt={foto.alt} loading={indice === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
        <div className="hero__velo" />
      </div>

      <div className="hero__contenido contenedor">
        <h1 className="hero__titulo gotica gotica--sobre-rojo">
          <NombreMarca />
        </h1>
        <p className="hero__bajada bajada">{MARCA.tagline}</p>
        <a className="boton boton--sobre-rojo" href="#tienda">
          Ver tienda
        </a>
      </div>

      <div className="hero__puntos">
        {FOTOS.map((foto, indice) => (
          <button
            key={foto.src}
            type="button"
            className="hero__punto"
            aria-current={indice === activo}
            aria-label={`Ver foto ${indice + 1} de ${FOTOS.length}`}
            onClick={() => irA(indice)}
          />
        ))}
      </div>
    </section>
  )
}
