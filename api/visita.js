import { createHash, randomUUID } from 'node:crypto'

// Recibe las visitas a la tienda y las guarda en Supabase.
//
// POR QUÉ HACE FALTA ESTO Y NO ALCANZA CON EL NAVEGADOR
//
// El país y la ciudad salen de la IP, y la IP el navegador no la conoce: la ve
// el servidor. Vercel la mira por nosotras y agrega los datos ya resueltos como
// cabeceras de la petición (`x-vercel-ip-country`, `x-vercel-ip-city`), así que
// esta función es el único lugar del proyecto donde esa información existe.
//
// Y ES EL ÚNICO LUGAR DONDE PASA LA IP
//
// Acá la IP se usa para dos cosas y se tira: estimar de dónde es la persona y
// armar un código de visitante. Nunca se guarda, ni se manda a Supabase, ni se
// escribe en ningún log. El código de visitante es un hash de IP + navegador +
// la fecha de hoy + una sal: sirve para no contar diez veces a la misma persona
// el mismo día, y como la fecha entra en la mezcla, mañana esa misma persona
// genera un código distinto. No se puede volver del código a la IP ni seguir a
// nadie de un día para el otro.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

// La sal hace que el código de visitante no se pueda reconstruir por fuerza
// bruta probando todas las IPs posibles. Si no está configurada se usa una al
// azar que vive lo que vive la función: peor para contar visitantes distintos,
// pero nunca inseguro.
const SAL = process.env.ANALITICA_SAL ?? randomUUID()

function codigoDeVisitante(ip, navegador, dia) {
  return createHash('sha256').update(`${ip}|${navegador}|${dia}|${SAL}`).digest('hex').slice(0, 32)
}

// Vercel pone la IP real en x-forwarded-for; el primer valor es el cliente y el
// resto son los proxies intermedios.
function ipDe(req) {
  const cabecera = req.headers['x-real-ip'] ?? req.headers['x-forwarded-for'] ?? ''
  return String(cabecera).split(',')[0].trim() || 'sin-ip'
}

// Las cabeceras de Vercel vienen con los espacios escapados (%20).
function limpiar(valor) {
  if (!valor) return null
  try {
    return decodeURIComponent(String(valor)).trim() || null
  } catch {
    return String(valor).trim() || null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Solo POST' })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    // Sin credenciales no hay nada que hacer, pero tampoco es un error del
    // visitante: se contesta 204 para que la tienda no vea fallar nada.
    return res.status(204).end()
  }

  try {
    // sendBeacon manda el cuerpo como texto plano, así que puede no venir ya
    // parseado como cuando el content-type es json.
    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}

    if (!cuerpo.id) return res.status(400).json({ error: 'Falta el id de la visita' })

    const hoy = new Date().toISOString().slice(0, 10)

    const datos = {
      visitante: codigoDeVisitante(ipDe(req), req.headers['user-agent'] ?? '', hoy),
      pais: limpiar(req.headers['x-vercel-ip-country']),
      ciudad: limpiar(req.headers['x-vercel-ip-city']),
      region: limpiar(req.headers['x-vercel-ip-country-region']),
      dispositivo: cuerpo.dispositivo,
      origen: cuerpo.origen,
      referente: cuerpo.referente,
      segundos: cuerpo.segundos,
      secciones: cuerpo.secciones,
    }

    const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/rpc/registrar_visita`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_id: cuerpo.id, p_datos: datos }),
    })

    if (!respuesta.ok) {
      // El texto del error va al log de Vercel, no a la respuesta: quien visita
      // la tienda no tiene por qué enterarse de cómo está armada la base.
      console.error('registrar_visita falló:', respuesta.status, await respuesta.text())
      return res.status(204).end()
    }

    return res.status(204).end()
  } catch (e) {
    console.error('Error registrando la visita:', e)
    // Contar una visita nunca puede romperle la página a nadie.
    return res.status(204).end()
  }
}
