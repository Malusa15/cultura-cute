import { useMemo, useState } from 'react'
import {
  ETIQUETAS_TIPO,
  METODOS_PAGO,
  RUBROS,
  TIPOS_A_MANO,
  TIPOS_CAJA,
  TIPOS_MOVIMIENTO,
  ajusteDeArqueo,
  armarCsv,
  descargarCsv,
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
  pendientes,
  plata,
  porPrenda,
  proximoMes,
  registrarPendientes,
  registrarTraspaso,
  resumen,
  saldoDeCaja,
  traerEconomia,
  ultimosMeses,
} from '../lib/economia.js'
import { fecha } from '../lib/formato.js'
import { BotonEliminar, Vacio, useLista } from './comunes.jsx'

// Lo que se muestra mientras carga. Sin esto habría que preguntar por cada lista
// antes de usarla, en una pantalla que las cruza todo el tiempo.
const SIN_DATOS = {
  cajas: [],
  movimientos: [],
  ventas: [],
  encargos: [],
  envios: [],
  presupuestos: [],
  enlaces: false,
}

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
  encargo_id: '',
  envio_id: '',
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

const arqueoVacio = (caja_id) => ({ caja_id, fecha: hoy(), contado: '' })

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

// El signo lo pone la dirección: los montos se guardan siempre positivos.
function Monto({ movimiento }) {
  return (
    <span className="admin-monto" data-direccion={movimiento.direccion}>
      {movimiento.direccion === 'entra' ? '+' : '−'} {plata(movimiento.monto)}
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
    encargo_id: m.encargo_id ?? '',
    envio_id: m.envio_id ?? '',
    notas: m.notas ?? '',
  }
}

