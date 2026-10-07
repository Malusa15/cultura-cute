// Taxonomía del catálogo: es la lista canónica de opciones de filtro.
//
// A diferencia del resto de los datos, esto NO se deriva de los productos
// cargados. Si saliera de ellos, una categoría sin prendas (por ejemplo
// "Hombre" o "Accesorios") desaparecería del filtro y parecería que no existe.
// Declarándola acá, la opción se muestra siempre; la tienda la deshabilita
// mientras no haya nada que mostrar y se activa sola al cargar la primera prenda.

export const GENEROS = ['Mujer', 'Hombre']

export const CATEGORIAS = [
  'Partes de arriba',
  'Partes de abajo',
  'Abrigos',
  'Conjuntos',
  'Accesorios',
  'Calzado',
  'Cuties',
]

// "Cuties" son los pedidos especiales / hechos a medida. Se aclara en la tienda
// porque el nombre solo no lo explica.
export const DESCRIPCIONES_CATEGORIA = {
  Cuties: 'Pedidos especiales',
}

// Qué subcategorías cuelgan de cada categoría. El filtro de subcategoría recién
// aparece cuando hay una categoría elegida: mostrarlas todas juntas serían más
// de veinte chips sin contexto.
export const SUBCATEGORIAS = {
  'Partes de arriba': ['Tops', 'Musculosas', 'Blusas', 'Corsets', 'Remeras'],
  'Partes de abajo': ['Pantalones', 'Polleras', 'Shorts'],
  Abrigos: ['Camperas', 'Tapados', 'Chalecos'],
  Conjuntos: ['Dos piezas', 'Vestidos', 'Enteritos'],
  Accesorios: ['Cinturones', 'Bolsos', 'Joyería'],
  Calzado: ['Sandalias', 'Tacos', 'Botas', 'Botinetas', 'Zapatillas', 'Chatitas'],
  Cuties: ['A medida', 'Personalización'],
}

// Telas. "Jean" va acá y no como subcategoría de Partes de abajo: tenerlo en los
// dos lados sería el mismo filtro dos veces. Un jean se encuentra combinando
// "Partes de abajo" + "Jean", y así el filtro también sirve para una campera de jean.
export const MATERIALES = [
  'Jean',
  'Piel',
  'Cuero/Cuerina',
  'Encaje',
  'Satén',
  'Punto',
  'Algodón',
  'Lentejuelas',
]

export const ESTILOS = ['Y2K', 'Gótico', 'Vintage', 'Fiesta', 'Streetwear']

// Orden de talles por convención, no alfabético.
export const ORDEN_TALLES = ['XS', 'S', 'M', 'L', 'XL', 'Único']

// El calzado se numera, no se talla con letras. Son los números que se usan en
// Argentina; el campo del talle igual es libre, así que se puede escribir uno
// que no esté en la lista.
export const TALLES_CALZADO = ['34', '35', '36', '37', '38', '39', '40', '41']

// Qué talles sugerir según lo que se esté cargando. El formulario del panel usa
// esto para no ofrecerle "XS" a un par de sandalias.
export function tallesSugeridos(categoria) {
  return categoria === 'Calzado' ? TALLES_CALZADO : ORDEN_TALLES
}

// Ordena talles mezclando los dos sistemas. Hace falta en el filtro de la
// tienda, donde conviven la ropa y el calzado: ordenando solo por ORDEN_TALLES,
// los números quedaban todos en -1 y salían en el orden en que se hubieran
// cargado (38, 35, 41). Las letras van primero y los números después, cada grupo
// en su propio orden.
export function compararTalles(a, b) {
  const numA = Number(a)
  const numB = Number(b)
  const esNumA = Number.isFinite(numA)
  const esNumB = Number.isFinite(numB)

  if (esNumA && esNumB) return numA - numB
  if (esNumA !== esNumB) return esNumA ? 1 : -1
  return ORDEN_TALLES.indexOf(a) - ORDEN_TALLES.indexOf(b)
}

export function subcategoriasDe(categorias) {
  return categorias.flatMap((categoria) => SUBCATEGORIAS[categoria] ?? [])
}
