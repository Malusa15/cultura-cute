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

export function subcategoriasDe(categorias) {
  return categorias.flatMap((categoria) => SUBCATEGORIAS[categoria] ?? [])
}
