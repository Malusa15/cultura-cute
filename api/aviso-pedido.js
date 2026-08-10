// Manda el mail cuando entra un pedido del carrito.
//
// La tienda llama acá con el id del pedido apenas lo registra. Esta función lo
// lee de Supabase y arma el correo. Vive del lado del servidor porque la clave
// de Resend no puede viajar en el JavaScript del sitio: cualquiera la vería.
//
// Nunca corta la compra: si falla el mail, la clienta no se entera de nada y su
// pedido igual quedó guardado. Por eso todo contesta 204 y los problemas van al
// log de Vercel.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

// La pone la integración de Resend al instalarse.
const RESEND_KEY = process.env.RESEND_API_KEY

const PARA = process.env.AVISO_MAIL_A

// El dominio verificado lo deja la integración de Resend al instalarse, y como
// el DNS de culturacute.com.ar vive en Vercel, los registros que hacen falta
// (SPF y DKIM) se agregaron solos. Por eso el mail sale de la marca y no de una
// dirección prestada: si saliera de resend.dev, Gmail lo mandaría a Spam más
// seguido y contestar no serviría de nada.
//
// El respaldo es la dirección que Resend presta sin configurar nada, que solo
// puede escribirle al dueño de la cuenta — o sea, a Malena. Sirve si algún día
// el dominio deja de estar verificado.
const DOMINIO = process.env.RESEND_EMAIL_DOMAIN
const DESDE =
  process.env.AVISO_MAIL_DESDE ??
  (DOMINIO ? `Cultura.Cute <pedidos@${DOMINIO}>` : 'Cultura.Cute <onboarding@resend.dev>')

const PANEL = 'https://culturacute.com.ar/admin'

const pesos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const plata = (n) => `$${pesos.format(Number(n) || 0)}`

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )
}

// Correo en los colores de la marca. Las tablas y los estilos en línea son
// feos, pero es lo único que Gmail y Outlook pintan igual.
function armarMail(v) {
  const filas = (v.items ?? [])
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e8dfc0">
          ${escapar(i.nombre)}<br>
          <span style="color:#8a8578;font-size:13px">Talle ${escapar(i.talle)} · x${Number(i.cantidad)}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e8dfc0;text-align:right;white-space:nowrap">
          ${plata(i.precio_unitario * i.cantidad)}
        </td>
      </tr>`,
    )
    .join('')

  const contacto = v.cliente_contacto
    ? `<p style="margin:4px 0 0;color:#8a8578;font-size:14px">${escapar(v.cliente_contacto)}</p>`
    : ''

  return `
  <div style="background:#fffce8;padding:28px;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a">
    <div style="max-width:520px;margin:0 auto">
      <p style="margin:0 0 4px;letter-spacing:.14em;text-transform:uppercase;font-size:12px;color:#a9170b">
        Cultura.Cute
      </p>
      <h1 style="margin:0 0 20px;font-size:26px;color:#a9170b">Entró el pedido #${Number(v.numero)}</h1>

      <p style="margin:0;font-size:17px;font-weight:600">${escapar(v.cliente_nombre ?? 'Sin nombre')}</p>
      ${contacto}

      <table style="width:100%;border-collapse:collapse;margin:22px 0;font-size:15px">${filas}</table>

      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="background:#a9170b;color:#fffce8;padding:12px 16px;font-size:18px;font-weight:700">Total</td>
          <td style="background:#a9170b;color:#fffce8;padding:12px 16px;font-size:18px;font-weight:700;text-align:right">
            ${plata(v.total)}
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 0;font-size:14px">
        <a href="${PANEL}" style="color:#a9170b">Abrir el panel para confirmarlo</a>
      </p>
      <p style="margin:14px 0 0;color:#8a8578;font-size:13px">
        El pedido entró como <strong>pendiente</strong>. Al pasarlo a Confirmada se descuenta el stock.
      </p>
    </div>
  </div>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Solo POST' })
  }

  try {
    const cuerpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}
    if (!cuerpo.venta_id) return res.status(400).json({ error: 'Falta el id de la venta' })

    if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(204).end()

    if (!RESEND_KEY || !PARA) {
      // Todavía no está conectado el correo. No es un error: el pedido ya quedó
      // guardado y se ve en el panel igual.
      console.warn('Aviso de pedido sin mandar: falta RESEND_API_KEY o AVISO_MAIL_A')
      return res.status(204).end()
    }

    // El resumen viene de una función de Postgres que solo devuelve pedidos de
    // los últimos quince minutos (ver supabase/aviso-pedidos.sql).
    const consulta = await fetch(`${SUPABASE_URL}/rest/v1/rpc/resumen_de_venta`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_id: cuerpo.venta_id }),
    })

    if (!consulta.ok) {
      console.error('No se pudo leer la venta:', consulta.status, await consulta.text())
      return res.status(204).end()
    }

    const venta = await consulta.json()
    if (!venta || !venta.numero) {
      // No existe, o es vieja. Las dos cosas son normales si alguien reintenta.
      return res.status(204).end()
    }

    const envio = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
        // Si el mismo pedido se avisa dos veces —la clienta recarga, se
        // reintenta— Resend manda uno solo.
        'Idempotency-Key': `pedido-${venta.numero}`,
      },
      body: JSON.stringify({
        from: DESDE,
        to: [PARA],
        subject: `Pedido #${venta.numero} — ${venta.cliente_nombre ?? 'Sin nombre'} — ${plata(venta.total)}`,
        html: armarMail(venta),
        // Contestar el mail le escribe a la clienta, si dejó un mail.
        reply_to: /@/.test(venta.cliente_contacto ?? '') ? venta.cliente_contacto : undefined,
      }),
    })

    if (!envio.ok) {
      console.error('Resend rechazó el mail:', envio.status, await envio.text())
      return res.status(204).end()
    }

    console.log(`Aviso mandado por el pedido #${venta.numero}`)
    return res.status(204).end()
  } catch (e) {
    console.error('Error avisando el pedido:', e)
    return res.status(204).end()
  }
}
