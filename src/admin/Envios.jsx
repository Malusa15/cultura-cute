import { useEffect, useState } from 'react'
import {
  ESTADOS_ENVIO,
  METODOS_ENVIO,
  cambiarEstadoEnvio,
  eliminarEnvio,
  guardarEnvio,
  traerEnvios,
  traerVentasSinEnvio,
} from '../lib/ventas.js'
import { fecha, precio } from '../lib/formato.js'
import { BotonEliminar, SelectEstado, Vacio, useLista } from './comunes.jsx'

const VACIO = {
  id: null,
  venta_id: '',
  metodo: 'correo',
  destinatario: '',
  direccion: '',
  localidad: '',
  codigo_postal: '',
  costo: 0,
  seguimiento: '',
  notas: '',
}

export default function Envios() {
  const { datos: envios, cargando, error, setError, correr } = useLista(traerEnvios)
  const [disponibles, setDisponibles] = useState([])
  const [form, setForm] = useState(null)
  const [confirmando, setConfirmando] = useState(null)

  // Las ventas que todavía no tienen envío. Se recalcula con cada cambio, así
  // una venta no queda ofrecida después de armarle el envío.
  useEffect(() => {
    traerVentasSinEnvio().then(setDisponibles).catch((e) => setError(e.message))
  }, [envios, setError])

  const campo = (nombre) => (e) => setForm((f) => ({ ...f, [nombre]: e.target.value }))

  const enviar = (e) => {
    e.preventDefault()
    if (!form.venta_id) {
      setError('Elegí a qué venta corresponde el envío.')
      return
    }
    if (form.metodo !== 'retiro' && !form.direccion.trim()) {
      setError('Para correo o moto hace falta la dirección.')
      return
    }
    correr(async () => {
      await guardarEnvio(form)
      setForm(null)
    })
  }

  const pendientes = envios.filter((e) => e.estado === 'pendiente').length

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Envíos</h2>
        {!form && (
          <button
            type="button"
            className="boton"
            onClick={() => setForm(VACIO)}
            disabled={disponibles.length === 0}
          >
            Armar envío
          </button>
        )}
      </div>

      <p className="admin-ayuda">
        Cada envío se engancha a una venta confirmada. Si no aparece la venta que buscás en la lista,
        fijate que esté <strong>confirmada</strong> en la solapa Ventas — las pendientes no se
        despachan.
        {pendientes > 0 && ` Tenés ${pendientes} por despachar.`}
      </p>

      {error && <p className="admin-error">{error}</p>}

      {form && (
        <form className="admin-form" onSubmit={enviar}>
          <div className="admin-form__grilla">
            <label className="admin-campo">
              <span className="admin-campo__label">Venta</span>
              <select
                className="admin-campo__control"
                value={form.venta_id}
                onChange={campo('venta_id')}
                disabled={Boolean(form.id)}
                required
              >
                <option value="">Elegir venta</option>
                {/* Al editar, la venta propia ya no figura entre las disponibles
                    (justamente porque este envío la ocupa), así que se agrega. */}
                {form.id && form.venta && (
                  <option value={form.venta_id}>
                    #{form.venta.numero} — {form.venta.cliente_nombre ?? 'sin nombre'}
                  </option>
                )}
                {disponibles.map((v) => (
                  <option key={v.id} value={v.id}>
                    #{v.numero} — {v.cliente_nombre ?? 'sin nombre'} — {precio(v.total)}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Cómo sale</span>
              <select className="admin-campo__control" value={form.metodo} onChange={campo('metodo')}>
                {Object.entries(METODOS_ENVIO).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Destinataria</span>
              <input
                className="admin-campo__control"
                value={form.destinatario}
                onChange={campo('destinatario')}
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Costo del envío (ARS)</span>
              <input
                className="admin-campo__control"
                type="number"
                min="0"
                step="100"
                value={form.costo}
                onChange={campo('costo')}
              />
            </label>

            {form.metodo !== 'retiro' && (
              <>
                <label className="admin-campo admin-campo--ancho">
                  <span className="admin-campo__label">Dirección</span>
                  <input
                    className="admin-campo__control"
                    value={form.direccion}
                    onChange={campo('direccion')}
                    placeholder="Calle 1234, piso 2 depto B"
                  />
                </label>

                <label className="admin-campo">
                  <span className="admin-campo__label">Localidad</span>
                  <input
                    className="admin-campo__control"
                    value={form.localidad}
                    onChange={campo('localidad')}
                  />
                </label>

                <label className="admin-campo">
                  <span className="admin-campo__label">Código postal</span>
                  <input
                    className="admin-campo__control"
                    value={form.codigo_postal}
                    onChange={campo('codigo_postal')}
                  />
                </label>

                <label className="admin-campo">
                  <span className="admin-campo__label">Seguimiento</span>
                  <input
                    className="admin-campo__control"
                    value={form.seguimiento}
                    onChange={campo('seguimiento')}
                    placeholder="Código del correo"
                  />
                </label>
              </>
            )}

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
                Guardar
              </button>
            </div>
          </div>
        </form>
      )}

      {cargando ? (
        <p>Cargando envíos…</p>
      ) : envios.length === 0 ? (
        <Vacio>
          Todavía no hay envíos armados.
          {disponibles.length === 0 && ' Primero confirmá una venta en la solapa Ventas.'}
        </Vacio>
      ) : (
        <div className="admin-tabla__scroll">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Destino</th>
                <th>Cómo</th>
                <th>Costo</th>
                <th>Seguimiento</th>
                <th>Despachado</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {envios.map((envio) => (
                <tr key={envio.id}>
                  <td>
                    #{envio.venta?.numero ?? '—'}
                    <div className="admin-ayuda">{envio.venta?.cliente_nombre ?? 'sin nombre'}</div>
                  </td>
                  <td>
                    {envio.metodo === 'retiro' ? (
                      <span className="admin-ayuda">Retira en persona</span>
                    ) : (
                      <>
                        {envio.destinatario && <div>{envio.destinatario}</div>}
                        <div className="admin-ayuda">
                          {[envio.direccion, envio.localidad, envio.codigo_postal]
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </div>
                      </>
                    )}
                  </td>
                  <td>{METODOS_ENVIO[envio.metodo]}</td>
                  <td>{envio.costo > 0 ? precio(envio.costo) : '—'}</td>
                  <td>{envio.seguimiento || '—'}</td>
                  <td>{fecha(envio.despachado_en)}</td>
                  <td>
                    <SelectEstado
                      valor={envio.estado}
                      opciones={ESTADOS_ENVIO}
                      etiqueta={`Estado del envío de la venta ${envio.venta?.numero ?? ''}`}
                      alCambiar={(estado) => correr(() => cambiarEstadoEnvio(envio.id, estado))}
                    />
                  </td>
                  <td>
                    <div className="admin-tabla__acciones">
                      <button
                        type="button"
                        className="admin__link"
                        onClick={() =>
                          setForm({
                            ...envio,
                            destinatario: envio.destinatario ?? '',
                            direccion: envio.direccion ?? '',
                            localidad: envio.localidad ?? '',
                            codigo_postal: envio.codigo_postal ?? '',
                            seguimiento: envio.seguimiento ?? '',
                            notas: envio.notas ?? '',
                          })
                        }
                      >
                        Editar
                      </button>
                      <BotonEliminar
                        activo={confirmando === envio.id}
                        alPedir={() => setConfirmando(envio.id)}
                        alCancelar={() => setConfirmando(null)}
                        alConfirmar={() => {
                          correr(() => eliminarEnvio(envio.id))
                          setConfirmando(null)
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
