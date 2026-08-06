import { useState } from 'react'
import { PERSONALIZACION } from '../data/marca.js'
import { linkWhatsApp, mensajePersonalizacion } from '../lib/whatsapp.js'
import { IconoWhatsApp } from './Iconos.jsx'

// Formulario de personalización. No guarda nada: junta los datos y arma el
// mensaje de WhatsApp. La idea es que la consulta llegue completa —qué prenda,
// hasta dónde intervenirla, qué apliques— para poder presupuestar sin ese
// ida y vuelta de diez mensajes preguntando lo mismo de siempre.

const VACIO = {
  prenda: '',
  prendaOtra: '',
  alcance: '',
  detalles: [],
  detalleOtro: '',
  nombre: '',
  contacto: '',
  talle: '',
  comentario: '',
}

export default function Personalizacion() {
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState(null)

  const campo = (nombre) => (e) => setForm((f) => ({ ...f, [nombre]: e.target.value }))

  const alternarDetalle = (detalle) =>
    setForm((f) => ({
      ...f,
      detalles: f.detalles.includes(detalle)
        ? f.detalles.filter((d) => d !== detalle)
        : [...f.detalles, detalle],
    }))

  // «Otra» y «Otro» se reemplazan por lo que la persona escribió: en el mensaje
  // no sirve de nada que diga «Otra».
  const prendaFinal = form.prenda === 'Otra' ? form.prendaOtra.trim() : form.prenda

  const detallesFinales = form.detalles
    .map((d) => (d === 'Otro' ? form.detalleOtro.trim() : d))
    .filter(Boolean)

  const enviar = (e) => {
    e.preventDefault()

    if (!prendaFinal) {
      setError('Contanos qué prenda querés personalizar.')
      return
    }
    if (!form.alcance) {
      setError('Elegí hasta dónde querés que intervengamos la prenda.')
      return
    }
    if (!form.nombre.trim()) {
      setError('Dejanos tu nombre así sabemos con quién hablamos.')
      return
    }

    setError(null)

    const mensaje = mensajePersonalizacion({
      prenda: prendaFinal,
      alcance: form.alcance,
      detalles: detallesFinales,
      nombre: form.nombre.trim(),
      contacto: form.contacto.trim(),
      talle: form.talle.trim(),
      comentario: form.comentario.trim(),
    })

    // Se abre desde el click, así que no lo frena el bloqueador de pop-ups.
    window.open(linkWhatsApp(mensaje), '_blank', 'noopener')
  }

  return (
    <section className="seccion" id="personalizacion" aria-labelledby="titulo-personalizacion">
      <div className="contenedor">
        <h2
          id="titulo-personalizacion"
          className="titulo-seccion gotica gotica--sobre-crema"
        >
          Personalizá tu prenda
        </h2>

        <p className="bajada personalizar__bajada">
          Completá esto y se abre WhatsApp con todo escrito. Con esos datos te armamos el
          presupuesto.
        </p>

        <form className="personalizar" onSubmit={enviar}>
          {/* --- 1. Qué prenda --- */}
          <fieldset className="personalizar__paso">
            <legend className="personalizar__titulo">1 · ¿Qué prenda es?</legend>

            <div className="personalizar__opciones">
              {PERSONALIZACION.prendas.map((prenda) => (
                <button
                  key={prenda}
                  type="button"
                  className="chip"
                  aria-pressed={form.prenda === prenda}
                  onClick={() => setForm((f) => ({ ...f, prenda }))}
                >
                  {prenda}
                </button>
              ))}
            </div>

            {form.prenda === 'Otra' && (
              <label className="personalizar__campo">
                <span className="personalizar__label">¿Cuál?</span>
                <input
                  className="personalizar__control"
                  value={form.prendaOtra}
                  onChange={campo('prendaOtra')}
                  placeholder="Chaleco, mono, capa…"
                />
              </label>
            )}
          </fieldset>

          {/* --- 2. Hasta dónde --- */}
          <fieldset className="personalizar__paso">
            <legend className="personalizar__titulo">2 · ¿Qué querés personalizar?</legend>

            <div className="personalizar__alcances">
              {PERSONALIZACION.alcances.map((alcance) => (
                <label
                  key={alcance.id}
                  className="personalizar__alcance"
                  data-elegido={form.alcance === alcance.titulo}
                >
                  <input
                    type="radio"
                    name="alcance"
                    value={alcance.titulo}
                    checked={form.alcance === alcance.titulo}
                    onChange={campo('alcance')}
                  />
                  <span>
                    <strong>{alcance.titulo}</strong>
                    <span className="personalizar__alcance-texto">{alcance.texto}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* --- 3. Apliques --- */}
          <fieldset className="personalizar__paso">
            <legend className="personalizar__titulo">3 · ¿Qué le querés sumar?</legend>
            <p className="personalizar__ayuda">
              Elegí todas las que quieras, o ninguna si todavía no lo tenés decidido.
            </p>

            <div className="personalizar__opciones">
              {PERSONALIZACION.detalles.map((detalle) => (
                <button
                  key={detalle}
                  type="button"
                  className="chip"
                  aria-pressed={form.detalles.includes(detalle)}
                  onClick={() => alternarDetalle(detalle)}
                >
                  {detalle}
                </button>
              ))}
            </div>

            {form.detalles.includes('Otro') && (
              <label className="personalizar__campo">
                <span className="personalizar__label">Contanos cuál</span>
                <input
                  className="personalizar__control"
                  value={form.detalleOtro}
                  onChange={campo('detalleOtro')}
                  placeholder="Plumas, parches, pedrería…"
                />
              </label>
            )}
          </fieldset>

          {/* --- 4. Vos --- */}
          <fieldset className="personalizar__paso">
            <legend className="personalizar__titulo">4 · Tus datos</legend>

            <div className="personalizar__grilla">
              <label className="personalizar__campo">
                <span className="personalizar__label">Tu nombre</span>
                {/* Sin `required`: la validación del navegador salta al primer
                    campo vacío del final y se queja del nombre cuando lo que
                    falta puede ser la prenda. Los avisos los damos nosotras, en
                    el orden en que se completa el formulario. */}
                <input
                  className="personalizar__control"
                  value={form.nombre}
                  onChange={campo('nombre')}
                />
              </label>

              <label className="personalizar__campo">
                <span className="personalizar__label">Instagram o teléfono (opcional)</span>
                <input
                  className="personalizar__control"
                  value={form.contacto}
                  onChange={campo('contacto')}
                />
              </label>

              <label className="personalizar__campo">
                <span className="personalizar__label">Talle que usás (opcional)</span>
                <input
                  className="personalizar__control"
                  value={form.talle}
                  onChange={campo('talle')}
                  placeholder="M"
                />
              </label>

              <label className="personalizar__campo personalizar__campo--ancho">
                <span className="personalizar__label">Contanos la idea (opcional)</span>
                <textarea
                  className="personalizar__control"
                  rows={3}
                  value={form.comentario}
                  onChange={campo('comentario')}
                  placeholder="Es un jean que ya no me pongo y lo quiero con tachas en los bolsillos y un dibujo atrás"
                />
              </label>
            </div>
          </fieldset>

          {error && (
            <p className="personalizar__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="boton boton--wsp boton--ancho">
            <IconoWhatsApp width={18} height={18} />
            Enviar por WhatsApp
          </button>
        </form>
      </div>
    </section>
  )
}
