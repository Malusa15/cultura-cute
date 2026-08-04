import { asset } from '../lib/rutas.js'

// Catalogo de ejemplo. Las fotos salen del portfolio 2026; los nombres, precios y
// medidas son inventados y hay que reemplazarlos por los reales.
//
// El stock va POR TALLE, no por producto: si S esta en 0 no se puede agregar al
// carrito aunque M tenga unidades. `activo: false` oculta la prenda de la tienda
// sin borrarla (es el campo que despues maneja el panel admin).

const CATALOGO_CRUDO = [
  {
    id: 'cc-001',
    nombre: 'Top satinado rosa',
    precio: 42000,
    moneda: 'ARS',
    categoria: 'Tops',
    subcategoria: 'Corsets',
    descripcion:
      'Bustier de satén con escote corazón y costuras que marcan el busto. Cierra con cierre ' +
      'invisible atrás y se lleva tanto solo como debajo de una campera.',
    talles: [
      { talle: 'S', stock: 2 },
      { talle: 'M', stock: 4 },
      { talle: 'L', stock: 1 },
    ],
    medidas: { largo: '48 cm', busto: '82-92 cm', cintura: '64-74 cm' },
    materiales: 'Satén de poliéster, forrería de algodón',
    color: 'Rosa',
    estilo: ['Y2K', 'Fiesta'],
    imagenes: ['/img/productos/top-rosa.png'],
    activo: true,
  },
  {
    id: 'cc-002',
    nombre: 'Top estampado oriental',
    precio: 46000,
    moneda: 'ARS',
    categoria: 'Tops',
    subcategoria: 'Blusas',
    descripcion:
      'Blusa sin mangas en satén estampado con dragones y fénix bordados, cuello mao y botones ' +
      'de alamar. Pieza única confeccionada con un corte de tela vintage: no se repite.',
    talles: [
      { talle: 'Único', stock: 1 },
    ],
    medidas: { largo: '52 cm', busto: '86-96 cm' },
    materiales: 'Rayón estampado, apliques bordados a mano',
    color: 'Crema',
    estilo: ['Y2K', 'Vintage'],
    imagenes: ['/img/productos/top-oriental.png'],
    activo: true,
  },
  {
    id: 'cc-003',
    nombre: 'Top gris texturado',
    precio: 39000,
    moneda: 'ARS',
    categoria: 'Tops',
    subcategoria: 'Musculosas',
    descripcion:
      'Top corto tipo halter, con tiras al cuello y hebilla de corazón con strass al centro. ' +
      'Punto texturado con caída, elastizado en la espalda.',
    talles: [
      { talle: 'S', stock: 3 },
      { talle: 'M', stock: 2 },
      { talle: 'L', stock: 0 },
    ],
    medidas: { largo: '32 cm', busto: '78-88 cm' },
    materiales: 'Punto texturado elastizado, herrería metálica',
    color: 'Gris',
    estilo: ['Y2K', 'Streetwear'],
    imagenes: ['/img/productos/top-gris.png'],
    activo: true,
  },
  {
    id: 'cc-004',
    nombre: 'Musculosa rayas naranja',
    precio: 35000,
    moneda: 'ARS',
    categoria: 'Tops',
    subcategoria: 'Musculosas',
    descripcion:
      'Musculosa de rayas horizontales con lettering estampado al frente. Corte ajustado ' +
      'y largo corto, pensada para llevar con tiro bajo.',
    talles: [
      { talle: 'S', stock: 4 },
      { talle: 'M', stock: 5 },
      { talle: 'L', stock: 2 },
    ],
    medidas: { largo: '38 cm', busto: '76-90 cm' },
    materiales: 'Algodón elastizado',
    color: 'Naranja',
    estilo: ['Y2K', 'Streetwear'],
    imagenes: ['/img/productos/musculosa-rayas.png'],
    activo: true,
  },
  {
    id: 'cc-005',
    nombre: 'Pantalón flare naranja',
    precio: 58000,
    moneda: 'ARS',
    categoria: 'Pantalones',
    subcategoria: 'Flare',
    descripcion:
      'Pantalón de tiro medio con pierna acampanada desde la rodilla. Cae largo sobre el ' +
      'calzado y estiliza la silueta.',
    talles: [
      { talle: 'S', stock: 1 },
      { talle: 'M', stock: 3 },
      { talle: 'L', stock: 2 },
    ],
    medidas: { largo: '104 cm', cintura: '66-76 cm', cadera: '92-102 cm' },
    materiales: 'Símil cuero elastizado, forrería de tricot',
    color: 'Naranja',
    estilo: ['Y2K', 'Vintage'],
    imagenes: ['/img/productos/pantalon-naranja.png'],
    activo: true,
  },
  {
    id: 'cc-006',
    nombre: 'Blusa encaje victoriana',
    precio: 62000,
    moneda: 'ARS',
    categoria: 'Tops',
    subcategoria: 'Blusas',
    descripcion:
      'Blusa de encaje con cuello alto de guipur y escote profundo en V. Confección artesanal, ' +
      'cada cuello se arma y se cose por separado.',
    talles: [
      { talle: 'S', stock: 2 },
      { talle: 'M', stock: 2 },
    ],
    medidas: { largo: '56 cm', busto: '84-94 cm', cintura: '68-78 cm' },
    materiales: 'Encaje de algodón, guipur, botones de nácar',
    color: 'Blanco',
    estilo: ['Gótico', 'Vintage'],
    imagenes: ['/img/productos/blusa-encaje.png'],
    activo: true,
  },
  {
    id: 'cc-007',
    nombre: 'Corset azul satinado',
    precio: 54000,
    moneda: 'ARS',
    categoria: 'Tops',
    subcategoria: 'Corsets',
    descripcion:
      'Corset con ballenas y cierre metálico al frente. Estructura firme que marca la cintura, ' +
      'en satén con brillo suave.',
    talles: [
      { talle: 'S', stock: 1 },
      { talle: 'M', stock: 2 },
      { talle: 'L', stock: 1 },
    ],
    medidas: { largo: '36 cm', busto: '80-90 cm', cintura: '62-72 cm' },
    materiales: 'Satén, ballenas de acero, cierre metálico',
    color: 'Azul',
    estilo: ['Gótico', 'Fiesta'],
    imagenes: ['/img/productos/corset-azul.png'],
    activo: true,
  },
  {
    id: 'cc-008',
    nombre: 'Pollera lentejuelas dorada',
    precio: 48000,
    moneda: 'ARS',
    categoria: 'Polleras',
    subcategoria: 'Mini',
    descripcion:
      'Mini de lentejuelas cosidas sobre base elastizada. Tiro bajo y calce ajustado. ' +
      'Es la prenda estrella de la temporada: se hicieron pocas unidades.',
    talles: [
      { talle: 'S', stock: 2 },
      { talle: 'M', stock: 3 },
      { talle: 'L', stock: 0 },
    ],
    medidas: { largo: '34 cm', cintura: '64-74 cm', cadera: '88-98 cm' },
    materiales: 'Lentejuelas doradas, base elastizada, forro de tricot',
    color: 'Dorado',
    estilo: ['Y2K', 'Fiesta'],
    imagenes: [
      '/img/productos/lentejuelas-1.png',
      '/img/productos/lentejuelas-2.png',
      '/img/productos/lentejuelas-3.png',
      '/img/productos/lentejuelas-4.png',
    ],
    activo: true,
  },
  {
    id: 'cc-009',
    nombre: 'Set negro con cadenas',
    precio: 78000,
    moneda: 'ARS',
    categoria: 'Vestidos',
    subcategoria: 'Sets',
    descripcion:
      'Top de satén con breteles cruzados y apliques de cadena, más pantalón al tono. ' +
      'Se vende como set, aunque cada pieza funciona sola.',
    talles: [
      { talle: 'S', stock: 0 },
      { talle: 'M', stock: 0 },
      { talle: 'L', stock: 0 },
    ],
    medidas: { largo: '92 cm', busto: '80-90 cm', cintura: '64-74 cm' },
    materiales: 'Punto negro, herrería metálica, gasa',
    color: 'Negro',
    estilo: ['Gótico', 'Fiesta'],
    imagenes: ['/img/productos/conjunto-negro.png'],
    activo: true,
  },
]

