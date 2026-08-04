// Datos fijos de la marca. Todo lo que se repite en varias secciones vive acá
// para no tener el telefono ni los textos duplicados por el codigo.

export const MARCA = {
  nombre: 'Cultura.Cute',
  tagline: 'piezas únicas',

  // 2235402402 en formato internacional: 54 (Argentina) + 9 (celular) +
  // 223 (Mar del Plata sin el 0) + 5402402 (sin el 15).
  whatsapp: '5492235402402',
  whatsappVisible: '223 540-2402',

  email: 'zoecelinapenaloza@gmail.com',
  instagram: 'cultura.cute',
  instagramUrl: 'https://www.instagram.com/cultura.cute/',
  ciudad: 'Mar del Plata, Argentina',

  // La franja superior del portfolio ("2026 · creative · portfolio · photography")
  eyebrow: ['2026', 'artesanal', 'y2k', 'mar del plata'],

  sobreNosotras:
    'Cultura.Cute nace para quienes entienden la ropa como una forma de expresión. ' +
    'Cada prenda está diseñada para destacar, mezclando referencias Y2K, moda alternativa ' +
    'y una confección artesanal donde ninguna pieza busca pasar desapercibida.',

  vision:
    'Construir un universo creativo donde la moda, el arte y la identidad se encuentren. ' +
    'Que Cultura.Cute trascienda las prendas y se convierta en una comunidad que inspire ' +
    'a expresarse sin seguir moldes ni tendencias pasajeras.',

  mision:
    'Transformar la ropa en una forma de expresión. Diseñar prendas que invitan a sentirse ' +
    'diferente, segura y libre de mostrar quién sos, apostando por la creatividad, ' +
    'el trabajo artesanal y lo limitado.',

  valores: ['Originalidad', 'Calidad', 'Comunidad', 'Autenticidad'],

  // Las dos llevan la marca por igual: mismo rol para ambas, sin jerarquía.
  duenas: [
    { nombre: 'Zoe Celina', rol: 'Dirección creativa, diseño y confección' },
    { nombre: 'Malena Campos', rol: 'Dirección creativa, diseño y confección' },
  ],
}

export const NAVEGACION = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'sobre-nosotras', label: 'Sobre Nosotras' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'tienda', label: 'Tienda' },
  { id: 'contacto', label: 'Contacto' },
]

export const SERVICIOS = [
  {
    id: 'a-medida',
    titulo: 'Prendas a pedido',
    texto:
      'Diseñamos y confeccionamos la prenda que tenés en la cabeza, tomada a tus medidas. ' +
      'Arrancamos con una charla, bocetos y elección de telas.',
    consulta: 'Hola! Quiero consultar por una prenda a medida',
  },
  {
    id: 'piezas-unicas',
    titulo: 'Piezas únicas',
    texto:
      'Series cortas de confección artesanal. Cada pieza se hace de a una, ' +
      'así que cuando se agota difícilmente vuelva igual.',
    consulta: 'Hola! Quiero consultar por las piezas únicas',
  },
  {
    id: 'personalizacion',
    titulo: 'Personalización',
    texto:
      'Intervenimos prendas que ya tenés: apliques, cortes, teñidos y detalles ' +
      'para convertirlas en algo que sea únicamente tuyo.',
    consulta: 'Hola! Quiero personalizar una prenda que ya tengo',
  },
]
