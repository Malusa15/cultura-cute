import { useState } from 'react'
import {
  ETIQUETAS_TIPO,
  METODOS_PAGO,
  RUBROS,
  TIPOS_A_MANO,
  TIPOS_CAJA,
  TIPOS_MOVIMIENTO,
  direccionDe,
  eliminarCaja,
  eliminarMovimiento,
  guardarCaja,
  guardarMovimiento,
  hoy,
  mesActual,
  mesDe,
  mesesDe,
  nombreDeMes,
  registrarTraspaso,
  resumen,
  saldoDeCaja,
  saldoTotal,
  traerEconomia,
} from '../lib/economia.js'
import { fecha, precio } from '../lib/formato.js'
import { BotonEliminar, Vacio, useLista } from './comunes.jsx'

// Lo que se muestra mientras carga. Sin esto habría que preguntar por cada lista
// antes de usarla, en una pantalla que las cruza todo el tiempo.
const SIN_DATOS = { cajas: [], movimientos: [], ventas: [] }

// Los formularios vacíos son funciones y no constantes porque llevan la fecha de
// hoy: si fueran constantes, el panel abierto desde ayer propondría ayer.
const movimientoVacio = (caja_id) => ({
  id: null,
  caja_id,
  fecha: hoy(),
  tipo: 'gasto',
  direccion: 'sale',
  monto: '',
  concepto: '',
  rubro: '',
  metodo: 'efectivo',
  persona: '',
  comprobante: '',
  venta_id: '',
  notas: '',
})

const traspasoVacio = (origen_id, destino_id) => ({
  fecha: hoy(),
  origen_id,
  destino_id,
  monto: '',
  metodo: 'efectivo',
  notas: '',
})

const CAJA_VACIA = {
  id: null,
  nombre: '',
  tipo: 'chica',
  saldo_inicial: 0,
  activa: true,
  orden: 0,
  notas: '',
}

// La botonera no lista los nueve tipos: agrupa por lo que se pregunta de verdad
// («¿cuánto entró?», «¿qué sueldos pagué?»). Los tipos finos siguen en la tabla.
const FILTROS = [
  { id: 'todos', label: 'Todos', pasa: () => true },
  { id: 'entradas', label: 'Entradas', pasa: (m) => m.direccion === 'entra' && m.tipo !== 'traspaso' },
  { id: 'salidas', label: 'Salidas', pasa: (m) => m.direccion === 'sale' && m.tipo !== 'traspaso' },
  { id: 'gasto', label: 'Gastos', pasa: (m) => m.tipo === 'gasto' },
  { id: 'sueldo', label: 'Sueldos', pasa: (m) => m.tipo === 'sueldo' },
  { id: 'pago', label: 'Pagos', pasa: (m) => m.tipo === 'pago' },
  { id: 'traspaso', label: 'Traspasos', pasa: (m) => m.tipo === 'traspaso' },
]

// precio() pone el símbolo adelante, así que un saldo negativo quedaría
// "$-6.700". Acá los saldos y el resultado del mes pueden dar en rojo, y el
// menos se lee mucho mejor antes del peso.
function conSigno(valor) {
  return `${valor < 0 ? '− ' : ''}${precio(Math.abs(valor))}`
}

// El signo lo pone la dirección: los montos se guardan siempre positivos.
function Monto({ movimiento }) {
  return (
    <span className="admin-monto" data-direccion={movimiento.direccion}>
      {movimiento.direccion === 'entra' ? '+' : '−'} {precio(movimiento.monto)}
    </span>
  )
}

// Un movimiento de la base trae nulls donde el formulario espera strings.
function paraEditar(m) {
  return {
    ...movimientoVacio(m.caja_id),
    ...m,
    rubro: m.rubro ?? '',
    persona: m.persona ?? '',
    comprobante: m.comprobante ?? '',
    venta_id: m.venta_id ?? '',
    notas: m.notas ?? '',
  }
}

