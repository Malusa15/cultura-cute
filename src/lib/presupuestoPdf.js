import { MARCA } from '../data/marca.js'
import { precio } from './formato.js'
import { asset } from './rutas.js'
import {
  MEDIDAS,
  TIPOS_MATERIAL,
  UNIDADES,
  calcular,
  subtotalMaterial,
} from './presupuestos.js'

// Arma el PDF del presupuesto para mandarle a la clienta.
//
// jsPDF se carga con import() dinámico a propósito: pesa bastante y solo hace
// falta acá adentro del panel, así la tienda pública no lo descarga.

// --- Identidad ---------------------------------------------------------------

const ROJO = [169, 23, 11]
const CREMA = [255, 252, 232]
const TINTA = [10, 10, 10]
// El borde del sitio es rojo al 35% sobre crema; acá va el color ya mezclado
// porque las líneas del PDF no tienen transparencia.
const BORDE = [225, 172, 155]

const HOJA = { ancho: 210, alto: 297 }
const MARGEN = 15
const ANCHO = HOJA.ancho - MARGEN * 2

// --- Ayudantes ---------------------------------------------------------------

// El logo es un PNG del repo. Se pasa por canvas para sacarle el data URL que
// pide jsPDF. Si falla (sin conexión, archivo movido), el PDF sale igual con el
// nombre escrito a mano: es preferible eso a no poder mandar el presupuesto.
function cargarLogo() {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        resolve({ dataUrl: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = asset('/img/marca/wordmark.png')
  })
}

const dia = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

function fechaLarga(valor) {
  const d = valor ? new Date(valor) : new Date()
  return Number.isNaN(d.getTime()) ? dia.format(new Date()) : dia.format(d)
}

// --- Dibujo ------------------------------------------------------------------

// Cada página arranca con el fondo crema de la marca y el pie de contacto.
function pintarHoja(doc) {
  doc.setFillColor(...CREMA)
  doc.rect(0, 0, HOJA.ancho, HOJA.alto, 'F')

  const pie = `${MARCA.whatsappVisible}  ·  @${MARCA.instagram}  ·  ${MARCA.email}  ·  ${MARCA.ciudad}`
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...ROJO)
  doc.text(pie, HOJA.ancho / 2, HOJA.alto - 10, { align: 'center' })

  doc.setDrawColor(...BORDE)
  doc.setLineWidth(0.3)
  doc.line(MARGEN, HOJA.alto - 15, HOJA.ancho - MARGEN, HOJA.alto - 15)
}

// Devuelve la y donde seguir escribiendo, saltando de página si lo que viene
// (`alto`) no entra en lo que queda.
function espacio(doc, y, alto) {
  // El pie arranca en alto - 15, así que se puede escribir hasta alto - 20 sin
  // pisarlo.
  if (y + alto <= HOJA.alto - 20) return y
  doc.addPage()
  pintarHoja(doc)
  return MARGEN + 5
}

// `alto` es lo que ocupa el bloque que viene abajo. Se pide junto con el título
// para que el título no quede solo al pie de una página y su contenido en la
// siguiente.
function titulo(doc, y, texto, alto = 20) {
  const arriba = espacio(doc, y, alto)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...ROJO)
  doc.text(texto.toUpperCase(), MARGEN, arriba, { charSpace: 0.6 })
  doc.setDrawColor(...BORDE)
  doc.setLineWidth(0.3)
  doc.line(MARGEN, arriba + 2, HOJA.ancho - MARGEN, arriba + 2)
  return arriba + 6.5
}

// Par etiqueta/valor en columna: un rótulo chico arriba y el dato abajo.
function dato(doc, x, y, ancho, etiqueta, valor) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...ROJO)
  doc.text(etiqueta.toUpperCase(), x, y, { charSpace: 0.4 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TINTA)
  const lineas = doc.splitTextToSize(String(valor), ancho)
  doc.text(lineas, x, y + 4)

  return 4 + lineas.length * 4
}

