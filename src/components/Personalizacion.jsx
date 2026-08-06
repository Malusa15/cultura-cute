import { useState } from 'react'
import { PERSONALIZACION } from '../data/marca.js'
import { linkWhatsApp, mensajePersonalizacion } from '../lib/whatsapp.js'
import { registrarPedidoAMedida } from '../lib/presupuestos.js'
import { supabaseConfigurado } from '../lib/supabase.js'
import { IconoWhatsApp } from './Iconos.jsx'

// Formulario de personalización.
//
// Igual que el de prendas a pedido, deja un presupuesto en borrador en el panel
// para no tener que copiarlo a mano, y después abre WhatsApp. Usa la misma
// función de alta: para la base son lo mismo —una consulta que hay que
// cotizar—, y lo que las distingue es la descripción.

const VACIO = {
  prenda: '',
  prendaOtra: '',
  // Personalización Cutie: la clienta elige la prenda y nos deja el resto a
  // nosotras. Apaga los pasos 2 y 3 en vez de borrarlos, así si se arrepiente y
  // la destilda vuelve a encontrar lo que había marcado.
  cutie: false,
  alcance: '',
  detalles: [],
  detalleOtro: '',
  nombre: '',
  contacto: '',
  talle: '',
  comentario: '',
}

// `abierto` y `alternar` los maneja Sitio.jsx: el formulario arranca cerrado y
// abrirlo cierra el de prendas a pedido. Lo que ya se completó no se pierde al
// cerrarlo (la sección sigue montada, lo único que se esconde es el formulario).
export default function Personalizacion({ abierto, alternar }) {
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

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

  // Lo que queda escrito en el campo «Cómo es el diseño» del panel. Arranca
  // diciendo que es una personalización para distinguirla de un pedido a medida,
  // que van a la misma lista.
  const armarDescripcion = () => {
    const partes = [
      form.cutie
        ? 'Personalización Cutie: la intervenimos a nuestro criterio.'
        : `Personalización: ${form.alcance}.`,
    ]
    if (!form.cutie && detallesFinales.length) {
      partes.push(`Apliques y detalles: ${detallesFinales.join(', ')}`)
    }
    if (form.comentario.trim()) partes.push(form.comentario.trim())
    return partes.join('\n')
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (enviando) return

    if (!prendaFinal) {
      setError('Contanos qué prenda querés personalizar.')
      return
    }
    // Con la Cutie el alcance lo elegimos nosotras, así que no se pide.
    if (!form.cutie && !form.alcance) {
      setError('Elegí hasta dónde querés que intervengamos la prenda.')
      return
    }
    if (!form.nombre.trim()) {
      setError('Dejanos tu nombre así sabemos con quién hablamos.')
      return
    }
    // Ahora esto deja un presupuesto cargado en el panel, así que hace falta un
    // contacto: si no, queda una consulta sin forma de contestarla.
    if (!form.contacto.trim()) {
      setError('Dejanos un contacto para poder pasarte el presupuesto.')
      return
    }

    setError(null)
    setEnviando(true)

    // La pestaña se abre ANTES del await: si se abriera después el navegador la
    // trataría como popup y la bloquearía.
    const pestana = window.open('', '_blank')

    // Si la base falla igual se abre el chat: perder el registro es molesto,
    // perder la consulta es peor.
    let numero = null
    if (supabaseConfigurado) {
      try {
        numero =
          (
            await registrarPedidoAMedida({
              nombre: form.nombre.trim(),
              contacto: form.contacto.trim(),
              prenda: prendaFinal,
              descripcion: armarDescripcion(),
              talle: form.talle.trim(),
              fechaEntrega: '',
            })
          )?.numero ?? null
      } catch (err) {
        console.error('No se pudo registrar la personalización:', err?.message ?? String(err))
      }
    }

    const mensaje = mensajePersonalizacion(
      {
        prenda: prendaFinal,
        cutie: form.cutie,
        alcance: form.cutie ? '' : form.alcance,
        detalles: form.cutie ? [] : detallesFinales,
        nombre: form.nombre.trim(),
        contacto: form.contacto.trim(),
        talle: form.talle.trim(),
        comentario: form.comentario.trim(),
      },
      numero,
    )

    const url = linkWhatsApp(mensaje)
    if (pestana) pestana.location = url
    else window.location.href = url

    setEnviando(false)
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

        <button
          type="button"
          className={`boton personalizar__abrir ${abierto ? 'boton--fantasma' : ''}`}
          aria-expanded={abierto}
          aria-controls="formulario-personalizacion"
          onClick={alternar}
        >
          {abierto ? 'Cerrar' : 'Personalizar una prenda'}
        </button>

        {abierto && (
        <form className="personalizar" id="formulario-personalizacion" onSubmit={enviar}>
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

          {/* --- Carta blanca --- */}
          <label className="personalizar__cutie" data-elegido={form.cutie}>
            <input
              type="checkbox"
              checked={form.cutie}
              onChange={(e) => setForm((f) => ({ ...f, cutie: e.target.checked }))}
            />
            <span>
              <strong className="gotica">Personalización Cutie</strong>
              <span className="personalizar__cutie-texto">
                Elegí la prenda y dejanos el resto a nosotras: la intervenimos a nuestro
                criterio, con la impronta de la marca. Si la marcás, no hace falta que
                completes los pasos 2 y 3.
              </span>
            </span>
          </label>

          {/* --- 2. Hasta dónde --- */}
          {/* Con la Cutie los pasos 2 y 3 se apagan enteros: `disabled` en el
              fieldset alcanza para que no se puedan tocar ni tabular. */}
          <fieldset className="personalizar__paso" disabled={form.cutie} data-apagado={form.cutie}>
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
          <fieldset className="personalizar__paso" disabled={form.cutie} data-apagado={form.cutie}>
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
                <span className="personalizar__label">Instagram o teléfono</span>
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

          <button type="submit" className="boton boton--wsp boton--ancho" disabled={enviando}>
            <IconoWhatsApp width={18} height={18} />
            {enviando ? 'Enviando…' : 'Enviar por WhatsApp'}
          </button>
        </form>
        )}
      </div>
    </section>
  )
}