export default function Economia() {
  const { datos, cargando, error, setError, correr } = useLista(traerEconomia, SIN_DATOS)
  const { cajas, movimientos, ventas } = datos

  // Una sola puerta a la vez: null es la lista, y cada valor es un formulario.
  const [vista, setVista] = useState(null)
  const [form, setForm] = useState(null)
  const [traspaso, setTraspaso] = useState(null)
  const [formCaja, setFormCaja] = useState(null)
  const [confirmando, setConfirmando] = useState(null)

  const [mes, setMes] = useState(mesActual())
  const [caja, setCaja] = useState('todas')
  const [filtro, setFiltro] = useState('todos')

  const activas = cajas.filter((c) => c.activa)
  const meses = mesesDe(movimientos)

  // Los saldos salen de la lista completa; el resto de la pantalla mira el
  // período elegido.
  const total = saldoTotal(cajas, movimientos)

  const delMes = mes === 'todos' ? movimientos : movimientos.filter((m) => mesDe(m.fecha) === mes)
  const periodo = caja === 'todas' ? delMes : delMes.filter((m) => m.caja_id === caja)
  const cuenta = resumen(periodo)

  const elegido = FILTROS.find((f) => f.id === filtro) ?? FILTROS[0]
  const visibles = periodo.filter(elegido.pasa)

  // La caja que se propone por defecto: la chica, que es donde cae casi todo.
  const cajaPorDefecto = () => activas.find((c) => c.tipo === 'chica')?.id ?? activas[0]?.id ?? ''

  const cerrar = () => {
    setVista(null)
    setForm(null)
    setTraspaso(null)
    setFormCaja(null)
    setError(null)
  }

  const abrirMovimiento = (movimiento) => {
    setError(null)
    setForm(movimiento ? paraEditar(movimiento) : movimientoVacio(cajaPorDefecto()))
    setVista('movimiento')
  }

  const abrirTraspaso = () => {
    setError(null)
    const chica = activas.find((c) => c.tipo === 'chica')
    const grande = activas.find((c) => c.tipo === 'grande')
    setTraspaso(traspasoVacio(chica?.id ?? '', grande?.id ?? ''))
    setVista('traspaso')
  }

  const campo = (nombre) => (e) => setForm((f) => ({ ...f, [nombre]: e.target.value }))
  const campoTraspaso = (nombre) => (e) => setTraspaso((t) => ({ ...t, [nombre]: e.target.value }))
  const campoCaja = (nombre) => (e) => setFormCaja((c) => ({ ...c, [nombre]: e.target.value }))

  // Cambiar el tipo reacomoda la dirección: un gasto sale y un aporte entra, no
  // tiene sentido preguntarlo. Solo el ajuste deja elegir.
  const cambiarTipo = (e) => {
    const tipo = e.target.value
    setForm((f) => ({ ...f, tipo, direccion: direccionDe(tipo, f.direccion) }))
  }

  // Al elegir la venta se completa lo que todavía esté vacío. Solo lo vacío: si
  // ya se escribió un monto (una seña, un cobro parcial), no se pisa.
  const elegirVenta = (e) => {
    const venta_id = e.target.value
    const venta = ventas.find((v) => v.id === venta_id)
    setForm((f) => ({
      ...f,
      venta_id,
      concepto: venta && !f.concepto.trim() ? `Cobro de la venta #${venta.numero}` : f.concepto,
      monto: venta && String(f.monto).trim() === '' ? venta.total : f.monto,
      persona: venta && !f.persona.trim() ? venta.cliente_nombre ?? '' : f.persona,
    }))
  }

  const enviarMovimiento = (e) => {
    e.preventDefault()
    if (!form.caja_id) {
      setError('Hay que elegir en qué caja entra o de cuál sale.')
      return
    }
    if (!form.concepto.trim()) {
      setError('Falta el concepto: qué fue ese movimiento.')
      return
    }
    if (Number(form.monto) <= 0 || String(form.monto).trim() === '') {
      setError('El monto tiene que ser mayor a cero.')
      return
    }
    correr(async () => {
      await guardarMovimiento(form)
      cerrar()
    })
  }

  const enviarTraspaso = (e) => {
    e.preventDefault()
    correr(async () => {
      await registrarTraspaso({
        origen: cajas.find((c) => c.id === traspaso.origen_id),
        destino: cajas.find((c) => c.id === traspaso.destino_id),
        fecha: traspaso.fecha,
        monto: traspaso.monto,
        metodo: traspaso.metodo,
        notas: traspaso.notas,
      })
      cerrar()
    })
  }

  const enviarCaja = (e) => {
    e.preventDefault()
    if (!formCaja.nombre.trim()) {
      setError('La caja necesita un nombre.')
      return
    }
    correr(async () => {
      await guardarCaja(formCaja)
      setFormCaja(null)
    })
  }

  const saldoDe = (id) => {
    const c = cajas.find((x) => x.id === id)
    return c ? saldoDeCaja(c, movimientos) : 0
  }

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Economía</h2>

        {vista === null && (
          <div className="admin-form__botones">
            <button type="button" className="boton" onClick={() => abrirMovimiento(null)}>
              Nuevo movimiento
            </button>
            <button type="button" className="boton boton--fantasma" onClick={abrirTraspaso}>
              Traspaso entre cajas
            </button>
            <button
              type="button"
              className="boton boton--fantasma"
              onClick={() => {
                setError(null)
                setVista('cajas')
              }}
            >
              Cajas
            </button>
          </div>
        )}
      </div>

      {error && <p className="admin-error">{error}</p>}

      {/* ------------------------------------------------------------------ */}
      {/* Lista: saldos, resumen del período y la tabla de movimientos.      */}
      {/* ------------------------------------------------------------------ */}

      {vista === null && (
        <>
          <div className="admin-saldos">
            {cajas.map((c) => {
              const suyo = saldoDeCaja(c, movimientos)
              return (
                <div key={c.id} className="admin-saldo" data-tipo={c.tipo} data-inactiva={!c.activa}>
                  <span className="admin-saldo__nombre">{c.nombre}</span>
                  <span className="admin-saldo__monto" data-negativo={suyo < 0}>
                    {conSigno(suyo)}
                  </span>
                  <span className="admin-saldo__pie">
                    {TIPOS_CAJA[c.tipo]}
                    {!c.activa && ' · guardada'}
                  </span>
                </div>
              )
            })}

            {cajas.length > 1 && (
              <div className="admin-saldo admin-saldo--total">
                <span className="admin-saldo__nombre">Todo junto</span>
                <span className="admin-saldo__monto" data-negativo={total < 0}>
                  {conSigno(total)}
                </span>
                <span className="admin-saldo__pie">Suma de las cajas</span>
              </div>
            )}
          </div>

          <p className="admin-ayuda">
            Cada vez que entra o sale plata se carga un movimiento en una caja. La{' '}
            <strong>caja chica</strong> es el efectivo del día a día y la <strong>caja grande</strong>{' '}
            el fondo de la marca. Los <strong>sueldos</strong> se cargan como un movimiento de tipo
            Sueldo con el nombre de la persona; los <strong>gastos</strong> y los{' '}
            <strong>pagos</strong>, con su rubro, para después saber en qué se fue.
          </p>

          <div className="admin-controles">
            <label className="admin-campo">
              <span className="admin-campo__label">Mes</span>
              <select
                className="admin-campo__control"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              >
                <option value="todos">Todo</option>
                {meses.map((m) => (
                  <option key={m} value={m}>
                    {nombreDeMes(m)}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Caja</span>
              <select
                className="admin-campo__control"
                value={caja}
                onChange={(e) => setCaja(e.target.value)}
              >
                <option value="todas">Todas</option>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-resumen">
            <div className="admin-resumen__dato" data-signo="entra">
              <span className="admin-resumen__label">Entró</span>
              <span className="admin-resumen__valor">{precio(cuenta.entradas)}</span>
            </div>
            <div className="admin-resumen__dato" data-signo="sale">
              <span className="admin-resumen__label">Salió</span>
              <span className="admin-resumen__valor">{precio(cuenta.salidas)}</span>
            </div>
            <div
              className="admin-resumen__dato admin-resumen__dato--resultado"
              data-signo={cuenta.resultado < 0 ? 'sale' : 'entra'}
            >
              <span className="admin-resumen__label">Quedó</span>
              <span className="admin-resumen__valor">{conSigno(cuenta.resultado)}</span>
            </div>
          </div>

          <p className="admin-ayuda">
            {mes === 'todos' ? 'Desde que se empezó a anotar' : nombreDeMes(mes)}
            {caja !== 'todas' && `, solo ${cajas.find((c) => c.id === caja)?.nombre}`}. Los traspasos
            entre cajas no cuentan acá: esa plata no entró ni salió, cambió de bolsillo.
          </p>

          {cuenta.porRubro.length > 0 && (
            <div className="admin-bloque">
              <h3 className="admin-bloque__titulo">En qué se fue</h3>
              <ul className="admin-cuenta">
                {cuenta.porRubro.map(([rubro, monto]) => (
                  <li key={rubro}>
                    <span>{RUBROS[rubro] ?? rubro}</span>
                    <span>{precio(monto)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="admin-filtros" role="group" aria-label="Filtrar movimientos">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="admin-filtro"
                aria-pressed={filtro === f.id}
                onClick={() => setFiltro(f.id)}
              >
                {f.label}
                <span className="admin-filtro__cuenta">{periodo.filter(f.pasa).length}</span>
              </button>
            ))}
          </div>

          {cargando ? (
            <p>Cargando la economía…</p>
          ) : visibles.length === 0 ? (
            <Vacio>
              {movimientos.length === 0
                ? 'Todavía no hay movimientos cargados. Empezá con «Nuevo movimiento».'
                : 'No hay movimientos con esos filtros.'}
            </Vacio>
          ) : (
            <div className="admin-tabla__scroll">
              <table className="admin-tabla">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Fecha</th>
                    <th>Concepto</th>
                    <th>Tipo</th>
                    <th>Rubro</th>
                    <th>Caja</th>
                    <th>Cómo</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((m) => (
                    <tr key={m.id} data-inactivo={m.tipo === 'traspaso'}>
                      <td>#{m.numero}</td>
                      <td>{fecha(m.fecha)}</td>
                      <td>
                        {m.concepto}
                        {m.persona && <div className="admin-ayuda">{m.persona}</div>}
                        {m.venta && <div className="admin-ayuda">Venta #{m.venta.numero}</div>}
                        {m.comprobante && (
                          <div className="admin-ayuda">Comprobante {m.comprobante}</div>
                        )}
                      </td>
                      <td>{ETIQUETAS_TIPO[m.tipo] ?? m.tipo}</td>
                      <td>{m.rubro ? RUBROS[m.rubro] ?? m.rubro : '—'}</td>
                      <td>{m.caja?.nombre ?? '—'}</td>
                      <td>{METODOS_PAGO[m.metodo] ?? m.metodo}</td>
                      <td>
                        <Monto movimiento={m} />
                      </td>
                      <td>
                        <div className="admin-tabla__acciones">
                          {/* Un traspaso son dos renglones atados: editar uno
                              solo descuadraría las dos cajas. Se borra y se
                              vuelve a hacer. */}
                          {m.tipo !== 'traspaso' && (
                            <button
                              type="button"
                              className="admin__link"
                              onClick={() => abrirMovimiento(m)}
                            >
                              Editar
                            </button>
                          )}
                          <BotonEliminar
                            activo={confirmando === m.id}
                            alPedir={() => setConfirmando(m.id)}
                            alCancelar={() => setConfirmando(null)}
                            alConfirmar={() => {
                              correr(() => eliminarMovimiento(m))
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
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Formulario de movimiento                                           */}
      {/* ------------------------------------------------------------------ */}

      {vista === 'movimiento' && form && (
        <form className="admin-form" onSubmit={enviarMovimiento}>
          <div className="admin-form__grilla">
            <label className="admin-campo">
              <span className="admin-campo__label">Fecha</span>
              <input
                className="admin-campo__control"
                type="date"
                value={form.fecha}
                onChange={campo('fecha')}
                required
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Qué es</span>
              <select className="admin-campo__control" value={form.tipo} onChange={cambiarTipo}>
                {Object.entries(TIPOS_A_MANO).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </select>
            </label>

            {/* Solo el ajuste puede ir para cualquiera de los dos lados: la caja
                puede tener de más o de menos cuando se la cuenta. */}
            {TIPOS_MOVIMIENTO[form.tipo]?.direccion === null && (
              <label className="admin-campo">
                <span className="admin-campo__label">Para qué lado</span>
                <select
                  className="admin-campo__control"
                  value={form.direccion}
                  onChange={campo('direccion')}
                >
                  <option value="entra">Había de más (entra)</option>
                  <option value="sale">Faltaba plata (sale)</option>
                </select>
              </label>
            )}

            <label className="admin-campo">
              <span className="admin-campo__label">Caja</span>
              <select
                className="admin-campo__control"
                value={form.caja_id}
                onChange={campo('caja_id')}
                required
              >
                <option value="">Elegir…</option>
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · {conSigno(saldoDeCaja(c, movimientos))}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Monto (ARS)</span>
              <input
                className="admin-campo__control"
                type="number"
                min="0"
                step="100"
                value={form.monto}
                onChange={campo('monto')}
                required
              />
            </label>

            {form.tipo === 'venta' && (
              <label className="admin-campo">
                <span className="admin-campo__label">Venta que se cobra</span>
                <select
                  className="admin-campo__control"
                  value={form.venta_id}
                  onChange={elegirVenta}
                >
                  <option value="">Sin atar a una venta</option>
                  {ventas.map((v) => (
                    <option key={v.id} value={v.id}>
                      #{v.numero} · {v.cliente_nombre ?? 'Sin nombre'} · {precio(v.total)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="admin-campo admin-campo--ancho">
              <span className="admin-campo__label">Concepto</span>
              <input
                className="admin-campo__control"
                value={form.concepto}
                onChange={campo('concepto')}
                placeholder="Gabardina negra para el corset de Sofía"
                required
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Rubro</span>
              <select className="admin-campo__control" value={form.rubro} onChange={campo('rubro')}>
                <option value="">Sin rubro</option>
                {Object.entries(RUBROS).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Cómo se pagó</span>
              <select
                className="admin-campo__control"
                value={form.metodo}
                onChange={campo('metodo')}
              >
                {Object.entries(METODOS_PAGO).map(([clave, texto]) => (
                  <option key={clave} value={clave}>
                    {texto}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">
                {direccionDe(form.tipo, form.direccion) === 'entra' ? 'De quién' : 'A quién'}
              </span>
              <input
                className="admin-campo__control"
                value={form.persona}
                onChange={campo('persona')}
                placeholder={form.tipo === 'sueldo' ? 'Nombre de la persona' : 'Proveedor, clienta…'}
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Comprobante</span>
              <input
                className="admin-campo__control"
                value={form.comprobante}
                onChange={campo('comprobante')}
                placeholder="N° de factura o recibo"
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
              <button type="button" className="boton boton--fantasma" onClick={cerrar}>
                Cancelar
              </button>
              <button type="submit" className="boton">
                Guardar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Traspaso entre cajas                                               */}
      {/* ------------------------------------------------------------------ */}

      {vista === 'traspaso' && traspaso && (
        <form className="admin-form" onSubmit={enviarTraspaso}>
          <p className="admin-ayuda">
            Pasar plata de una caja a la otra: llevar la recaudación de la semana al fondo, o sacar
            del fondo para reponer el efectivo. No es un ingreso ni un gasto, así que no aparece en
            la cuenta del mes.
          </p>

          <div className="admin-form__grilla">
            <label className="admin-campo">
              <span className="admin-campo__label">Fecha</span>
              <input
                className="admin-campo__control"
                type="date"
                value={traspaso.fecha}
                onChange={campoTraspaso('fecha')}
                required
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Sale de</span>
              <select
                className="admin-campo__control"
                value={traspaso.origen_id}
                onChange={campoTraspaso('origen_id')}
                required
              >
                <option value="">Elegir…</option>
                {activas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · {conSigno(saldoDeCaja(c, movimientos))}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Entra en</span>
              <select
                className="admin-campo__control"
                value={traspaso.destino_id}
                onChange={campoTraspaso('destino_id')}
                required
              >
                <option value="">Elegir…</option>
                {activas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · {conSigno(saldoDeCaja(c, movimientos))}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Monto (ARS)</span>
              <input
                className="admin-campo__control"
                type="number"
                min="0"
                step="100"
                value={traspaso.monto}
                onChange={campoTraspaso('monto')}
                required
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Cómo se movió</span>
              <select
                className="admin-campo__control"
                value={traspaso.metodo}
                onChange={campoTraspaso('metodo')}
              >
                {Object.entries(METODOS_PAGO).map(([clave, texto]) => (
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
                value={traspaso.notas}
                onChange={campoTraspaso('notas')}
              />
            </label>
          </div>

          {/* Aviso y no bloqueo: la caja puede quedar en rojo un rato porque
              todavía falta cargar algo que entró. */}
          {traspaso.origen_id && Number(traspaso.monto) > saldoDe(traspaso.origen_id) && (
            <p className="admin-ayuda admin-ayuda--alerta">
              Estás sacando más de lo que hay en esa caja: va a quedar en negativo.
            </p>
          )}

          <div className="admin-form__pie">
            <div className="admin-form__botones">
              <button type="button" className="boton boton--fantasma" onClick={cerrar}>
                Cancelar
              </button>
              <button type="submit" className="boton">
                Hacer el traspaso
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Cajas                                                              */}
      {/* ------------------------------------------------------------------ */}

      {vista === 'cajas' && (
        <>
          <div className="admin__barra">
            <p className="admin-ayuda">
              El <strong>saldo inicial</strong> es lo que había adentro el día que se empezó a
              anotar. Si el saldo que muestra el panel no coincide con la plata real, se corrige
              ahí o con un movimiento de tipo «Ajuste de caja».
            </p>
            {!formCaja && (
              <button
                type="button"
                className="boton boton--fantasma"
                /* La nueva va al final de la lista y no arriba de la caja
                   chica, que es la que se mira todos los días. */
                onClick={() => setFormCaja({ ...CAJA_VACIA, orden: cajas.length + 1 })}
              >
                Nueva caja
              </button>
            )}
          </div>

          {formCaja && (
            <form className="admin-form" onSubmit={enviarCaja}>
              <div className="admin-form__grilla">
                <label className="admin-campo">
                  <span className="admin-campo__label">Nombre</span>
                  <input
                    className="admin-campo__control"
                    value={formCaja.nombre}
                    onChange={campoCaja('nombre')}
                    placeholder="Mercado Pago"
                    required
                  />
                </label>

                <label className="admin-campo">
                  <span className="admin-campo__label">Tipo</span>
                  <select
                    className="admin-campo__control"
                    value={formCaja.tipo}
                    onChange={campoCaja('tipo')}
                  >
                    {Object.entries(TIPOS_CAJA).map(([clave, texto]) => (
                      <option key={clave} value={clave}>
                        {texto}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-campo">
                  <span className="admin-campo__label">Saldo inicial (ARS)</span>
                  <input
                    className="admin-campo__control"
                    type="number"
                    step="100"
                    value={formCaja.saldo_inicial}
                    onChange={campoCaja('saldo_inicial')}
                  />
                </label>

                <label className="admin-campo">
                  <span className="admin-campo__label">Orden en la lista</span>
                  <input
                    className="admin-campo__control"
                    type="number"
                    value={formCaja.orden}
                    onChange={campoCaja('orden')}
                  />
                </label>

                <label className="admin-campo admin-campo--ancho">
                  <span className="admin-campo__label">Notas</span>
                  <input
                    className="admin-campo__control"
                    value={formCaja.notas}
                    onChange={campoCaja('notas')}
                  />
                </label>

                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={formCaja.activa}
                    onChange={(e) => setFormCaja((c) => ({ ...c, activa: e.target.checked }))}
                  />
                  Activa (se ofrece al cargar movimientos)
                </label>
              </div>

              <div className="admin-form__pie">
                <div className="admin-form__botones">
                  <button
                    type="button"
                    className="boton boton--fantasma"
                    onClick={() => setFormCaja(null)}
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

          {!formCaja &&
            (cajas.length === 0 ? (
              <Vacio>No hay cajas cargadas. Creá la primera con «Nueva caja».</Vacio>
            ) : (
              <div className="admin-tabla__scroll">
                <table className="admin-tabla">
                  <thead>
                    <tr>
                      <th>Caja</th>
                      <th>Tipo</th>
                      <th>Saldo inicial</th>
                      <th>Movimientos</th>
                      <th>Saldo hoy</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cajas.map((c) => (
                      <tr key={c.id} data-inactivo={!c.activa}>
                        <td>
                          {c.nombre}
                          {c.notas && <div className="admin-ayuda">{c.notas}</div>}
                        </td>
                        <td>{TIPOS_CAJA[c.tipo]}</td>
                        <td>{precio(c.saldo_inicial)}</td>
                        <td>{movimientos.filter((m) => m.caja_id === c.id).length}</td>
                        <td>
                          <strong>{conSigno(saldoDeCaja(c, movimientos))}</strong>
                        </td>
                        <td>
                          <div className="admin-tabla__acciones">
                            <button
                              type="button"
                              className="admin__link"
                              onClick={() =>
                                setFormCaja({ ...CAJA_VACIA, ...c, notas: c.notas ?? '' })
                              }
                            >
                              Editar
                            </button>
                            <BotonEliminar
                              activo={confirmando === c.id}
                              alPedir={() => setConfirmando(c.id)}
                              alCancelar={() => setConfirmando(null)}
                              alConfirmar={() => {
                                correr(() => eliminarCaja(c.id, movimientos))
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

          {!formCaja && (
            <div className="admin-form__pie">
              <button type="button" className="boton boton--fantasma" onClick={cerrar}>
                Volver a los movimientos
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
