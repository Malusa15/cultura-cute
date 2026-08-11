// Sirve la página de una prenda con sus propios datos en el encabezado.
//
// POR QUÉ NO ALCANZA CON EL JAVASCRIPT DE LA TIENDA
//
// Cuando alguien pega un link en WhatsApp o Instagram, esas apps piden la
// página y leen el encabezado del HTML para armar la tarjetita. **No ejecutan
// JavaScript**: para ellas la tienda es un archivo vacío con el logo de la
// marca. Por eso, sin esto, mandar el link de un corset mostraba la misma
// imagen genérica que mandar el link de la home.
//
// Esta función interviene solo las direcciones /prenda/…: busca la prenda,
// reemplaza el título, la descripción y la imagen del encabezado, y devuelve la
// misma página de siempre. Quien entra desde un navegador no nota ninguna
// diferencia — el JavaScript arranca igual y abre la ficha.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

const SITIO = 'https://culturacute.com.ar'
const IMAGEN_POR_DEFECTO = `${SITIO}/img/marca/preview.jpg`

const pesos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )
}

// Del final de la dirección saca el código de la prenda. La misma regla que
// usa src/lib/prendas.js en el navegador: lo de después del último guión.
function codigoDelLink(slug) {
  const limpio = String(slug ?? '').trim().toLowerCase()
  const ultimo = limpio.slice(limpio.lastIndexOf('-') + 1)
  return /^[a-f0-9]{4,32}$/.test(ultimo) ? ultimo : null
}

async function buscarPrenda(slug) {
  const codigo = codigoDelLink(slug)
  if (!codigo || !SUPABASE_URL || !SUPABASE_KEY) return null

  // Solo las publicadas: una prenda oculta no tiene por qué aparecer en un
  // buscador ni armar una vista previa.
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/productos?select=id,nombre,precio,descripcion,composicion,color,imagenes,activo,categorias(nombre),subcategorias(nombre),talles(talle,stock)&activo=eq.true`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  )
  if (!r.ok) return null

  const productos = await r.json()
  return productos.find((p) => String(p.id).replace(/-/g, '').slice(0, 8).startsWith(codigo)) ?? null
}

// Reemplaza el contenido de una meta que ya está en el HTML, o la agrega si no
// estaba. Se toca el archivo que ya existe en vez de armar uno nuevo para no
// tener dos plantillas que se puedan ir desincronizando.
function ponerMeta(html, atributo, clave, valor) {
  const patron = new RegExp(`(<meta\\s+${atributo}="${clave}"\\s+content=")[^"]*(")`, 'i')
  if (patron.test(html)) return html.replace(patron, `$1${escapar(valor)}$2`)
  return html.replace('</head>', `  <meta ${atributo}="${clave}" content="${escapar(valor)}" />\n</head>`)
}

function armarHtml(base, prenda) {
  const fotos = Array.isArray(prenda.imagenes) ? prenda.imagenes : []
  const foto = fotos[0]
  const imagen = foto
    ? foto.startsWith('http')
      ? foto
      : `${SITIO}${foto.startsWith('/') ? '' : '/'}${foto}`
    : IMAGEN_POR_DEFECTO

  const stock = (prenda.talles ?? []).reduce((s, t) => s + (t.stock ?? 0), 0)
  const talles = (prenda.talles ?? []).filter((t) => t.stock > 0).map((t) => t.talle)

  const titulo = `${prenda.nombre} — Cultura.Cute`
  const partes = [
    `$${pesos.format(prenda.precio)}`,
    prenda.subcategorias?.nombre,
    talles.length ? `Talles ${talles.join(', ')}` : 'Sin stock por ahora',
    prenda.composicion,
  ].filter(Boolean)
  const descripcion = `${partes.join(' · ')}. ${prenda.descripcion ?? ''}`.trim().slice(0, 300)

  // La dirección canónica se arma acá y no se copia la que pidió el visitante:
  // si alguien inventa el texto del link —el código es lo único que cuenta— la
  // buena sigue siendo una sola y Google no indexa la misma prenda dos veces.
  const nombreEnUrl = String(prenda.nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const url = `${SITIO}/prenda/${nombreEnUrl}-${String(prenda.id).replace(/-/g, '').slice(0, 8)}`

  let html = base
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapar(titulo)}</title>`)
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*(")/i,
    `$1${escapar(url)}$2`,
  )
  html = ponerMeta(html, 'name', 'description', descripcion)
  html = ponerMeta(html, 'property', 'og:title', titulo)
  html = ponerMeta(html, 'property', 'og:description', descripcion)
  html = ponerMeta(html, 'property', 'og:url', url)
  html = ponerMeta(html, 'property', 'og:image', imagen)
  html = ponerMeta(html, 'property', 'og:image:alt', prenda.nombre)
  html = ponerMeta(html, 'property', 'og:type', 'product')
  html = ponerMeta(html, 'name', 'twitter:title', titulo)
  html = ponerMeta(html, 'name', 'twitter:description', descripcion)
  html = ponerMeta(html, 'name', 'twitter:image', imagen)

  // La foto de una prenda es vertical, así que la tarjeta grande y ancha le
  // recortaría media prenda. El formato chico la muestra entera al costado.
  html = ponerMeta(html, 'name', 'twitter:card', 'summary')

  // Esto es lo que le permite a Google mostrar el precio y si hay stock
  // directamente en los resultados de búsqueda.
  const ficha = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: prenda.nombre,
    image: [imagen],
    description: prenda.descripcion ?? descripcion,
    brand: { '@type': 'Brand', name: 'Cultura.Cute' },
    category: prenda.categorias?.nombre,
    color: prenda.color ?? undefined,
    material: prenda.composicion ?? undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'ARS',
      price: prenda.precio,
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  }

  return html.replace(
    '</head>',
    `  <script type="application/ld+json">${JSON.stringify(ficha).replace(/</g, '\\u003c')}</script>\n</head>`,
  )
}

export default async function handler(req, res) {
  const slug = req.query?.slug ?? ''

  // La plantilla es el index.html de siempre, pedido al propio sitio. Se lee de
  // ahí y no se guarda una copia acá para que no haya dos versiones del
  // encabezado que se puedan ir separando con el tiempo.
  let base = ''
  try {
    const r = await fetch(`${SITIO}/index.html`)
    base = await r.text()
  } catch (e) {
    console.error('No se pudo leer la plantilla:', e)
  }

  try {
    const prenda = base ? await buscarPrenda(slug) : null

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    // Diez minutos en la cache de Vercel, y mientras se renueva sigue sirviendo
    // la anterior: nadie espera a que se rearme la página.
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')

    if (!prenda) {
      // Prenda borrada, oculta o link inventado. Se sirve la página de siempre
      // —el JavaScript de la tienda se encarga de llevar a quien entró a la
      // tienda— pero con código 404, para que Google no se guarde en su índice
      // una prenda que ya no existe.
      return res.status(base ? 404 : 500).send(base || 'No se pudo cargar la página')
    }

    return res.status(200).send(armarHtml(base, prenda))
  } catch (e) {
    console.error('Error armando la página de la prenda:', e)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.status(200).send(base || '')
  }
}
