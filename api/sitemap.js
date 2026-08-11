// El mapa del sitio: la lista de todas las direcciones, para que Google sepa
// qué hay sin tener que descubrirlo a fuerza de seguir links.
//
// Se arma en el momento y no es un archivo fijo porque el catálogo cambia desde
// el panel: una prenda nueva aparece acá sola, sin volver a publicar el sitio.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

const SITIO = 'https://culturacute.com.ar'

function enUrl(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c],
  )
}

export default async function handler(req, res) {
  const direcciones = [{ url: `${SITIO}/`, prioridad: '1.0', cambia: 'weekly' }]

  try {
    if (SUPABASE_URL && SUPABASE_KEY) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?select=id,nombre,actualizado_en&activo=eq.true&order=orden`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      )

      if (r.ok) {
        for (const p of await r.json()) {
          direcciones.push({
            url: `${SITIO}/prenda/${enUrl(p.nombre)}-${String(p.id).replace(/-/g, '').slice(0, 8)}`,
            prioridad: '0.8',
            cambia: 'weekly',
            // Le dice a Google si vale la pena volver a mirarla.
            modificado: p.actualizado_en ? String(p.actualizado_en).slice(0, 10) : null,
          })
        }
      }
    }
  } catch (e) {
    // Sin catálogo el mapa igual sale, aunque sea con la home: es mejor que un
    // error, que Google interpreta como que el sitio está roto.
    console.error('No se pudo leer el catálogo para el mapa del sitio:', e)
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${direcciones
  .map(
    (d) => `  <url>
    <loc>${escapar(d.url)}</loc>${d.modificado ? `\n    <lastmod>${d.modificado}</lastmod>` : ''}
    <changefreq>${d.cambia}</changefreq>
    <priority>${d.prioridad}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  return res.status(200).send(xml)
}
