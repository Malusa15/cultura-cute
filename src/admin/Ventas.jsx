import { Fragment, useState } from 'react'
import {
  ESTADOS_ENVIO,
  ESTADOS_VENTA,
  cambiarEstadoVenta,
  eliminarVenta,
  traerVentas,
} from '../lib/ventas.js'
import { avisarCatalogoActualizado } from '../context/CatalogoContext.jsx'
import { fecha, precio } from '../lib/formato.js'
import { BotonEliminar, SelectEstado, Vacio, useLista } from './comunes.jsx'

export default function Ventas() {
  const { datos: ventas, cargando, error, correr } = useLista(traerVentas)
  const [confirmando, setConfirmando] = useState(null)
  // Qué venta tiene el detalle de prendas abierto.
  const [abierta, setAbierta] = useState(null)
  const [filtro, setFiltro] = useState('todas')

  const visibles = filtro === 'todas' ? ventas : ventas.filter((v) => v.estado === filtro)
  const pendientes = ventas.filter((v) => v.estado === 'pendiente').length

  // Confirmar o cancelar mueve stock, así que la tienda tiene que enterarse.
  const cambiarEstado = (id, estado) =>
    correr(async () => {
      await cambiarEstadoVenta(id, estado)
      avisarCatalogoActualizado()
    })

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Ventas</h2>
        <div className="admin-filtro-estado">
          <label className="admin-campo__label" htmlFor="filtro-ventas">
            Ver
          </label>
          <select
            id="filtro-ventas"
            className="admin-campo__control"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="todas">Todas</option>
            {Object.entries(ESTADOS_VENTA).map(([clave, texto]) => (
              <option key={clave} value={clave}>
                {texto}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="admin-ayuda">
        Los pedidos que entran por el carrito llegan como <strong>Pendiente</strong>. Al pasarlos a{' '}
        <strong>Confirmada</strong> se descuenta el stock de cada talle; si después los cancelás, el
        stock vuelve.
        {pendientes > 0 && ` Tenés ${pendientes} pendiente${pendientes > 1 ? 's' : ''}.`}
      </p>

      {error && <p className="admin-error">{error}</p>}

      {cargando ? (
        <p>Cargando ventas…</p>
      ) : visibles.length === 0 ? (
        <Vacio>
          {ventas.length === 0
            ? 'Todavía no hay ventas. Cuando alguien finalice una compra desde la tienda, aparece acá.'
            : 'No hay ventas con ese estado.'}
        </Vacio>
      ) : (
        <div className="admin-tabla__scroll">
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>N°</th>
                <th>Fecha</th>
                <th>Clienta</th>
                <th>Prendas</th>
                <th>Total</th>
                <th>Envío</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((venta) => (
                <Fragment key={venta.id}>
                  <tr data-inactivo={venta.estado === 'cancelada'}>
                    <td>#{venta.numero}</td>
                    <td>{fecha(venta.creada_en)}</td>
                    <td>
                      {venta.cliente_nombre ?? <span className="admin-ayuda">Sin nombre</span>}
                      {venta.cliente_contacto && (
                        <div className="admin-ayuda">{venta.cliente_contacto}</div>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="admin__link"
                        onClick={() => setAbierta(abierta === venta.id ? null : venta.id)}
                      >
                        {venta.items.length} {venta.items.length === 1 ? 'prenda' : 'prendas'}
                        {abierta === venta.id ? ' ▴' : ' ▾'}
                      </button>
                    </td>
                    <td>{precio(venta.total)}</td>
                    <td>
                      {venta.envio ? (
                        <span className="admin-estado" data-estado={venta.envio.estado}>
                          {ESTADOS_ENVIO[venta.envio.estado]}
                        </span>
                      ) : (
                        <span className="admin-ayuda">—</span>
                      )}
                    </td>
                    <td>
                      <SelectEstado
                        valor={venta.estado}
                        opciones={ESTADOS_VENTA}
                        etiqueta={`Estado de la venta ${venta.numero}`}
                        alCambiar={(estado) => cambiarEstado(venta.id, estado)}
                      />
                    </td>
                    <td>
                      <div className="admin-tabla__acciones">
                        <BotonEliminar
                          activo={confirmando === venta.id}
                          alPedir={() => setConfirmando(venta.id)}
                          alCancelar={() => setConfirmando(null)}
                          alConfirmar={() => {
                            correr(() => eliminarVenta(venta.id))
                            setConfirmando(null)
                          }}
                        />
                      </div>
                    </td>
                  </tr>

                  {abierta === venta.id && (
                    <tr className="admin-tabla__detalle">
                      <td colSpan={8}>
                        <ul className="admin-detalle__lista">
                          {venta.items.map((item) => (
                            <li key={item.id}>
                              <span>
                                {item.nombre} · talle {item.talle} · x{item.cantidad}
                              </span>
                              <span>{precio(item.precio_unitario * item.cantidad)}</span>
                            </li>
                          ))}
                        </ul>
                        {venta.notas && <p className="admin-ayuda">Nota: {venta.notas}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
