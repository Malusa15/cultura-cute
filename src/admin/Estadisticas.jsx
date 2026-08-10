import { useCallback, useMemo, useState } from 'react'
import {
  DISPOSITIVOS,
  ORIGENES,
  PERIODOS,
  SECCIONES,
  duracion,
  nombreDePais,
  porDia,
  porSeccion,
  porcentaje,
  resumen,
  traerVisitas,
} from '../lib/estadisticas.js'
import { numero } from '../lib/formato.js'
import { Vacio, useLista } from './comunes.jsx'

const SIN_DATOS = { dias: 30, visitas: [] }

// Panel de Vercel, que cuenta las mismas visitas por su lado. Sirve de segunda
// opinión: si los dos números se parecen, los dos están bien.
const VERCEL = 'https://vercel.com/culturacute/cultura-cute/analytics'

const dia = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' })

// Una lista ordenada con barra de fondo. Se usa para todo lo que es "de esto
// hubo tanto": orígenes, dispositivos, países.
function Ranking({ filas, total, nombrar, vacio }) {
  if (filas.length === 0) return <p className="admin-ayuda">{vacio}</p>

  const tope = filas[0][1]

  return (
    <ul className="admin-ranking">
      {filas.map(([clave, cantidad]) => (
        <li key={clave} className="admin-ranking__fila">
          <span className="admin-ranking__barra" style={{ width: `${(cantidad / tope) * 100}%` }} />
          <span className="admin-ranking__nombre">{nombrar(clave)}</span>
          <span className="admin-ranking__cuenta">
            {numero(cantidad)}
            <span className="admin-ayuda"> · {porcentaje(cantidad, total)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function Estadisticas() {
  const [dias, setDias] = useState(30)

  // El período es parte de la consulta, así que cambiarlo tiene que volver a
  // pedir los datos. `useCallback` hace que la lista se recargue sola al
  // cambiar `dias`, sin un botón de "actualizar".
  const traer = useCallback(() => traerVisitas(dias), [dias])
  const { datos, cargando, error } = useLista(traer, SIN_DATOS)
  const { visitas } = datos

  const cuenta = useMemo(() => resumen(visitas), [visitas])
  const secciones = useMemo(() => porSeccion(visitas), [visitas])

  // El gráfico muestra como mucho un mes: con 365 barras no se distingue nada.
  const diasDelGrafico = Math.min(dias, 30)
  const serie = useMemo(() => porDia(visitas, diasDelGrafico), [visitas, diasDelGrafico])
  const topeSerie = Math.max(1, ...serie.map((d) => d.visitas))

  return (
    <>
      <div className="admin__barra">
        <h2 className="admin__seccion">Estadísticas</h2>

        <label className="admin-campo">
          <span className="admin-campo__label">Período</span>
          <select
            className="admin-campo__control"
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
          >
            {Object.entries(PERIODOS).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="admin-ayuda">
        Quién entró a la tienda no se puede saber, y ninguna herramienta lo dice: acá no hay
        nombres, ni IPs, ni cookies. Lo que sí se ve es cuánta gente entró, de dónde llegó y qué
        miró. De las que <strong>compran</strong> sí sabés quién es, y eso está en la solapa Ventas.
      </p>

      {error && <p className="admin-error">{error}</p>}

      {cargando ? (
        <p>Cargando las visitas…</p>
      ) : visitas.length === 0 ? (
        <Vacio>
          Todavía no hay visitas registradas en este período. Si recién lo pusimos a andar, los
          números empiezan a aparecer a medida que la gente entre.
        </Vacio>
      ) : (
        <>
          <div className="admin-saldos">
            <div className="admin-saldo">
              <span className="admin-saldo__nombre">Visitas</span>
              <span className="admin-saldo__monto">{numero(cuenta.visitas)}</span>
              <span className="admin-saldo__pie">Veces que se abrió la tienda</span>
            </div>

            <div className="admin-saldo">
              <span className="admin-saldo__nombre">Personas distintas</span>
              <span className="admin-saldo__monto">{numero(cuenta.distintos)}</span>
              <span className="admin-saldo__pie">Sin contar dos veces a la misma</span>
            </div>

            <div className="admin-saldo">
              <span className="admin-saldo__nombre">Se quedan</span>
              <span className="admin-saldo__monto">{duracion(cuenta.promedio)}</span>
              <span className="admin-saldo__pie">Promedio por visita</span>
            </div>

            <div className="admin-saldo">
              <span className="admin-saldo__nombre">Se van enseguida</span>
              <span className="admin-saldo__monto">
                {porcentaje(cuenta.rebotes, cuenta.visitas)}
              </span>
              <span className="admin-saldo__pie">Menos de 10 segundos</span>
            </div>
          </div>

          <details className="admin-desplegable" open>
            <summary className="admin-bloque__titulo">Visitas por día</summary>
            <p className="admin-ayuda">
              {diasDelGrafico === dias
                ? `Los últimos ${diasDelGrafico} días.`
                : `Los últimos ${diasDelGrafico} días (el resumen de arriba sí toma el período entero).`}
            </p>
            <ul className="admin-barras" style={{ '--columnas': serie.length }}>
              {serie.map((d) => (
                <li key={d.fecha} className="admin-barras__dia">
                  <span
                    className="admin-barras__barra"
                    style={{ height: `${(d.visitas / topeSerie) * 100}%` }}
                    title={`${dia.format(new Date(`${d.fecha}T12:00:00`))}: ${d.visitas} visitas`}
                  />
                </li>
              ))}
            </ul>
            <div className="admin-barras__pie">
              <span>{dia.format(new Date(`${serie[0].fecha}T12:00:00`))}</span>
              <span>{dia.format(new Date(`${serie[serie.length - 1].fecha}T12:00:00`))}</span>
            </div>
          </details>

          <details className="admin-desplegable" open>
            <summary className="admin-bloque__titulo">Por dónde llegaron</summary>
            <p className="admin-ayuda">
              Es el dato más útil para decidir dónde poner energía: si Instagram trae gente de
              verdad, o si la mayoría llega escribiendo la dirección porque ya te conoce.
            </p>
            <Ranking
              filas={cuenta.porOrigen}
              total={cuenta.visitas}
              nombrar={(o) => ORIGENES[o] ?? o}
              vacio="Sin datos todavía."
            />
          </details>

          <details className="admin-desplegable">
            <summary className="admin-bloque__titulo">Con qué entran</summary>
            <Ranking
              filas={cuenta.porDispositivo}
              total={cuenta.visitas}
              nombrar={(d) => DISPOSITIVOS[d] ?? d}
              vacio="Sin datos todavía."
            />
          </details>

          <details className="admin-desplegable">
            <summary className="admin-bloque__titulo">De dónde son</summary>
            <p className="admin-ayuda">
              La ciudad es aproximada: sale de por dónde se conecta la persona, no de dónde vive.
            </p>

            <h4 className="admin-medidas__grupo">País</h4>
            <Ranking
              filas={cuenta.porPais}
              total={cuenta.visitas}
              nombrar={nombreDePais}
              vacio="Sin datos de país todavía. Aparecen cuando el sitio esté publicado en Vercel."
            />

            <h4 className="admin-medidas__grupo">Ciudad</h4>
            <Ranking
              filas={cuenta.porCiudad}
              total={cuenta.visitas}
              nombrar={(c) => {
                const [ciudad, pais] = c.split('|')
                if (!ciudad) return 'Sin dato'
                return pais ? `${ciudad}, ${nombreDePais(pais)}` : ciudad
              }}
              vacio="Sin datos de ciudad todavía."
            />
          </details>

          <details className="admin-desplegable">
            <summary className="admin-bloque__titulo">Qué miraron y cuánto</summary>
            <p className="admin-ayuda">
              Cuánta gente llegó a ver cada sección y cuánto se quedó ahí. El tiempo se le suma a la
              sección que ocupa más pantalla en ese momento, así que no se cuenta dos veces.
            </p>

            {secciones.length === 0 ? (
              <p className="admin-ayuda">Sin datos todavía.</p>
            ) : (
              <div className="admin-tabla__scroll">
                <table className="admin-tabla">
                  <thead>
                    <tr>
                      <th>Sección</th>
                      <th>Cuánta gente</th>
                      <th>De las visitas</th>
                      <th>Se queda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secciones.map((s) => (
                      <tr key={s.seccion}>
                        <td>{SECCIONES[s.seccion] ?? s.seccion}</td>
                        <td>{numero(s.gente)}</td>
                        <td>{porcentaje(s.gente, cuenta.visitas)}</td>
                        <td>{duracion(s.promedio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        </>
      )}

      <p className="admin-ayuda">
        Vercel cuenta las mismas visitas por su lado, con su propio panel:{' '}
        <a className="admin__link" href={VERCEL} target="_blank" rel="noreferrer">
          verlo en Vercel
        </a>
        . Sirve de segunda opinión — los números nunca dan idénticos porque cada uno cuenta de una
        manera, pero tienen que parecerse.
      </p>
    </>
  )
}
