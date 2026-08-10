// Mide la visita a la tienda: de dónde llegó la persona, con qué aparato, y
// cuánto se quedó en cada sección. Lo manda a /api/visita, que es la única que
// ve la IP y le agrega el país y la ciudad (ver api/visita.js).
//
// Tres reglas que se respetan en todo el archivo:
//
//   1. Nada de esto puede romper la tienda. Todo va envuelto en try/catch y, si
//      algo falla, simplemente no se mide. Perder un número no es nada; que a
//      alguien no le cargue la página por un contador es inaceptable.
//   2. No se guarda nada en la máquina de quien visita salvo un identificador de
//      la pestaña, que se borra al cerrarla. Sin cookies, sin localStorage: por
//      eso el sitio no necesita el cartel de cookies.
//   3. El panel de administración no se mide. Son las visitas de la marca a sí
//      misma y ensuciarían los números.

const RUTA = '/api/visita'

// Los segundos se acumulan de a uno; este es el intervalo del reloj interno.
const TIC = 1000

// --- De dónde llegó ----------------------------------------------------------

// Cada entrada es [cómo se llama, qué dominios lo delatan]. El orden importa:
// gana la primera que coincida.
const ORIGENES = [
  ['instagram', ['instagram.com', 'l.instagram.com', 'ig.me']],
  ['whatsapp', ['whatsapp.com', 'wa.me', 'l.wl.co']],
  ['google', ['google.', 'googleusercontent.com']],
  ['facebook', ['facebook.com', 'fb.me', 'l.facebook.com']],
  ['tiktok', ['tiktok.com']],
  ['youtube', ['youtube.com', 'youtu.be']],
  ['pinterest', ['pinterest.']],
]

function deDondeLlego() {
  // Si el link traía ?utm_source=… eso manda: es lo que la marca escribió a
  // propósito al armar la campaña, más confiable que adivinar por el referente.
  const utm = new URLSearchParams(location.search).get('utm_source')
  if (utm) return { origen: utm.toLowerCase().slice(0, 40), referente: null }

  const referente = document.referrer
  if (!referente) return { origen: 'directo', referente: null }

  let dominio
  try {
    dominio = new URL(referente).hostname.toLowerCase()
  } catch {
    return { origen: 'otro', referente: null }
  }

  // Volver a la misma tienda desde la misma tienda no es una llegada nueva.
  if (dominio === location.hostname) return { origen: 'directo', referente: null }

  for (const [nombre, dominios] of ORIGENES) {
    if (dominios.some((d) => dominio.includes(d))) return { origen: nombre, referente: dominio }
  }

  // Solo el dominio, nunca la dirección completa: esa puede llevar datos de la
  // persona metidos en la URL.
  return { origen: 'otro', referente: dominio }
}

// --- Con qué aparato ---------------------------------------------------------

function conQueAparato() {
  // `pointer: coarse` es "se maneja con el dedo". Es más confiable que leer el
  // nombre del navegador, que cualquiera puede disfrazar.
  const dedo = window.matchMedia?.('(pointer: coarse)')?.matches ?? false
  const ancho = window.innerWidth

  if (dedo && ancho < 768) return 'celular'
  if (dedo) return 'tablet'
  return 'compu'
}

// --- Cuánto miró cada sección ------------------------------------------------

// Se le suma un segundo por vez a la sección más visible en ese momento, y solo
// a esa. Si se le sumara a todas las que se ven a la vez, una pantalla grande
// que muestra tres secciones juntas daría el triple de tiempo del que pasó.
//
// El reloj se frena cuando la pestaña queda en segundo plano, si no una pestaña
// olvidada abierta toda la noche figuraría como ocho horas mirando Contacto.
function medirSecciones(alSumar) {
  const visibles = new Map()

  const observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        const id = e.target.id
        if (!id) continue
        if (e.isIntersecting) visibles.set(id, e.intersectionRatio)
        else visibles.delete(id)
      }
    },
    // Varios umbrales para saber no solo si se ve, sino cuánto se ve.
    { threshold: [0.1, 0.25, 0.5, 0.75, 1] },
  )

  for (const seccion of document.querySelectorAll('section[id], [data-seccion]')) {
    observador.observe(seccion)
  }

  const reloj = setInterval(() => {
    if (document.hidden || visibles.size === 0) return

    let ganadora = null
    let mayor = -1
    for (const [id, ratio] of visibles) {
      if (ratio > mayor) {
        mayor = ratio
        ganadora = id
      }
    }

    if (ganadora) alSumar(ganadora)
  }, TIC)

  return () => {
    observador.disconnect()
    clearInterval(reloj)
  }
}

