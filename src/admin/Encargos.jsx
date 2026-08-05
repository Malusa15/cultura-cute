import { useState } from 'react'
import {
  ESTADOS_ENCARGO,
  cambiarEstadoEncargo,
  eliminarEncargo,
  guardarEncargo,
  traerEncargos,
} from '../lib/ventas.js'
import { fecha, precio } from '../lib/formato.js'
import { BotonEliminar, SelectEstado, Vacio, useLista } from './comunes.jsx'

const VACIO = {
  id: null,
  cliente_nombre: '',
  cliente_contacto: '',
  descripcion: '',
  talle: '',
  precio_estimado: '',
  sena: 0,
  estado: 'pedido',
  fecha_entrega: '',
  notas: '',
}

export default function Encargos() {
  const { datos: encargos, cargando, error, setError, correr } = useLista(traerEncargos)
  const [form, setForm] = useState(null)
  const [confirmando, setConfirmando] = useState(null)

  const campo = (nombre) => (e) => setForm((f) => ({ ...f, [nombre]: e.target.value }))

  const enviar = (e) => {
    e.preventDefault()
    if (!form.cliente_nombre.trim() || !form.descripcion.trim()) {
      setError('El nombre de la clienta y la descripción son obligatorios.')
      return
    }
    correr(async () => {
      await guardarEncargo(form)
      setForm(null)
    })
  }

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Encargos</h2>
        {!form && (
          <button type="button" className="boton" onClick={() => setForm(VACIO)}>
            Nuevo encargo
          </button>
        )}
      </div>

      <p className="admin-ayuda">
        Prendas a pedido que todavía no existen en el catálogo: algo a medida, una réplica de una
        foto, un talle especial. No mueven stock porque la prenda todavía no está hecha.
      </p>

      {error && <p className="admin-error">{error}</p>}

      {form && (
        <form className="admin-form" onSubmit={enviar}>
          <div className="admin-form__grilla">
            <label className="admin-campo">
              <span className="admin-campo__label">Clienta</span>
              <input
                className="admin-campo__control"
                value={form.cliente_nombre}
                onChange={campo('cliente_nombre')}
                required
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Contacto (WhatsApp, Instagram)</span>
              <input
                className="admin-campo__control"
                value={form.cliente_contacto}
                onChange={campo('cliente_contacto')}
              />
            </label>

            <label className="admin-campo admin-campo--ancho">
              <span className="admin-campo__label">Qué encargó</span>
              <textarea
                className="admin-campo__control"
                rows={3}
                value={form.descripcion}
                onChange={campo('descripcion')}
                placeholder="Corset azul como el de la foto, con breteles regulables"
                required
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Talle</span>
              <input
                className="admin-campo__control"
                value={form.talle}
                onChange={campo('talle')}
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Precio estimado (ARS)</span>
              <input
                className="admin-campo__control"
                type="number"
                min="0"
                step="500"
                value={form.precio_estimado}
                onChange={campo('precio_estimado')}
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Seña recibida (ARS)</span>
              <input
                className="admin-campo__control"
                type="number"
                min="0"
                step="500"
                value={form.sena}
                onChange={campo('sena')}
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Entrega estimada</span>
              <input
                className="admin-campo__control"
                type="date"
                value={form.fecha_entrega}
                onChange={campo('fecha_entrega')}
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Estado</span>
              <select
                className="admin-campo__control"
                value={form.estado}
                onChange={campo('estado')}
              >
                {Object.entries(ESTADOS_ENCARGO).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </select>
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
              <button
                type="button"
                className="boton boton--fantasma"
                onClick={() => setForm(null)}
              >
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
        <p>Cargando encargos…</p>
      ) : encargos.length === 0 ? (
        <Vacio>Todavía no hay encargos. Cargá el primero con «Nuevo encargo».</Vacio>
      ) : (
        <div className="admin-tabla__scroll">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>N°</th>
                <th>Clienta</th>
                <th>Encargo</th>
                <th>Entrega</th>
                <th>Precio</th>
                <th>Seña</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {encargos.map((encargo) => (
                <tr key={encargo.id} data-inactivo={encargo.estado === 'cancelado'}>
                  <td>#{encargo.numero}</td>
                  <td>
                    {encargo.cliente_nombre}
                    {encargo.cliente_contacto && (
                      <div className="admin-ayuda">{encargo.cliente_contacto}</div>
                    )}
                  </td>
                  <td>
                    {encargo.descripcion}
                    {encargo.talle && <div className="admin-ayuda">Talle {encargo.talle}</div>}
                  </td>
                  <td>{encargo.fecha_entrega ? fecha(encargo.fecha_entrega) : '—'}</td>
                  <td>{encargo.precio_estimado != null ? precio(encargo.precio_estimado) : '—'}</td>
                  <td>{encargo.sena > 0 ? precio(encargo.sena) : '—'}</td>
                  <td>
                    <SelectEstado
                      valor={encargo.estado}
                      opciones={ESTADOS_ENCARGO}
                      etiqueta={`Estado del encargo ${encargo.numero}`}
                      alCambiar={(estado) => correr(() => cambiarEstadoEncargo(encargo.id, estado))}
                    />
                  </td>
                  <td>
                    <div className="admin-tabla__acciones">
                      <button
                        type="button"
                        className="admin__link"
                        onClick={() =>
                          setForm({
                            ...encargo,
                            cliente_contacto: encargo.cliente_contacto ?? '',
                            talle: encargo.talle ?? '',
                            precio_estimado: encargo.precio_estimado ?? '',
                            fecha_entrega: encargo.fecha_entrega ?? '',
                            notas: encargo.notas ?? '',
                          })
                        }
                      >
                        Editar
                      </button>
                      <BotonEliminar
                        activo={confirmando === encargo.id}
                        alPedir={() => setConfirmando(encargo.id)}
                        alCancelar={() => setConfirmando(null)}
                        alConfirmar={() => {
                          correr(() => eliminarEncargo(encargo.id))
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