// Las rutas se escriben arriba como "/img/..." para que se lean bien, y acá se les
// agrega el prefijo del deploy una sola vez.
export const PRODUCTOS = CATALOGO_CRUDO.map((producto) => ({
  ...producto,
  imagenes: producto.imagenes.map(asset),
}))

// --- Helpers de catalogo -----------------------------------------------------

export function stockTotal(producto) {
  return producto.talles.reduce((acc, t) => acc + t.stock, 0)
}

export function stockDeTalle(producto, talle) {
  return producto.talles.find((t) => t.talle === talle)?.stock ?? 0
}

export function hayStock(producto) {
  return stockTotal(producto) > 0
}

export function buscarProducto(id) {
  return PRODUCTOS.find((p) => p.id === id)
}

// Solo lo que la tienda publica muestra.
export const CATALOGO = PRODUCTOS.filter((p) => p.activo)

// Las opciones de los filtros se derivan del catalogo, asi no hay que mantener
// dos listas en paralelo cuando se carga un producto nuevo.
const unicos = (valores) => [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es'))

export const CATEGORIAS = unicos(CATALOGO.map((p) => p.categoria))
export const COLORES = unicos(CATALOGO.map((p) => p.color))
export const ESTILOS = unicos(CATALOGO.flatMap((p) => p.estilo))

// Los talles se ordenan por convencion, no alfabeticamente.
const ORDEN_TALLES = ['XS', 'S', 'M', 'L', 'XL', 'Único']
export const TALLES = unicos(CATALOGO.flatMap((p) => p.talles.map((t) => t.talle))).sort(
  (a, b) => ORDEN_TALLES.indexOf(a) - ORDEN_TALLES.indexOf(b),
)

export function subcategoriasDe(categorias) {
  const fuente = categorias.length ? CATALOGO.filter((p) => categorias.includes(p.categoria)) : CATALOGO
  return unicos(fuente.map((p) => p.subcategoria))
}

export const PRECIO_MAXIMO = Math.max(...CATALOGO.map((p) => p.precio))
export const PRECIO_MINIMO = Math.min(...CATALOGO.map((p) => p.precio))
