import { supabase } from './supabase.js'

// Lectura de las visitas para la solapa Estadísticas del panel. Lo que las
// escribe está en api/visita.js y src/lib/analitica.js; las tablas, en
// supabase/estadisticas.sql.

// --- Listas fijas ------------------------------------------------------------

export const DISPOSITIVOS = {
  celular: 'Celular',
  tablet: 'Tablet',
  compu: 'Computadora',
}

// Los que sabemos nombrar. Cualquier otro se muestra tal cual vino.
export const ORIGENES = {
  directo: 'Directo (escribió la dirección)',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  google: 'Google',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  otro: 'Otro sitio',
}

// Los ids de los <section> de la tienda, con nombre para mostrar. Si aparece uno
// que no está en la lista se muestra con su id, así agregar una sección nueva a
// la página no obliga a tocar esto.
export const SECCIONES = {
  inicio: 'Inicio',
  'sobre-nosotras': 'Sobre nosotras',
  servicios: 'Servicios',
  'a-medida': 'Prendas a pedido',
  personalizacion: 'Personalización',
  tienda: 'Tienda',
  contacto: 'Contacto',
}

export const PERIODOS = {
  7: 'Últimos 7 días',
  30: 'Últimos 30 días',
  90: 'Últimos 3 meses',
  365: 'Último año',
}

// Los códigos de país que devuelve Vercel son de dos letras. Se nombran los que
// pueden aparecer de verdad; el resto se muestra con su código.
const PAISES = {
  AR: 'Argentina',
  UY: 'Uruguay',
  CL: 'Chile',
  BR: 'Brasil',
  PY: 'Paraguay',
  BO: 'Bolivia',
  PE: 'Perú',
  MX: 'México',
  ES: 'España',
  US: 'Estados Unidos',
}

export function nombreDePais(codigo) {
  if (!codigo) return 'Sin dato'
  return PAISES[codigo] ?? codigo
}

// --- Formato -----------------------------------------------------------------

// 95 -> "1 m 35 s". Los tiempos de una visita son de segundos a minutos, así que
// las horas casi nunca aparecen, pero si aparecen no se muestran como "412 m".
export function duracion(segundos) {
  const s = Math.max(0, Math.round(Number(segundos) || 0))
  if (s < 60) return `${s} s`

  const minutos = Math.floor(s / 60)
  if (minutos < 60) {
    const resto = s % 60
    return resto ? `${minutos} m ${resto} s` : `${minutos} m`
  }

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto ? `${horas} h ${resto} m` : `${horas} h`
}

export function porcentaje(parte, total) {
  if (!total) return '0%'
  return `${Math.round((parte / total) * 100)}%`
}

// --- Las cuentas -------------------------------------------------------------

function contar(filas, sacarClave) {
  const cuenta = new Map()
  for (const f of filas) {
    const clave = sacarClave(f)
    if (clave == null) continue
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1)
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
}

export function resumen(visitas) {
  const distintos = new Set(visitas.map((v) => v.visitante)).size

  // El promedio deja afuera las visitas de cero segundos: son las que entraron y
  // se fueron antes de que el medidor alcanzara a contar nada, y si contaran
  // harían parecer que nadie se queda.
  const conTiempo = visitas.filter((v) => v.segundos > 0)
  const totalSegundos = conTiempo.reduce((s, v) => s + Number(v.segundos || 0), 0)

  // Cuántos se fueron sin llegar a mirar nada. Es la señal más honesta de si la
  // página engancha o no.
  const rebotes = visitas.filter((v) => Number(v.segundos || 0) < 10).length

  return {
    visitas: visitas.length,
    distintos,
    promedio: conTiempo.length ? totalSegundos / conTiempo.length : 0,
    rebotes,
    porOrigen: contar(visitas, (v) => v.origen || 'directo'),
    porDispositivo: contar(visitas, (v) => v.dispositivo || 'compu'),
    // Las que no se pudieron ubicar entran como "Sin dato" en vez de quedar
    // afuera: si desaparecieran, los porcentajes no cerrarían y no se entendería
    // por qué.
    porPais: contar(visitas, (v) => v.pais || ''),
    // Ciudad y país juntos: hay una Córdoba en Argentina y otra en España.
    porCiudad: contar(visitas, (v) => `${v.ciudad ?? ''}|${v.pais ?? ''}`),
  }
}

// Cuánta gente vio cada sección y cuánto se quedó en promedio.
//
// Se ordena por gente y no por tiempo total: una sección que ve mucha gente poco
// rato importa más que una que vio una sola persona durante diez minutos.
export function porSeccion(visitas) {
  const secciones = new Map()

  for (const v of visitas) {
    for (const s of v.secciones ?? []) {
      const fila = secciones.get(s.seccion) ?? { seccion: s.seccion, gente: 0, segundos: 0 }
      fila.gente += 1
      fila.segundos += Number(s.segundos || 0)
      secciones.set(s.seccion, fila)
    }
  }

  return [...secciones.values()]
    .map((f) => ({ ...f, promedio: f.gente ? f.segundos / f.gente : 0 }))
    .sort((a, b) => b.gente - a.gente)
}

// Visitas por día, del más viejo al más nuevo, con los días vacíos en cero: si
// un día sin visitas desapareciera, la seguidilla mentiría.
export function porDia(visitas, dias, hasta = new Date()) {
  const cuenta = new Map()
  for (const v of visitas) {
    cuenta.set(v.fecha, (cuenta.get(v.fecha) ?? 0) + 1)
  }

  const filas = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hasta)
    d.setDate(d.getDate() - i)
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    filas.push({ fecha: clave, visitas: cuenta.get(clave) ?? 0 })
  }
  return filas
}

// --- Base de datos -----------------------------------------------------------

// El SQL se corre a mano, así que la solapa puede abrirse antes de que las
// tablas existan. Sin esto se vería el error crudo de Postgres.
function faltaElSql(e) {
  const codigo = e?.code ?? ''
  return codigo === '42P01' || codigo === 'PGRST205' || /schema cache/i.test(e?.message ?? '')
}

// Cuántos días para atrás se piden. A diferencia de Economía, acá una fila es
// una persona entrando: crece mucho más rápido, así que la consulta va siempre
// acotada por fecha en vez de traer todo.
export async function traerVisitas(dias = 30) {
  const desde = new Date()
  desde.setDate(desde.getDate() - (dias - 1))
  const clave = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}-${String(desde.getDate()).padStart(2, '0')}`

  try {
    const { data, error } = await supabase
      .from('visitas')
      .select('id, visitante, fecha, pais, ciudad, dispositivo, origen, referente, segundos, visita_secciones ( seccion, segundos )')
      .gte('fecha', clave)
      .order('creada_en', { ascending: false })

    if (error) throw error

    return {
      dias,
      visitas: data.map((v) => ({ ...v, secciones: v.visita_secciones ?? [] })),
    }
  } catch (e) {
    if (faltaElSql(e)) {
      throw new Error(
        'Todavía no están creadas las tablas de estadísticas. Hay que abrir el SQL Editor de Supabase y correr supabase/estadisticas.sql.',
      )
    }
    throw e
  }
}