export default function Economia() {
  const { datos, cargando, error, setError, correr } = useLista(traerEconomia, SIN_DATOS)
  const { cajas, movimientos, ventas, encargos, envios, presupuestos, enlaces } = datos

  // Una sola puerta a la vez: null es la lista, y cada valor es un formulario.
  const [vista, setVista] = useState(null)
  const [form, setForm] = useState(null)
  const [traspaso, setTraspaso] = useState(null)
  const [arqueo, setArqueo] = useState(null)
  const [formCaja, setFormCaja] = useState(null)
  const [confirmando, setConfirmando] = useState(null)

  const [mes, setMes] = useState(mesActual())
  const [caja, setCaja] = useState('todas')
  const [filtro, setFiltro] = useState('todos')

  // Qué pendientes están tildados y dónde se van a cargar.
  const [desmarcados, setDesmarcados] = useState(() => new Set())
  const [cajaPendientes, setCajaPendientes] = useState('')
  const [metodoPendientes, setMetodoPendientes] = useState('efectivo')

  const activas = cajas.filter((c) => c.activa)

  // Todo lo que se recalcula recorriendo la lista entera va memorizado: si no,
  // cada tecla en un formulario vuelve a sumar todos los movimientos de todas
  // las cajas para redibujar los saldos que ni siquiera cambiaron.
  const saldos = useMemo(
    () => new Map(cajas.map((c) => [c.id, saldoDeCaja(c, movimientos)])),
    [cajas, movimientos],
  )
  const saldoDe = (id) => saldos.get(id) ?? 0
  const total = useMemo(() => [...saldos.values()].reduce((s, v) => s + v, 0), [saldos])

  const meses = useMemo(() => mesesDe(movimientos), [movimientos])

  // Primero la caja y después el mes: la tira de meses necesita la lista
  // filtrada por caja pero sin filtrar por mes.
  const porCaja = useMemo(
    () => (caja === 'todas' ? movimientos : movimientos.filter((m) => m.caja_id === caja)),
    [movimientos, caja],
  )
  const periodo = useMemo(
    () => (mes === 'todos' ? porCaja : porCaja.filter((m) => mesDe(m.fecha) === mes)),
    [porCaja, mes],
  )

  const cuenta = useMemo(() => resumen(periodo), [periodo])
  const tira = useMemo(
    () => ultimosMeses(porCaja, 6, mes === 'todos' ? mesActual() : mes),
    [porCaja, mes],
  )
  const prendas = useMemo(() => porPrenda(ventas, presupuestos, mes), [ventas, presupuestos, mes])

  const sinCargar = useMemo(
    () => pendientes({ movimientos, ventas, encargos, envios, enlaces }),
    [movimientos, ventas, encargos, envios, enlaces],
  )
  const clave = (p) => `${p.clase}:${p.id}`
  const elegidos = sinCargar.filter((p) => !desmarcados.has(clave(p)))

  const elegido = FILTROS.find((f) => f.id === filtro) ?? FILTROS[0]
  const visibles = useMemo(() => periodo.filter(elegido.pasa), [periodo, elegido])

  // La caja que se propone por defecto: la chica, que es donde cae casi todo.
  const cajaPorDefecto = () => activas.find((c) => c.tipo === 'chica')?.id ?? activas[0]?.id ?? ''

  const cerrar = () => {
    setVista(null)
    setForm(null)
    setTraspaso(null)
    setArqueo(null)
    setFormCaja(null)
    setError(null)
  }

  const abrirMovimiento = (movimiento) => {
    setError(null)
    setForm(movimiento ? paraEditar(movimiento) : movimientoVacio(cajaPorDefecto()))
    setVista('movimiento')
  }

  // Repetir un gasto fijo: los mismos datos con la fecha corrida un mes y sin
  // id, así se guarda como uno nuevo en vez de pisar el del mes pasado.
  const repetir = (movimiento) => {
    setError(null)
    setForm({
      ...paraEditar(movimiento),
      id: null,
      fecha: proximoMes(movimiento.fecha),
      // El vínculo no se copia: el cobro de la venta #14 pasa una sola vez.
      venta_id: '',
      encargo_id: '',
      envio_id: '',
    })
    setVista('movimiento')
  }

  const abrirTraspaso = () => {
    setError(null)
    const chica = activas.find((c) => c.tipo === 'chica')
    const grande = activas.find((c) => c.tipo === 'grande')
    setTraspaso(traspasoVacio(chica?.id ?? '', grande?.id ?? ''))
    setVista('traspaso')
  }

  const abrirArqueo = () => {
    setError(null)
    setArqueo(arqueoVacio(cajaPorDefecto()))
    setVista('arqueo')
  }

  const campo = (nombre) => (e) => setForm((f) => ({ ...f, [nombre]: e.target.value }))
  const campoTraspaso = (nombre) => (e) => setTraspaso((t) => ({ ...t, [nombre]: e.target.value }))
  const campoArqueo = (nombre) => (e) => setArqueo((a) => ({ ...a, [nombre]: e.target.value }))
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

  // Después de guardar, correr los filtros hasta donde quedó lo que se acaba de
  // cargar. Si no, un gasto con fecha del mes pasado se guarda bien pero no
  // aparece en pantalla, y parece que no se guardó.
  const mostrar = (fechaGuardada, cajaGuardada) => {
    setFiltro('todos')
    if (mes !== 'todos') setMes(mesDe(fechaGuardada))
    if (caja !== 'todas' && caja !== cajaGuardada) setCaja('todas')
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
      await guardarMovimiento(form, enlaces)
      mostrar(form.fecha, form.caja_id)
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
      // Un traspaso toca dos cajas: pasando null, `mostrar` saca el filtro de
      // caja y las dos patas quedan a la vista.
      mostrar(traspaso.fecha, null)
      cerrar()
    })
  }

  const diferenciaArqueo =
    arqueo && String(arqueo.contado).trim() !== ''
      ? Number(arqueo.contado) - saldoDe(arqueo.caja_id)
      : null

  const enviarArqueo = (e) => {
    e.preventDefault()
    if (!arqueo.caja_id) {
      setError('Hay que elegir qué caja contaste.')
      return
    }
    if (String(arqueo.contado).trim() === '') {
      setError('Falta cuánta plata contaste.')
      return
    }

    const ajuste = ajusteDeArqueo({
      caja_id: arqueo.caja_id,
      contado: arqueo.contado,
      saldoActual: saldoDe(arqueo.caja_id),
      fecha: arqueo.fecha,
    })

    if (!ajuste) {
      setError('La caja da justo: no hace falta ningún ajuste.')
      return
    }

    correr(async () => {
      await guardarMovimiento(ajuste, enlaces)
      mostrar(ajuste.fecha, ajuste.caja_id)
      cerrar()
    })
  }

  const cargarPendientes = () =>
    correr(async () => {
      await registrarPendientes(elegidos, cajaPendientes || cajaPorDefecto(), metodoPendientes, enlaces)
      setDesmarcados(new Set())
    })

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

  const exportar = () => {
    const sufijo = mes === 'todos' ? 'todo' : mes
    descargarCsv(armarCsv(visibles, cajas), `economia-${sufijo}.csv`)
  }

  // Para que las barras de los últimos meses sean comparables entre sí.
  const topeTira = Math.max(1, ...tira.map((t) => Math.max(t.entradas, t.salidas)))

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
              Traspaso
            </button>
            <button type="button" className="boton boton--fantasma" onClick={abrirArqueo}>
              Contar la caja
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
      {/* Lista: saldos, pendientes, resumen y la tabla de movimientos.      */}
      {/* ------------------------------------------------------------------ */}

      {vista === null && (
        <>
          <div className="admin-saldos">
            {cajas.map((c) => (
              <div key={c.id} className="admin-saldo" data-tipo={c.tipo} data-inactiva={!c.activa}>
                <span className="admin-saldo__nombre">{c.nombre}</span>
                <span className="admin-saldo__monto" data-negativo={saldoDe(c.id) < 0}>
                  {plata(saldoDe(c.id))}
                </span>
                <span className="admin-saldo__pie">
                  {TIPOS_CAJA[c.tipo]}
                  {!c.activa && ' · guardada'}
                </span>
              </div>
            ))}

            {cajas.length > 1 && (
              <div className="admin-saldo admin-saldo--total">
                <span className="admin-saldo__nombre">Todo junto</span>
                <span className="admin-saldo__monto" data-negativo={total < 0}>
                  {plata(total)}
                </span>
                <span className="admin-saldo__pie">Suma de las cajas</span>
              </div>
            )}
          </div>

          {/* --- Plata anotada en otras solapas que todavía no tiene caja --- */}
          {sinCargar.length > 0 && (
            <div className="admin-pendientes">
              <h3 className="admin-bloque__titulo">Plata que falta registrar</h3>
              <p className="admin-ayuda">
                Esto ya está anotado en otras solapas —ventas cerradas, señas de encargos, costos de
                envío— pero todavía no entró ni salió de ninguna caja. Destildá lo que no quieras
                cargar todavía.
              </p>

              <ul className="admin-pendientes__lista">
                {sinCargar.map((p) => {
                  const k = clave(p)
                  return (
                    <li key={k}>
                      <label className="admin-check">
                        <input
                          type="checkbox"
                          checked={!desmarcados.has(k)}
                          onChange={(e) =>
                            setDesmarcados((s) => {
                              const nuevo = new Set(s)
                              if (e.target.checked) nuevo.delete(k)
                              else nuevo.add(k)
                              return nuevo
                            })
                          }
                        />
                        <span>
                          <strong>{p.etiqueta}</strong>
                          {p.detalle && ` · ${p.detalle}`}
                          <span className="admin-ayuda"> {fecha(p.fecha)}</span>
                        </span>
                      </label>
                      <span className="admin-monto" data-direccion={p.direccion}>
                        {p.direccion === 'entra' ? '+' : '−'} {plata(p.monto)}
                      </span>
                    </li>
                  )
                })}
              </ul>

              <div className="admin-pendientes__pie">
                <label className="admin-campo">
                  <span className="admin-campo__label">En qué caja</span>
                  <select
                    className="admin-campo__control"
                    value={cajaPendientes || cajaPorDefecto()}
                    onChange={(e) => setCajaPendientes(e.target.value)}
                  >
                    {activas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-campo">
                  <span className="admin-campo__label">Cómo se pagó</span>
                  <select
                    className="admin-campo__control"
                    value={metodoPendientes}
                    onChange={(e) => setMetodoPendientes(e.target.value)}
                  >
                    {Object.entries(METODOS_PAGO).map(([k, texto]) => (
                      <option key={k} value={k}>
                        {texto}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="boton"
                  disabled={elegidos.length === 0}
                  onClick={cargarPendientes}
                >
                  Cargar {elegidos.length === 1 ? 'el elegido' : `los ${elegidos.length} elegidos`}
                </button>
              </div>

              {!enlaces && (
                <p className="admin-ayuda">
                  Por ahora solo se listan las ventas. Para que aparezcan también las señas de los
                  encargos y los costos de envío hay que volver a correr{' '}
                  <code>supabase/economia.sql</code> en Supabase: la última parte del archivo agrega
                  lo que hace falta para no cargar dos veces lo mismo.
                </p>
              )}
            </div>
          )}

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
              <span className="admin-resumen__valor">{plata(cuenta.entradas)}</span>
            </div>
            <div className="admin-resumen__dato" data-signo="sale">
              <span className="admin-resumen__label">Salió</span>
              <span className="admin-resumen__valor">{plata(cuenta.salidas)}</span>
            </div>
            <div
              className="admin-resumen__dato admin-resumen__dato--resultado"
              data-signo={cuenta.resultado < 0 ? 'sale' : 'entra'}
            >
              <span className="admin-resumen__label">Quedó</span>
              <span className="admin-resumen__valor">{plata(cuenta.resultado)}</span>
            </div>
          </div>

          <p className="admin-ayuda">
            {mes === 'todos' ? 'Desde que se empezó a anotar' : nombreDeMes(mes)}
            {caja !== 'todas' && `, solo ${cajas.find((c) => c.id === caja)?.nombre}`}. Los traspasos
            entre cajas no cuentan acá: esa plata no entró ni salió, cambió de bolsillo.
          </p>

          {/* --- Los tres bloques de análisis, cerrados salvo el primero --- */}

          {cuenta.porRubro.length > 0 && (
            <details className="admin-desplegable" open>
              <summary className="admin-bloque__titulo">En qué se fue</summary>
              <ul className="admin-cuenta">
                {cuenta.porRubro.map(([rubro, monto]) => (
                  <li key={rubro}>
                    <span>{RUBROS[rubro] ?? rubro}</span>
                    <span>{plata(monto)}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <details className="admin-desplegable">
            <summary className="admin-bloque__titulo">Cómo venís mes a mes</summary>
            <p className="admin-ayuda">
              Los últimos seis meses hasta el que estás mirando. Las barras están a la misma escala,
              así que se comparan entre sí.
            </p>
            <ul className="admin-tira">
              {tira.map((t) => (
                <li key={t.mes} className="admin-tira__mes">
                  <span className="admin-tira__nombre">{nombreDeMes(t.mes)}</span>
                  <span className="admin-tira__barras">
                    <span
                      className="admin-tira__barra"
                      data-direccion="entra"
                      style={{ width: `${(t.entradas / topeTira) * 100}%` }}
                    />
                    <span
                      className="admin-tira__barra"
                      data-direccion="sale"
                      style={{ width: `${(t.salidas / topeTira) * 100}%` }}
                    />
                  </span>
                  <span className="admin-monto" data-direccion={t.resultado < 0 ? 'sale' : 'entra'}>
                    {plata(t.resultado)}
                  </span>
                </li>
              ))}
            </ul>
          </details>

          <details className="admin-desplegable">
            <summary className="admin-bloque__titulo">Qué prendas se vendieron</summary>
            <p className="admin-ayuda">
              Las ventas confirmadas y entregadas del mes elegido (esto no mira el filtro de caja: es
              sobre las ventas, no sobre dónde entró la plata). El <strong>costo</strong> aparece solo
              cuando hay un presupuesto con ese mismo nombre de prenda, que es el único lugar donde
              hoy se anota lo que cuesta hacerla. Las prendas del catálogo no tienen costo cargado en
              ninguna parte, así que de esas se ve lo que entró, no lo que dejaron.
            </p>

            {prendas.length === 0 ? (
              <Vacio>No hay ventas cerradas en ese período.</Vacio>
            ) : (
              <div className="admin-tabla__scroll">
                <table className="admin-tabla">
                  <thead>
                    <tr>
                      <th>Prenda</th>
                      <th>Unidades</th>
                      <th>Facturado</th>
                      <th>Costo</th>
                      <th>Deja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prendas.map((p) => (
                      <tr key={p.nombre}>
                        <td>{p.nombre}</td>
                        <td>{p.unidades}</td>
                        <td>{plata(p.facturado)}</td>
                        <td>
                          {p.costo == null ? (
                            <span className="admin-ayuda">sin costo cargado</span>
                          ) : (
                            plata(p.costo)
                          )}
                        </td>
                        <td>
                          {p.margen == null ? (
                            <span className="admin-ayuda">—</span>
                          ) : (
                            <span
                              className="admin-monto"
                              data-direccion={p.margen < 0 ? 'sale' : 'entra'}
                            >
                              {plata(p.margen)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>

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
            <>
              <div className="admin__barra admin__barra--tabla">
                <p className="admin-ayuda">
                  {visibles.length} {visibles.length === 1 ? 'movimiento' : 'movimientos'} en pantalla.
                </p>
                <button type="button" className="admin__link" onClick={exportar}>
                  Bajar a Excel (CSV)
                </button>
              </div>

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
                              <>
                                <button
                                  type="button"
                                  className="admin__link"
                                  onClick={() => abrirMovimiento(m)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="admin__link"
                                  title="Cargarlo de nuevo con la fecha del mes que viene"
                                  onClick={() => repetir(m)}
                                >
                                  Repetir
                                </button>
                              </>
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
            </>
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
                {Object.entries(TIPOS_A_MANO).map(([clv, texto]) => (
                  <option key={clv} value={clv}>
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
                    {c.nombre} · {plata(saldoDe(c.id))}
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
                <select className="admin-campo__control" value={form.venta_id} onChange={elegirVenta}>
                  <option value="">Sin atar a una venta</option>
                  {ventas.map((v) => (
                    <option key={v.id} value={v.id}>
                      #{v.numero} · {v.cliente_nombre ?? 'Sin nombre'} · {plata(v.total)}
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
                {Object.entries(RUBROS).map(([clv, texto]) => (
                  <option key={clv} value={clv}>
                    {texto}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Cómo se pagó</span>
              <select className="admin-campo__control" value={form.metodo} onChange={campo('metodo')}>
                {Object.entries(METODOS_PAGO).map(([clv, texto]) => (
                  <option key={clv} value={clv}>
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
                    {c.nombre} · {plata(saldoDe(c.id))}
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
                    {c.nombre} · {plata(saldoDe(c.id))}
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
                {Object.entries(METODOS_PAGO).map(([clv, texto]) => (
                  <option key={clv} value={clv}>
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
      {/* Arqueo: contar la caja                                             */}
      {/* ------------------------------------------------------------------ */}

      {vista === 'arqueo' && arqueo && (
        <form className="admin-form" onSubmit={enviarArqueo}>
          <p className="admin-ayuda">
            Contás la plata que hay de verdad, escribís cuánto es, y el panel arma solo el ajuste que
            falta para que el saldo diga lo mismo. No hace falta que saques la cuenta de la
            diferencia.
          </p>

          <div className="admin-form__grilla">
            <label className="admin-campo">
              <span className="admin-campo__label">Qué caja contaste</span>
              <select
                className="admin-campo__control"
                value={arqueo.caja_id}
                onChange={campoArqueo('caja_id')}
                required
              >
                <option value="">Elegir…</option>
                {activas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Fecha</span>
              <input
                className="admin-campo__control"
                type="date"
                value={arqueo.fecha}
                onChange={campoArqueo('fecha')}
                required
              />
            </label>

            <label className="admin-campo">
              <span className="admin-campo__label">Cuánto contaste (ARS)</span>
              <input
                className="admin-campo__control"
                type="number"
                min="0"
                step="100"
                value={arqueo.contado}
                onChange={campoArqueo('contado')}
                required
              />
            </label>
          </div>

          <ul className="admin-cuenta">
            <li>
              <span>Dice el panel</span>
              <span>{plata(saldoDe(arqueo.caja_id))}</span>
            </li>
            <li>
              <span>Contaste</span>
              <span>
                {String(arqueo.contado).trim() === '' ? '—' : plata(Number(arqueo.contado))}
              </span>
            </li>
            <li className="admin-cuenta__total">
              <span>Diferencia</span>
              <span>{diferenciaArqueo == null ? '—' : plata(diferenciaArqueo)}</span>
            </li>
          </ul>

          {diferenciaArqueo !== null && (
            <p className="admin-ayuda">
              {diferenciaArqueo === 0
                ? 'La caja da justo: no hace falta ningún ajuste.'
                : diferenciaArqueo > 0
                  ? 'Hay más plata de la que dice el panel. Se va a cargar un ajuste que suma la diferencia.'
                  : 'Falta plata contra lo que dice el panel. Se va a cargar un ajuste que la resta.'}
            </p>
          )}

          <div className="admin-form__pie">
            <div className="admin-form__botones">
              <button type="button" className="boton boton--fantasma" onClick={cerrar}>
                Cancelar
              </button>
              <button type="submit" className="boton" disabled={diferenciaArqueo === 0}>
                Cargar el ajuste
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
              anotar. Si el saldo que muestra el panel no coincide con la plata real, se corrige ahí
              o con «Contar la caja».
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
                    {Object.entries(TIPOS_CAJA).map(([clv, texto]) => (
                      <option key={clv} value={clv}>
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
                        <td>{plata(c.saldo_inicial)}</td>
                        <td>{movimientos.filter((m) => m.caja_id === c.id).length}</td>
                        <td>
                          <strong>{plata(saldoDe(c.id))}</strong>
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
