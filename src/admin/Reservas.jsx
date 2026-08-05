import { useEffect, useState } from 'react'
import {
  ESTADOS_RESERVA,
  cambiarEstadoReserva,
  crearReserva,
  eliminarReserva,
  traerReservas,
} from '../lib/ventas.js'
import { traerTodosLosProductos } from '../lib/catalogo.js'
import { avisarCatalogoActualizado } from '../context/CatalogoContext.jsx'
import { fecha } from '../lib/formato.js'
import { BotonEliminar, SelectEstado, Vacio, useLista } from './comunes.jsx'

const VACIO = {
  producto_id: '',
  talle: '',
  cantidad: 1,
  cliente_nombre: '',
  cliente_contacto: '',
  vence_en: '',
  notas: '',
}

export default function Reservas() {
  const { datos: reservas, cargando, error, setError, correr } = useLista(traerReservas)
  const [productos, setProductos] = useState([])
  const [form, setForm] = useState(null)
  const [confirmando, setConfirmando] = useState(null)

  // El catálogo se recarga junto con las reservas porque apartar cambia el stock
  // que muestra el formulario.
  useEffect(() => {
    traerTodosLosProductos().then(setProductos).catch((e) => setError(e.message))
  }, [reservas, setError])

  const elegido = productos.find((p) => p.id === form?.producto_id)
  const talleElegido = elegido?.talles.find((t) => t.talle === form?.talle)
  const campo = (nombre) => (e) => setForm((f) => ({ ...f, [nombre]: e.target.value }))

  const enviar = (e) => {
    e.preventDefault()
    if (!form.producto_id || !form.talle) {
      setError('Elegí la prenda y el talle a reservar.')
      return
    }
    if (!form.cliente_nombre.trim()) {
      setError('Poné para quién es la reserva.')
      return
    }
    if (talleElegido && Number(form.cantidad) > talleElegido.stock) {
      setError(`Solo quedan ${talleElegido.stock} en talle ${form.talle}.`)
      return
    }
    correr(async () => {
      await crearReserva(form)
      avisarCatalogoActualizado()
      setForm(null)
    })
  }

  const cambiarEstado = (id, estado) =>
    correr(async () => {
      await cambiarEstadoReserva(id, estado)
      avisarCatalogoActualizado()
    })

  const activas = reservas.filter((r) => r.estado === 'activa').length

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Reservas</h2>
        {!form && (
          <button type="button" className="boton" onClick={() => setForm(VACIO)}>
            Apartar prenda
          </button>
        )}
      </div>

      <p className="admin-ayuda">
        Apartar una prenda le <strong>descuenta el stock enseguida</strong>, para que no se venda dos
        veces. Si cancelás la reserva o la das por vencida, el stock vuelve. «Concretada» quiere decir
        que terminó en venta, así que ahí el stock no se repone.
        {activas > 0 && ` Tenés ${activas} activa${activas > 1 ? 's' : ''}.`}
      </p>

      {error && <p className="admin-error">{error}</p>}

      {form && (
        <form className="admin-form" onSubmit={enviar}>
          <div className="admin-form__grilla">
            <label className="admin-campo">
              <span className="admin-campo__label">Prenda</span>
              <select
                className="admin-campo__control"
                value={form.producto_id}
                onChange={(e) => setForm((f) => ({ ...f, producto_id: e.target.value, talle: '' }))}
                required
              >
                <option value="">Elegir prenda</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Talle</span>
              <select
                className="admin-campo__control"
                value={form.talle}
                onChange={campo('talle')}
                disabled={!elegido}
                required
              >
                <option value="">Elegir talle</option>
                {(elegido?.talles ?? []).map((t) => (
                  <option key={t.talle} value={t.talle} disabled={t.stock === 0}>
                    {t.talle} — {t.stock} disponible{t.stock === 1 ? '' : 's'}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Cantidad</span>
              <input
                className="admin-campo__control"
                type="number"
                min="1"
                max={talleElegido?.stock ?? 1}
                value={form.cantidad}
                onChange={campo('cantidad')}
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Para quién</span>
              <input
                className="admin-campo__control"
                value={form.cliente_nombre}
                onChange={campo('cliente_nombre')}
                required
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Contacto</span>
              <input
                className="admin-campo__control"
                value={form.cliente_contacto}
                onChange={campo('cliente_contacto')}
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Vence el</span>
              <input
                className="admin-campo__control"
                type="date"
                value={form.vence_en}
                onChange={campo('vence_en')}
              />
            </label>

            <label className="admin-campo admin-campo--ancho">
              <span className="admin-campo__label">Notas</span>
              <textarea
                className="admin-campo__control"
                rows={2}
                value={form.notas}
                onChange={campo('notas')}
              />
            </label>
          </div>

          <div className="admin-form__pie">
            <div className="admin-form__botones">
              <button type="button" className="boton boton--fantasma" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button type="submit" className="boton">
                Apartar
              </button>
            </div>
          </div>
        </form>
      )}

      {cargando ? (
        <p>Cargando reservas…</p>
      ) : reservas.length === 0 ? (
        <Vacio>No hay prendas apartadas. Usá «Apartar prenda» para reservar una.</Vacio>
      ) : (
        <div className="admin-tabla__scroll">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>N°</th>
                <th>Prenda</th>
                <th>Talle</th>
                <th>Cant.</th>
                <th>Para</th>
                <th>Vence</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((reserva) => {
                const vencida =
                  reserva.estado === 'activa' &&
                  reserva.vence_en &&
                  new Date(reserva.vence_en) < new Date(new Date().toDateString())

                return (
                  <tr
                    key={reserva.id}
                    data-inactivo={['cancelada', 'vencida'].includes(reserva.estado)}
                  >
                    <td>#{reserva.numero}</td>
                    <td>{reserva.producto_nombre}</td>
                    <td>{reserva.talle}</td>
                    <td>{reserva.cantidad}</td>
                    <td>
                      {reserva.cliente_nombre}
                      {reserva.cliente_contacto && (
                        <div className="admin-ayuda">{reserva.cliente_contacto}</div>
                      )}
                    </td>
                    <td>
                      {reserva.vence_en ? fecha(reserva.vence_en) : '—'}
                      {vencida && <div className="admin-ayuda admin-ayuda--alerta">Ya venció</div>}
                    </td>
                    <td>
                      <SelectEstado
                        valor={reserva.estado}
                        opciones={ESTADOS_RESERVA}
                        etiqueta={`Estado de la reserva ${reserva.numero}`}
                        alCambiar={(estado) => cambiarEstado(reserva.id, estado)}
                      />
                    </td>
                    <td>
                      <div className="admin-tabla__acciones">
                        <BotonEliminar
                          activo={confirmando === reserva.id}
                          alPedir={() => setConfirmando(reserva.id)}
                          alCancelar={() => setConfirmando(null)}
                          alConfirmar={() => {
                            correr(async () => {
                              await eliminarReserva(reserva.id)
                              avisarCatalogoActualizado()
                            })
                            setConfirmando(null)
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