// Grilla de datos en `columnas` columnas. Devuelve la y de abajo de todo.
function grilla(doc, y, columnas, items) {
  const ancho = ANCHO / columnas
  let fila = y
  let alto = 0

  items.forEach((item, i) => {
    if (i % columnas === 0 && i > 0) {
      fila += alto + 2
      alto = 0
    }
    if (i % columnas === 0) fila = espacio(doc, fila, 11)
    const usado = dato(doc, MARGEN + (i % columnas) * ancho, fila, ancho - 6, item.etiqueta, item.valor)
    alto = Math.max(alto, usado)
  })

  return fila + alto + 3
}

// Un grupo de medidas en un renglón: el nombre del grupo en la izquierda y los
// valores corridos al lado, separados por puntos.
//
// Antes cada medida era una ficha de dos renglones en una grilla de cuatro
// columnas, y la ficha completa se comía media hoja. Así entra en dos o tres
// renglones por grupo. El «cm» no se repite: ya está en el título de la sección.

// La columna del nombre del grupo se mide, no se estima: escrita a ojo, un
// nombre largo como «Largos de la prenda» se montaba encima de los valores.
function anchoDeGrupos(doc, grupos) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  const mayor = Math.max(
    // getTextWidth no cuenta el charSpace, así que se suma aparte.
    ...grupos.map((g) => doc.getTextWidth(g.grupo.toUpperCase()) + g.grupo.length * 0.3),
  )
  return Math.max(26, mayor + 4)
}

function grupoDeMedidas(doc, y, grupo, medidas, gutter) {
  const texto = grupo.campos.map((c) => `${c.label} ${medidas[c.id]}`).join('   ·   ')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const lineas = doc.splitTextToSize(texto, ANCHO - gutter)
  const fila = espacio(doc, y, lineas.length * 4.1 + 2)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...ROJO)
  doc.text(grupo.grupo.toUpperCase(), MARGEN, fila, { charSpace: 0.3 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...TINTA)
  doc.text(lineas, MARGEN + gutter, fila)

  return fila + lineas.length * 4.1 + 1.5
}

const COLUMNAS_MATERIAL = [
  { titulo: 'Tipo', ancho: 26 },
  { titulo: 'Detalle', ancho: 70 },
  { titulo: 'Cant.', ancho: 20, derecha: true },
  { titulo: 'Precio unit.', ancho: 32, derecha: true },
  { titulo: 'Subtotal', ancho: 32, derecha: true },
]

function encabezadoTabla(doc, y) {
  doc.setFillColor(...ROJO)
  doc.rect(MARGEN, y - 4, ANCHO, 6.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...CREMA)

  let x = MARGEN + 2
  COLUMNAS_MATERIAL.forEach((col) => {
    const dentro = col.ancho - 4
    doc.text(col.titulo.toUpperCase(), col.derecha ? x + dentro : x, y, {
      align: col.derecha ? 'right' : 'left',
      charSpace: 0.3,
    })
    x += col.ancho
  })

  return y + 6.5
}

function tablaMateriales(doc, y, materiales) {
  let fila = encabezadoTabla(doc, y)

  materiales.forEach((material) => {
    const antes = fila
    fila = espacio(doc, fila, 7)
    // Si hubo salto de página, la tabla vuelve a encabezarse: una lista de
    // números sin títulos arriba no se entiende.
    if (fila !== antes) fila = encabezadoTabla(doc, fila)

    const celdas = [
      TIPOS_MATERIAL[material.tipo] ?? material.tipo,
      material.detalle,
      `${Number(material.cantidad)} ${material.unidad}`,
      precio(material.precio_unitario),
      precio(subtotalMaterial(material)),
    ]

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...TINTA)

    let x = MARGEN + 2
    let alto = 4.6
    celdas.forEach((texto, i) => {
      const col = COLUMNAS_MATERIAL[i]
      const dentro = col.ancho - 4
      const lineas = doc.splitTextToSize(String(texto), dentro)
      doc.text(lineas, col.derecha ? x + dentro : x, fila, { align: col.derecha ? 'right' : 'left' })
      alto = Math.max(alto, lineas.length * 4 + 0.8)
      x += col.ancho
    })

    doc.setDrawColor(...BORDE)
    doc.setLineWidth(0.2)
    doc.line(MARGEN, fila + alto - 2.4, HOJA.ancho - MARGEN, fila + alto - 2.4)
    fila += alto
  })

  return fila + 1.5
}