// --- Envío -------------------------------------------------------------------

// sendBeacon está hecho justo para esto: el navegador se compromete a mandarlo
// aunque la pestaña se esté cerrando. Un fetch normal en ese momento se cancela.
function mandar(datos, definitivo) {
  const cuerpo = JSON.stringify(datos)

  try {
    if (definitivo && navigator.sendBeacon) {
      navigator.sendBeacon(RUTA, new Blob([cuerpo], { type: 'application/json' }))
      return
    }

    fetch(RUTA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Sin red, sin función de servidor, o con un bloqueador de por medio: no se
    // mide y listo.
  }
}

// --- El medidor --------------------------------------------------------------

let andando = false

export function iniciarAnalitica() {
  // Se llama desde un efecto de React, que en desarrollo corre dos veces.
  if (andando) return () => {}

  try {
    // Quien pidió no ser rastreado, no se rastrea. Cuesta una línea.
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return () => {}

    // El panel es la marca mirándose a sí misma.
    if (location.pathname.includes('/admin')) return () => {}

    if (!('IntersectionObserver' in window) || !crypto?.randomUUID) return () => {}

    // Un id por pestaña: recargar la página no cuenta como una visita nueva, y
    // al cerrarla se olvida. Es lo más corto que sirve para medir una visita.
    const CLAVE = 'cultura-cute:visita'
    let id = sessionStorage.getItem(CLAVE)
    const primeraVez = !id
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(CLAVE, id)
    }

    andando = true

    const { origen, referente } = deDondeLlego()
    const dispositivo = conQueAparato()
    const secciones = new Map()
    let segundos = 0

    const base = { id, dispositivo, origen, referente }

    const armar = () => ({
      ...base,
      segundos,
      secciones: [...secciones].map(([seccion, s]) => ({ seccion, segundos: s })),
    })

    // Aviso de entrada: así la visita queda contada aunque la persona cierre de
    // golpe y el aviso de salida no llegue nunca.
    if (primeraVez) mandar(armar(), false)

    const cortarMedicion = medirSecciones((seccion) => {
      segundos += 1
      secciones.set(seccion, (secciones.get(seccion) ?? 0) + 1)
    })

    // `pagehide` y no `unload`: es el que los navegadores de celular disparan de
    // verdad cuando alguien cambia de app. Con `unload` se perdían casi todas
    // las visitas desde el teléfono, que son la mayoría.
    // Se manda cada vez que hay algo nuevo que contar, y no una sola vez: si
    // alguien se va a otra app y vuelve a seguir mirando, ese rato también
    // cuenta. La base se queda siempre con el tiempo mayor, así que reenviar no
    // duplica nada (ver el `greatest` de registrar_visita).
    let ultimoEnviado = 0
    const despedir = () => {
      if (segundos <= ultimoEnviado) return
      ultimoEnviado = segundos
      mandar(armar(), true)
    }

    const alOcultarse = () => {
      if (document.visibilityState === 'hidden') despedir()
    }

    window.addEventListener('pagehide', despedir)
    document.addEventListener('visibilitychange', alOcultarse)

    return () => {
      cortarMedicion()
      window.removeEventListener('pagehide', despedir)
      document.removeEventListener('visibilitychange', alOcultarse)
      andando = false
    }
  } catch {
    return () => {}
  }
}
