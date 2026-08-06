// Datos fijos de la marca. Todo lo que se repite en varias secciones vive acá
// para no tener el telefono ni los textos duplicados por el codigo.

export const MARCA = {
  nombre: 'Cultura.Cute',
  tagline: 'piezas únicas',

  // 2235402402 en formato internacional: 54 (Argentina) + 9 (celular) +
  // 223 (Mar del Plata sin el 0) + 5402402 (sin el 15).
  whatsapp: '5492235402402',
  whatsappVisible: '223 540-2402',

  email: 'malusacampos15@gmail.com',
  instagram: 'cultura.cute',
  instagramUrl: 'https://www.instagram.com/cultura.cute/',
  ciudad: 'Mar del Plata, Argentina',

  // La franja superior del portfolio ("2026 · creative · portfolio · photography")
  eyebrow: ['2026', 'artesanal', 'mar del plata'],

  sobreNosotras:
    'Cultura.Cute nace para quienes entienden la ropa como una forma de expresión. ' +
    'Cada prenda está diseñada para destacar, mezclando referencias de distintos géneros, ' +
    'épocas y conceptos de moda. Confecciones que no buscan pasar desapercibidas.',

  vision:
    'Construimos este universo creativo donde la moda, el arte y la identidad se encuentran. ' +
    'Cultura.Cute busca trascender las prendas y convertirse en una comunidad que inspire ' +
    'a expresarse sin seguir moldes ni tendencias pasajeras.',

  mision:
    'Transformar la ropa en una forma de expresión es un sueño que hacemos realidad con ' +
    'Cultura.Cute. Diseñando prendas que invitan a sentirse diferente, segura y libre de ' +
    'mostrar quién sos, apostando por el trabajo artesanal y lo limitado.',

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
      'Diseñamos y confeccionamos la prenda que tenés en la cabeza: tomamos las medidas, ' +
      'hacemos los bocetos y seleccionamos las telas. Creando tu pieza única.',
    consulta: 'Hola! Quiero consultar por una prenda a medida',
  },
  {
    id: 'piezas-unicas',
    titulo: 'Piezas únicas',
    texto:
      'Series cortas de confección artesanal. Cada pieza se hace de a una, ' +
      'así que cuando se agota difícilmente volvemos a hacerla igual.',
    consulta: 'Hola! Quiero consultar por las piezas únicas',
    // Las piezas únicas ya están publicadas: en vez de preguntar por chat qué
    // hay, se baja a la tienda y se ven.
    ancla: 'tienda',
    accion: 'Ver la tienda',
  },
  {
    id: 'personalizacion',
    titulo: 'Personalización',
    texto:
      'Intervenimos prendas que ya tenés: apliques, cortes, teñidos y detalles, ' +
      'dándoles nuestra impronta Cutie conservando tu estilo.',
    consulta: 'Hola! Quiero personalizar una prenda que ya tengo',
    // Este servicio no manda directo a WhatsApp: baja al formulario de la home,
    // que arma el mensaje con todo lo que hace falta para presupuestar.
    ancla: 'personalizacion',
    accion: 'Armar mi personalización',
  },
]

// Opciones del formulario de personalización. Viven acá y no en el componente
// porque son contenido de la marca: agregar una prenda o un tipo de aplique es
// editar esta lista y nada más.
//
// Los valores son los textos que se leen: no se guardan en ninguna base, van
// derecho al mensaje de WhatsApp.
export const PERSONALIZACION = {
  prendas: [
    'Pantalón',
    'Pollera',
    'Remera',
    'Polera',
    'Camisa',
    'Campera',
    'Buzo',
    'Vestido',
    'Top',
    'Corset',
    'Short',
    'Conjunto',
    'Otra',
  ],

  alcances: [
    {
      id: 'talle-y-estilo',
      titulo: 'Talle y estilo',
      texto: 'La prenda no me calza como quiero y además le quiero cambiar la onda.',
    },
    {
      id: 'estilo',
      titulo: 'Solo el estilo',
      texto: 'El talle está bien, quiero cambiarle el aspecto.',
    },
    {
      id: 'diseno-completo',
      titulo: 'Diseño completo',
      texto: 'Rehacerla de cero, con otro molde y otra idea.',
    },
  ],

  detalles: [
    'Tachas',
    'Otras telas',
    'Dibujos artísticos a mano',
    'Cadenas',
    'Cortes',
    'Frunces',
    'Encaje',
    'Bordados',
    'Teñido o degradé',
    'Flecos',
    'Otro',
  ],
}