// Bloque de totales, alineado a la derecha como en cualquier factura.
function totales(doc, y, cuenta, presupuesto) {
  const izquierda = HOJA.ancho - MARGEN - 90
  let fila = espacio(doc, y, 48)

  const renglones = [
    ['Materiales', precio(cuenta.materiales)],
    [
      `Mano de obra (${Number(presupuesto.horas_trabajo)} h × ${precio(presupuesto.valor_hora)})`,
      precio(cuenta.manoObra),
    ],
  ]

  if (cuenta.ganancia > 0) renglones.push([`Margen (${Number(presupuesto.margen)}%)`, precio(cuenta.ganancia)])
  // Guion común y no el signo menos «−»: las fuentes que trae jsPDF no lo
  // tienen y sale una comilla en su lugar.
  if (cuenta.descuento > 0) renglones.push(['Descuento', `- ${precio(cuenta.descuento)}`])

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TINTA)

  renglones.forEach(([etiqueta, valor]) => {
    doc.text(etiqueta, izquierda, fila)
    doc.text(valor, HOJA.ancho - MARGEN, fila, { align: 'right' })
    fila += 5
  })

  fila += 1.5
  doc.setFillColor(...ROJO)
  doc.rect(izquierda - 4, fila - 4.8, 94, 11.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...CREMA)
  doc.text('TOTAL', izquierda, fila + 2.5, { charSpace: 0.6 })
  doc.text(precio(cuenta.total), HOJA.ancho - MARGEN - 2, fila + 2.5, { align: 'right' })

  fila += 11
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...TINTA)
  doc.text(
    `Seña para arrancar la prenda: ${precio(cuenta.sena)} (50%)`,
    HOJA.ancho - MARGEN,
    fila,
    { align: 'right' },
  )

  return fila + 6
}

// Cuánto va a ocupar el párrafo. Hace falta saberlo ANTES de escribir el
// título, para pedirle el espacio de los dos juntos.
function altoParrafo(doc, texto) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  return doc.splitTextToSize(texto, ANCHO).length * 4.3 + 3
}

function parrafo(doc, y, texto) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const lineas = doc.splitTextToSize(texto, ANCHO)
  const fila = espacio(doc, y, lineas.length * 4.3)
  doc.setTextColor(...TINTA)
  doc.text(lineas, MARGEN, fila)
  return fila + lineas.length * 4.3 + 3
}

// --- Documento ---------------------------------------------------------------

