import { useState } from 'react'
import { A_MEDIDA, PERSONALIZACION } from '../data/marca.js'
import { linkWhatsApp, mensajePedidoAMedida } from '../lib/whatsapp.js'
import { registrarPedidoAMedida } from '../lib/presupuestos.js'
import { supabaseConfigurado } from '../lib/supabase.js'
import { IconoWhatsApp } from './Iconos.jsx'

// Formulario de prendas a pedido.
//
// A diferencia del de personalización, este sí escribe en la base: deja un
// presupuesto en borrador en el panel para no tener que copiarlo a mano después.
// La plata la pone Malena en el panel; de acá solo viaja texto (ver
// supabase/pedidos-a-medida.sql).

const VACIO = {
  tipo: '',
  prenda: '',
  prendaOtra: '',
  referencia: '',
  cambios: [],
  nombre: '',
  contacto: '',
  talle: '',
  fechaEntrega: '',
  comentario: '',
}

// El día de hoy en formato yyyy-mm-dd, para que el calendario no ofrezca fechas
// pasadas (la base igual las descarta).
function hoy() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// `abierto` y `alternar` los maneja Sitio.jsx: el formulario arranca cerrado y
// abrirlo cierra el de personalización. Lo que ya se completó no se pierde al
// cerrarlo (la sección sigue montada, lo único que se esconde es el formulario).
export default function PedidoAMedida({ abierto, alternar }) {
  const [form, setForm] = useState(VACIO)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const campo = (nombre) => (e) => setForm((f) => ({ ...f, [nombre]: e.target.value }))

  const alternarCambio = (cambio) =>
    setForm((f) => ({
      ...f,
      cambios: f.cambios.includes(cambio)
        ? f.cambios.filter((c) => c !== cambio)
        : [...f.cambios, cambio],
    }))

  const tipo = A_MEDIDA.tipos.find((t) => t.id === form.tipo)
  const prendaFinal = form.prenda === 'Otra' ? form.prendaOtra.trim() : form.prenda

  // Los dos tipos que piden algo más: uno la referencia que vio, el otro qué le
  // cambiaría a la prenda nuestra.
  const pideReferencia = form.tipo === 'reversion'
  const pideCambios = form.tipo === 'cambios'

  // Lo que queda escrito en el campo «Cómo es el diseño» del panel. Arranca con
  // el tipo de pedido para que se entienda de qué se trata sin abrir el chat.
  const armarDescripcion = () => {
    const partes = [tipo.titulo + '.']
    if (pideReferencia && form.referencia.trim()) {
      partes.push(`Referencia: ${form.referencia.trim()}`)
    }
    if (pideCambios && form.cambios.length) {
      partes.push(`Le cambiaría: ${form.cambios.join(', ')}`)
    }
    if (form.comentario.trim()) partes.push(form.comentario.trim())
    return partes.join('\n')
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (enviando) return

    if (!form.tipo) {
      setError('Contanos qué tipo de pedido es.')
      return
    }
    if (!prendaFinal) {
      setError('Elegí qué prenda querés.')
      return
    }
    if (!form.nombre.trim()) {
      setError('Dejanos tu nombre así sabemos con quién hablamos.')
      return
    }
    if (!form.contacto.trim()) {
      setError('Dejanos un contacto para poder pasarte el presupuesto.')
      return
    }

    setError(null)
    setEnviando(true)

    // La pestaña se abre ANTES del await, igual que en el carrito: si se abriera
    // después el navegador la trataría como popup y la bloquearía.
    const pestana = window.open('', '_blank')

    // Si la base falla igual se abre el chat: perder el registro es molesto,
    // perder el pedido es peor.
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
              fechaEntrega: form.fechaEntrega,
            })
          )?.numero ?? null
      } catch (err) {
        console.error('No se pudo registrar el pedido a medida:', err?.message ?? String(err))
      }
    }

    const mensaje = mensajePedidoAMedida(
      {
        prenda: prendaFinal,
        tipo: tipo.titulo,
        referencia: pideReferencia ? form.referencia.trim() : '',
        cambios: pideCambios ? form.cambios : [],
        nombre: form.nombre.trim(),
        contacto: form.contacto.trim(),
        talle: form.talle.trim(),
        fechaEntrega: form.fechaEntrega,
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
    <section className="seccion" id="a-medida" aria-labelledby="titulo-a-medida">
      <div className="contenedor">
        <h2 id="titulo-a-medida" className="titulo-seccion gotica gotica--sobre-crema">
          Pedí tu prenda
        </h2>

        <p className="bajada personalizar__bajada">
          Contanos qué tenés en la cabeza. Cuando lo mandes se abre WhatsApp con todo escrito
          y nosotras te pasamos el presupuesto.
        </p>

        <button
          type="button"
          className={`boton personalizar__abrir ${abierto ? 'boton--fantasma' : ''}`}
          aria-expanded={abierto}
          aria-controls="formulario-a-medida"
          onClick={alternar}
        >
          {abierto ? 'Cerrar' : 'Completar el pedido'}
        </button>

        {abierto && (
        <form className="personalizar" id="formulario-a-medida" onSubmit={enviar}>
          {/* --- 1. Qué tipo de pedido --- */}
          <fieldset className="personalizar__paso">
            <legend className="personalizar__titulo">1 · ¿Qué tenés en mente?</legend>

            <div className="personalizar__alcances">
              {A_MEDIDA.tipos.map((t) => (
                <label
                  key={t.id}
                  className="personalizar__alcance"
                  data-elegido={form.tipo === t.id}
                >
                  <input
                    type="radio"
                    name="tipo-pedido"
                    value={t.id}
                    checked={form.tipo === t.id}
                    onChange={campo('tipo')}
                  />
                  <span>
                    <strong>{t.titulo}</strong>
                    <span className="personalizar__alcance-texto">{t.texto}</span>
                  </span>
                </label>
              ))}
            </div>

            {pideReferencia && (
              <label className="personalizar__campo">
                <span className="personalizar__label">¿Qué viste?</span>
                <textarea
                  className="personalizar__control"
                  rows={2}
                  value={form.referencia}
                  onChange={campo('referencia')}
                  placeholder="Un corset de encaje que vi en Pinterest, te paso la foto por el chat"
                />
                <span className="personalizar__ayuda">
                  Si tenés la foto, mandánosla por WhatsApp cuando se abra el chat.
                </span>
              </label>
            )}

            {pideCambios && (
              <div className="personalizar__campo">
                <span className="personalizar__label">¿Qué le cambiarías?</span>
                <div className="personalizar__opciones">
                  {A_MEDIDA.cambios.map((cambio) => (
                    <button
                      key={cambio}
                      type="button"
                      className="chip"
                      aria-pressed={form.cambios.includes(cambio)}
                      onClick={() => alternarCambio(cambio)}
                    >
                      {cambio}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </fieldset>

          {/* --- 2. Qué prenda --- */}
          <fieldset className="personalizar__paso">
            <legend className="personalizar__titulo">2 · ¿Qué prenda es?</legend>

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

          {/* --- 3. Vos --- */}
          <fieldset className="personalizar__paso">
            <legend className="personalizar__titulo">3 · Tus datos</legend>

            <div className="personalizar__grilla">
              <label className="personalizar__campo">
                <span className="personalizar__label">Tu nombre</span>
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

              <label className="personalizar__campo">
                <span className="personalizar__label">¿Para cuándo la necesitás? (opcional)</span>
                <input
                  className="personalizar__control"
                  type="date"
                  min={hoy()}
                  value={form.fechaEntrega}
                  onChange={campo('fechaEntrega')}
                />
              </label>

              <label className="personalizar__campo personalizar__campo--ancho">
                <span className="personalizar__label">Contanos la idea (opcional)</span>
                <textarea
                  className="personalizar__control"
                  rows={3}
                  value={form.comentario}
                  onChange={campo('comentario')}
                  placeholder="Es para un casamiento en diciembre, me gustaría algo largo y en tonos tierra"
                />
              </label>
            </div>

            <p className="personalizar__ayuda">
              Las medidas las tomamos después, por chat o en persona: no hace falta que las
              cargues acá.
            </p>
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
