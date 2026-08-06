import { useState } from 'react'
import {
  ESTADOS_PRESUPUESTO,
  MEDIDAS,
  TIPOS_MATERIAL,
  UNIDADES,
  calcular,
  cambiarEstadoPresupuesto,
  eliminarPresupuesto,
  guardarPresupuesto,
  subtotalMaterial,
  traerPresupuestos,
} from '../lib/presupuestos.js'
import { descargarPresupuestoPdf } from '../lib/presupuestoPdf.js'
import { fecha, precio } from '../lib/formato.js'
import { BotonEliminar, SelectEstado, Vacio, useLista } from './comunes.jsx'

const VACIO = {
  id: null,
  numero: null,
  cliente_nombre: '',
  cliente_contacto: '',
  prenda: '',
  descripcion: '',
  talle: '',
  medidas: {},
  horas_trabajo: '',
  valor_hora: '',
  margen: 0,
  descuento: 0,
  estado: 'borrador',
  validez_dias: 15,
  fecha_entrega: '',
  notas: '',
}

const MATERIAL_VACIO = { tipo: 'tela', detalle: '', cantidad: 1, unidad: 'm', precio_unitario: '' }

// Un presupuesto que viene de la base trae nulls donde el formulario espera
// strings; esto lo deja listo para editar.
function paraEditar(p) {
  return {
    ...VACIO,
    ...p,
    cliente_contacto: p.cliente_contacto ?? '',
    descripcion: p.descripcion ?? '',
    talle: p.talle ?? '',
    medidas: p.medidas ?? {},
    fecha_entrega: p.fecha_entrega ?? '',
    notas: p.notas ?? '',
  }
}