// Devuelve el documento armado. Separado de la descarga para poder mirarlo sin
// bajar el archivo.
export async function armarPresupuestoPdf(presupuesto, materiales) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const cuenta = calcular(presupuesto, materiales)

  pintarHoja(doc)

  // Encabezado: el logo a la izquierda, el número y la fecha a la derecha.
  const logo = await cargarLogo()
  if (logo) {
    const ancho = 46
    doc.addImage(logo.dataUrl, 'PNG', MARGEN, MARGEN, ancho, ancho / logo.ratio)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(19)
    doc.setTextColor(...ROJO)
    doc.text(MARCA.nombre, MARGEN, MARGEN + 10)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...ROJO)
  doc.text('PRESUPUESTO', HOJA.ancho - MARGEN, MARGEN + 6, { align: 'right', charSpace: 1 })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TINTA)
  // Un presupuesto recién armado todavía no tiene número: se numera al guardar.
  const numero = presupuesto.numero ? `N° ${presupuesto.numero}` : 'Sin numerar'
  doc.text(numero, HOJA.ancho - MARGEN, MARGEN + 12, { align: 'right' })
  doc.text(fechaLarga(presupuesto.creado_en), HOJA.ancho - MARGEN, MARGEN + 17, { align: 'right' })

  doc.setDrawColor(...ROJO)
  doc.setLineWidth(0.8)
  doc.line(MARGEN, MARGEN + 23, HOJA.ancho - MARGEN, MARGEN + 23)

  let y = MARGEN + 33

  y = titulo(doc, y, 'Datos', 30)
  y = grilla(doc, y, 3, [
    { etiqueta: 'Clienta', valor: presupuesto.cliente_nombre },
    { etiqueta: 'Contacto', valor: presupuesto.cliente_contacto || '—' },
    { etiqueta: 'Talle', valor: presupuesto.talle || '—' },
    { etiqueta: 'Prenda', valor: presupuesto.prenda },
    {
      etiqueta: 'Entrega estimada',
      valor: presupuesto.fecha_entrega ? fechaLarga(presupuesto.fecha_entrega) : 'A convenir',
    },
    { etiqueta: 'Validez', valor: `${Number(presupuesto.validez_dias)} días` },
  ])

  if (presupuesto.descripcion?.trim()) {
    const texto = presupuesto.descripcion.trim()
    y = titulo(doc, y, 'El diseño', altoParrafo(doc, texto))
    y = parrafo(doc, y, texto)
  }

  // Solo se imprimen las medidas que se tomaron: una hoja llena de guiones no
  // le sirve a nadie.
  const medidas = presupuesto.medidas ?? {}
  const conValor = MEDIDAS.map((grupo) => ({
    ...grupo,
    campos: grupo.campos.filter((c) => String(medidas[c.id] ?? '').trim() !== ''),
  })).filter((grupo) => grupo.campos.length)

  if (conValor.length) {
    y = titulo(doc, y, 'Medidas (cm)', 18)
    const gutter = anchoDeGrupos(doc, conValor)
    conValor.forEach((grupo) => {
      y = grupoDeMedidas(doc, y, grupo, medidas, gutter)
    })
    y += 2
  }

  if (materiales.length) {
    y = titulo(doc, y, 'Materiales', 24)
    y = tablaMateriales(doc, y, materiales)
  }

  // La cuenta entera (renglones + caja del total + seña) mide unos 48 mm: si no
  // entra, arranca en la página siguiente con su título.
  y = titulo(doc, y + 3, 'Cuenta', 53)
  y = totales(doc, y, cuenta, presupuesto)

  if (presupuesto.notas?.trim()) {
    const texto = presupuesto.notas.trim()
    y = titulo(doc, y, 'Observaciones', altoParrafo(doc, texto))
    y = parrafo(doc, y, texto)
  }

  // El alto del aviso se mide en vez de estimarse: con un número fijo y generoso,
  // estas dos líneas se llevaban una hoja entera para ellas solas.
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  const aviso = doc.splitTextToSize(
    `Presupuesto válido por ${Number(presupuesto.validez_dias)} días desde la fecha. ` +
      'Los precios pueden cambiar si cambian los materiales. Cada prenda es única y se ' +
      'confecciona a mano en Mar del Plata.',
    ANCHO,
  )
  y = espacio(doc, y + 2, aviso.length * 3.6)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...ROJO)
  doc.text(aviso, MARGEN, y)

  return doc
}

export async function descargarPresupuestoPdf(presupuesto, materiales) {
  const doc = await armarPresupuestoPdf(presupuesto, materiales)

  // El nombre del archivo va sin tildes ni espacios: viaja por WhatsApp y por
  // mail, donde los acentos a veces se rompen.
  const nombre = presupuesto.cliente_nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const archivo = `Presupuesto-${presupuesto.numero ?? 'sn'}-${nombre || 'CulturaCute'}.pdf`

  // Se baja con un link propio en vez de con doc.save() de jsPDF: save() usa
  // solo el atributo `download`, y los navegadores de celular lo ignoran para
  // los blobs, as\u00ed que ah\u00ed no pasaba nada al tocar el bot\u00f3n. Con `download` M\u00c1S
  // target="_blank", el que puede bajarlo lo baja con el nombre lindo y el que
  // no, al menos lo abre en otra pesta\u00f1a para poder compartirlo.
  const url = URL.createObjectURL(doc.output('blob'))
  const link = document.createElement('a')
  link.href = url
  link.download = archivo
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Liberar el blob enseguida cancelar\u00eda la descarga si todav\u00eda no arranc\u00f3.
  setTimeout(() => URL.revokeObjectURL(url), 60000)

  return archivo
}