export default function Presupuestos() {
  const {
    datos: presupuestos,
    cargando,
    error,
    setError,
    correr,
  } = useLista(traerPresupuestos)

  const [form, setForm] = useState(null)
  const [materiales, setMateriales] = useState([])
  const [confirmando, setConfirmando] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [guardando, setGuardando] = useState(false)

  const visibles = filtro === 'todos' ? presupuestos : presupuestos.filter((p) => p.estado === filtro)

  // Los que entraron solos por el formulario de la web y siguen sin precio: son
  // los que hay que completar.
  const deLaWeb = presupuestos.filter((p) => p.origen === 'web' && Number(p.total) === 0).length

  const filtros = [
    { id: 'todos', label: 'Todos', cantidad: presupuestos.length },
    ...Object.entries(ESTADOS_PRESUPUESTO).map(([clave, texto]) => ({
      id: clave,
      label: texto,
      cantidad: presupuestos.filter((p) => p.estado === clave).length,
    })),
  ]

  const campo = (nombre) => (e) => setForm((f) => ({ ...f, [nombre]: e.target.value }))

  const medida = (id) => (e) =>
    setForm((f) => ({ ...f, medidas: { ...f.medidas, [id]: e.target.value } }))

  const cambiarMaterial = (i, nombre, valor) =>
    setMateriales((ms) => ms.map((m, j) => (j === i ? { ...m, [nombre]: valor } : m)))

  const abrir = (presupuesto) => {
    setError(null)
    if (presupuesto) {
      setForm(paraEditar(presupuesto))
      setMateriales(presupuesto.materiales.length ? presupuesto.materiales : [{ ...MATERIAL_VACIO }])
    } else {
      setForm(VACIO)
      setMateriales([{ ...MATERIAL_VACIO }])
    }
  }

  const cerrar = () => {
    setForm(null)
    setMateriales([])
  }

  // La cuenta se rehace en cada tecla: la idea es ver cómo se mueve el total
  // mientras se carga, no descubrirlo recién al guardar.
  const cuenta = form ? calcular(form, materiales) : null

  const validar = () => {
    if (!form.cliente_nombre.trim() || !form.prenda.trim()) {
      setError('El nombre de la clienta y qué prenda es son obligatorios.')
      return false
    }
    return true
  }

  const enviar = (e) => {
    e.preventDefault()
    if (!validar()) return
    setGuardando(true)
    correr(async () => {
      await guardarPresupuesto(form, materiales)
      cerrar()
    }).finally(() => setGuardando(false))
  }

  // Guardar y bajar el PDF de una: es lo que se hace el 90% de las veces, y así
  // el PDF sale siempre con lo último que se escribió.
  const guardarYDescargar = () => {
    if (!validar()) return
    setGuardando(true)
    correr(async () => {
      const id = await guardarPresupuesto(form, materiales)
      // Se relee para tomar el número que asignó la base, que en un presupuesto
      // nuevo todavía no existe en el formulario.
      const guardado = (await traerPresupuestos()).find((p) => p.id === id)
      await descargarPresupuestoPdf(guardado ?? form, guardado?.materiales ?? materiales)
      cerrar()
    }).finally(() => setGuardando(false))
  }

  const descargar = (presupuesto) =>
    correr(() => descargarPresupuestoPdf(presupuesto, presupuesto.materiales))

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Presupuestos</h2>
        {!form && (
          <button type="button" className="boton" onClick={() => abrir(null)}>
            Nuevo presupuesto
          </button>
        )}
      </div>

      {!form && (
        <>
          <div className="admin-filtros" role="group" aria-label="Filtrar presupuestos por estado">
            {filtros.map((f) => (
              <button
                key={f.id}
                type="button"
                className="admin-filtro"
                aria-pressed={filtro === f.id}
                onClick={() => setFiltro(f.id)}
              >
                {f.label}
                <span className="admin-filtro__cuenta">{f.cantidad}</span>
              </button>
            ))}
          </div>

          <p className="admin-ayuda">
            Cotizaciones para mandar antes de arrancar una prenda: se cargan los materiales y las
            horas, sale el precio, y se baja el PDF con el logo para pasárselo a la clienta. Si lo
            acepta, después se carga como encargo en la solapa de al lado.
          </p>

          {deLaWeb > 0 && (
            <p className="admin-ayuda admin-ayuda--alerta">
              {deLaWeb === 1
                ? 'Hay 1 pedido que entró por el formulario de la web y todavía no tiene precio.'
                : `Hay ${deLaWeb} pedidos que entraron por el formulario de la web y todavía no tienen precio.`}
            </p>
          )}
        </>
      )}

      {error && <p className="admin-error">{error}</p>}

      {form && (
        <form className="admin-form" onSubmit={enviar}>
          {/* --- Quién y qué --- */}
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

            <label className="admin-campo">
              <span className="admin-campo__label">Prenda</span>
              <input
                className="admin-campo__control"
                value={form.prenda}
                onChange={campo('prenda')}
                placeholder="Corset con breteles regulables"
                required
              />
            </label>

            <label className="admin-campo admin-campo--ancho">
              <span className="admin-campo__label">Cómo es el diseño</span>
              <textarea
                className="admin-campo__control"
                rows={3}
                value={form.descripcion}
                onChange={campo('descripcion')}
                placeholder="Tela principal negra con encaje en el escote, ballenas al frente, cierre invisible atrás"
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Talle</span>
              <input className="admin-campo__control" value={form.talle} onChange={campo('talle')} />
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
              <span className="admin-campo__label">Validez (días)</span>
              <input
                className="admin-campo__control"
                type="number"
                min="0"
                value={form.validez_dias}
                onChange={campo('validez_dias')}
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Estado</span>
              <select className="admin-campo__control" value={form.estado} onChange={campo('estado')}>
                {Object.entries(ESTADOS_PRESUPUESTO).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* --- Medidas --- */}
          <div className="admin-bloque">
            <h3 className="admin-bloque__titulo">Medidas del cuerpo (cm)</h3>
            <p className="admin-ayuda">
              Se completan solo las que hagan falta para esa prenda. En el PDF salen únicamente las
              que tengan un número cargado.
            </p>

            {MEDIDAS.map((grupo) => (
              <div key={grupo.grupo} className="admin-medidas">
                <span className="admin-medidas__grupo">{grupo.grupo}</span>
                <div className="admin-medidas__grilla">
                  {grupo.campos.map((c) => (
                    <label key={c.id} className="admin-campo">
                      <span className="admin-campo__label">{c.label}</span>
                      <input
                        className="admin-campo__control"
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.medidas[c.id] ?? ''}
                        onChange={medida(c.id)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* --- Materiales --- */}
          <div className="admin-bloque">
            <h3 className="admin-bloque__titulo">Materiales</h3>
            <p className="admin-ayuda">
              Un renglón por cada cosa que se compra: la tela, los apliques, la tintura, los avíos
              (cierres, botones, elásticos). El subtotal se calcula solo.
            </p>

            <div className="admin-tabla__scroll">
              <table className="admin-tabla admin-tabla--materiales">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Detalle</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {materiales.map((m, i) => (
                    <tr key={i}>
                      <td>
                        <select
                          className="admin-campo__control"
                          value={m.tipo}
                          aria-label={`Tipo del material ${i + 1}`}
                          onChange={(e) => cambiarMaterial(i, 'tipo', e.target.value)}
                        >
                          {Object.entries(TIPOS_MATERIAL).map(([clave, texto]) => (
                            <option key={clave} value={clave}>
                              {texto}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="admin-campo__control"
                          value={m.detalle}
                          aria-label={`Detalle del material ${i + 1}`}
                          placeholder="Gabardina negra"
                          onChange={(e) => cambiarMaterial(i, 'detalle', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="admin-campo__control"
                          type="number"
                          min="0"
                          step="0.1"
                          value={m.cantidad}
                          aria-label={`Cantidad del material ${i + 1}`}
                          onChange={(e) => cambiarMaterial(i, 'cantidad', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="admin-campo__control"
                          value={m.unidad}
                          aria-label={`Unidad del material ${i + 1}`}
                          onChange={(e) => cambiarMaterial(i, 'unidad', e.target.value)}
                        >
                          {Object.entries(UNIDADES).map(([clave, texto]) => (
                            <option key={clave} value={clave}>
                              {texto}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="admin-campo__control"
                          type="number"
                          min="0"
                          step="100"
                          value={m.precio_unitario}
                          aria-label={`Precio unitario del material ${i + 1}`}
                          onChange={(e) => cambiarMaterial(i, 'precio_unitario', e.target.value)}
                        />
                      </td>
                      <td className="admin-tabla__numero">{precio(subtotalMaterial(m))}</td>
                      <td>
                        <button
                          type="button"
                          className="admin__link admin__link--peligro"
                          onClick={() => setMateriales((ms) => ms.filter((_, j) => j !== i))}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="boton boton--fantasma"
              onClick={() => setMateriales((ms) => [...ms, { ...MATERIAL_VACIO }])}
            >
              Agregar material
            </button>
          </div>

          {/* --- Mano de obra y cuenta --- */}
          <div className="admin-bloque">
            <h3 className="admin-bloque__titulo">Mano de obra y precio</h3>

            <div className="admin-form__grilla">
              <label className="admin-campo">
                <span className="admin-campo__label">Horas de trabajo</span>
                <input
                  className="admin-campo__control"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.horas_trabajo}
                  onChange={campo('horas_trabajo')}
                />
              </label>

              <label className="admin-campo">
                <span className="admin-campo__label">Valor de la hora (ARS)</span>
                <input
                  className="admin-campo__control"
                  type="number"
                  min="0"
                  step="500"
                  value={form.valor_hora}
                  onChange={campo('valor_hora')}
                />
              </label>

              <label className="admin-campo">
                <span className="admin-campo__label">Margen (%)</span>
                <input
                  className="admin-campo__control"
                  type="number"
                  min="0"
                  step="5"
                  value={form.margen}
                  onChange={campo('margen')}
                />
              </label>

              <label className="admin-campo">
                <span className="admin-campo__label">Descuento (ARS)</span>
                <input
                  className="admin-campo__control"
                  type="number"
                  min="0"
                  step="500"
                  value={form.descuento}
                  onChange={campo('descuento')}
                />
              </label>
            </div>

            <ul className="admin-cuenta">
              <li>
                <span>Materiales</span>
                <span>{precio(cuenta.materiales)}</span>
              </li>
              <li>
                <span>Mano de obra</span>
                <span>{precio(cuenta.manoObra)}</span>
              </li>
              <li>
                <span>Costo</span>
                <span>{precio(cuenta.costo)}</span>
              </li>
              {cuenta.ganancia > 0 && (
                <li>
                  <span>Margen</span>
                  <span>{precio(cuenta.ganancia)}</span>
                </li>
              )}
              {cuenta.descuento > 0 && (
                <li>
                  <span>Descuento</span>
                  <span>− {precio(cuenta.descuento)}</span>
                </li>
              )}
              <li className="admin-cuenta__total">
                <span>Total</span>
                <span>{precio(cuenta.total)}</span>
              </li>
              <li className="admin-cuenta__sena">
                <span>Seña sugerida (50%)</span>
                <span>{precio(cuenta.sena)}</span>
              </li>
            </ul>
          </div>

          <label className="admin-campo">
            <span className="admin-campo__label">Observaciones (salen en el PDF)</span>
            <textarea
              className="admin-campo__control"
              rows={2}
              value={form.notas}
              onChange={campo('notas')}
              placeholder="Incluye una prueba de calce. El envío se cotiza aparte."
            />
          </label>

          <div className="admin-form__pie">
            <div className="admin-form__botones">
              <button type="button" className="boton boton--fantasma" onClick={cerrar}>
                Cancelar
              </button>
              <button type="button" className="boton boton--fantasma" onClick={guardarYDescargar} disabled={guardando}>
                Guardar y descargar PDF
              </button>
              <button type="submit" className="boton" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      )}

      {!form &&
        (cargando ? (
          <p>Cargando presupuestos…</p>
        ) : visibles.length === 0 ? (
          <Vacio>
            {presupuestos.length === 0
              ? 'Todavía no hay presupuestos. Armá el primero con «Nuevo presupuesto».'
              : 'No hay presupuestos en ese estado.'}
          </Vacio>
        ) : (
          <div className="admin-tabla__scroll">
            <table className="admin-tabla">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Clienta</th>
                  <th>Prenda</th>
                  <th>Entrega</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id} data-inactivo={p.estado === 'rechazado' || p.estado === 'vencido'}>
                    <td>#{p.numero}</td>
                    <td>
                      {p.cliente_nombre}
                      {p.origen === 'web' && (
                        <span className="admin-origen" title="Entró por el formulario de la web">
                          Web
                        </span>
                      )}
                      {p.cliente_contacto && <div className="admin-ayuda">{p.cliente_contacto}</div>}
                    </td>
                    <td>
                      {p.prenda}
                      {p.talle && <div className="admin-ayuda">Talle {p.talle}</div>}
                    </td>
                    <td>{p.fecha_entrega ? fecha(p.fecha_entrega) : '—'}</td>
                    <td>{precio(p.total)}</td>
                    <td>
                      <SelectEstado
                        valor={p.estado}
                        opciones={ESTADOS_PRESUPUESTO}
                        etiqueta={`Estado del presupuesto ${p.numero}`}
                        alCambiar={(estado) => correr(() => cambiarEstadoPresupuesto(p.id, estado))}
                      />
                    </td>
                    <td>
                      <div className="admin-tabla__acciones">
                        <button type="button" className="admin__link" onClick={() => abrir(p)}>
                          Editar
                        </button>
                        <button type="button" className="admin__link" onClick={() => descargar(p)}>
                          PDF
                        </button>
                        <BotonEliminar
                          activo={confirmando === p.id}
                          alPedir={() => setConfirmando(p.id)}
                          alCancelar={() => setConfirmando(null)}
                          alConfirmar={() => {
                            correr(() => eliminarPresupuesto(p.id))
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
        ))}
    </>
  )
}
