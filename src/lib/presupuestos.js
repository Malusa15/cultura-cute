import { supabase } from './supabase.js'

// Presupuestos: lo que se cotiza antes de que exista el encargo.
//
// Acá viven las listas fijas (tipos de material, medidas del cuerpo), la cuenta
// del total y el acceso a la base. El PDF se arma en presupuestoPdf.js.

// --- Listas fijas ------------------------------------------------------------

export const ESTADOS_PRESUPUESTO = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
}

// Los tipos son solo una etiqueta para agrupar el listado del PDF: agregar uno
// nuevo acá alcanza, la base no los valida. Van cortos a propósito porque en el
// PDF entran en una columna angosta.
export const TIPOS_MATERIAL = {
  tela: 'Tela',
  apliques: 'Apliques',
  tintura: 'Tintura',
  avios: 'Avíos',
  hilos: 'Hilos',
  packaging: 'Packaging',
  otro: 'Otro',
}

export const UNIDADES = {
  m: 'metros',
  cm: 'centímetros',
  u: 'unidades',
  g: 'gramos',
  ml: 'mililitros',
}

// Medidas del cuerpo, agrupadas como se toman en el probador: primero el torso,
// después brazos, piernas y por último los largos de la prenda. Todas en cm.
//
// Las claves son las que quedan guardadas en presupuestos.medidas (jsonb):
// cambiar una clave deja huérfano lo que ya estaba cargado.
export const MEDIDAS = [
  {
    grupo: 'Torso',
    campos: [
      { id: 'busto', label: 'Contorno de busto' },
      { id: 'bajo_busto', label: 'Bajo busto' },
      { id: 'cintura', label: 'Cintura' },
      { id: 'cadera', label: 'Cadera' },
      { id: 'talle_delantero', label: 'Talle delantero' },
      { id: 'talle_espalda', label: 'Talle de espalda' },
      { id: 'ancho_espalda', label: 'Ancho de espalda' },
      { id: 'hombro', label: 'Hombro' },
      { id: 'cuello', label: 'Contorno de cuello' },
    ],
  },
  {
    grupo: 'Brazos',
    campos: [
      { id: 'largo_brazo', label: 'Largo de brazo' },
      { id: 'contorno_brazo', label: 'Contorno de brazo' },
      { id: 'muneca', label: 'Contorno de muñeca' },
      { id: 'sisa', label: 'Sisa' },
    ],
  },
  {
    grupo: 'Piernas',
    campos: [
      { id: 'tiro', label: 'Tiro' },
      { id: 'muslo', label: 'Contorno de muslo' },
      { id: 'rodilla', label: 'Contorno de rodilla' },
      { id: 'tobillo', label: 'Contorno de tobillo' },
      { id: 'largo_pierna', label: 'Largo de pierna' },
    ],
  },
  {
    grupo: 'Largos de la prenda',
    campos: [
      { id: 'largo_total', label: 'Largo total' },
      { id: 'largo_falda', label: 'Largo de pollera' },
      { id: 'altura', label: 'Altura de la persona' },
    ],
  },
]

// Todas las medidas en una sola lista, para recorrerlas sin los grupos.
export const MEDIDAS_PLANAS = MEDIDAS.flatMap((g) => g.campos)

// --- La cuenta ---------------------------------------------------------------

// Number('') es 0 pero Number(null) también, y Number('hola') es NaN: esto deja
// todo en un número usable para sumar.
function num(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

export function subtotalMaterial(material) {
  return num(material.cantidad) * num(material.precio_unitario)
}

// El corazón del presupuesto. Se usa igual en el formulario (para mostrar la
// cuenta mientras se escribe) y al guardar, así el total guardado nunca puede
// diferir del que se vio en pantalla.
export function calcular(presupuesto, materiales = []) {
  const materialesTotal = materiales.reduce((suma, m) => suma + subtotalMaterial(m), 0)
  const manoObra = num(presupuesto.horas_trabajo) * num(presupuesto.valor_hora)
  const costo = materialesTotal + manoObra
  const ganancia = costo * (num(presupuesto.margen) / 100)
  const descuento = num(presupuesto.descuento)
  // Si el descuento se pasa de lo que vale la prenda, el total queda en cero y
  // no en negativo (la base tampoco lo aceptaría).
  const total = Math.max(costo + ganancia - descuento, 0)

  return {
    materiales: materialesTotal,
    manoObra,
    costo,
    ganancia,
    descuento,
    total,
    // Lo que se suele pedir para arrancar la prenda.
    sena: Math.round(total / 2),
  }
}

// --- Base de datos -----------------------------------------------------------

const SELECT_PRESUPUESTO = `
  id, numero, cliente_nombre, cliente_contacto, prenda, descripcion, talle, medidas,
  horas_trabajo, valor_hora, margen, descuento, total, estado, validez_dias,
  fecha_entrega, notas, creado_en,
  presupuesto_materiales ( id, orden, tipo, detalle, cantidad, unidad, precio_unitario )
`

export async function traerPresupuestos() {
  const { data, error } = await supabase
    .from('presupuestos')
    .select(SELECT_PRESUPUESTO)
    .order('numero', { ascending: false })

  if (error) throw error

  return data.map((p) => ({
    ...p,
    medidas: p.medidas ?? {},
    // Supabase no garantiza el orden de la relación, así que se ordena acá.
    materiales: [...(p.presupuesto_materiales ?? [])].sort((a, b) => a.orden - b.orden),
  }))
}

// Guarda cabecera y materiales. Los materiales se borran y se vuelven a
// insertar en vez de compararlos uno por uno: son pocos renglones y el orden
// puede haber cambiado entero.
export async function guardarPresupuesto(presupuesto, materiales) {
  const limpios = materiales
    .filter((m) => m.detalle.trim())
    .map((m, i) => ({
      orden: i,
      tipo: m.tipo,
      detalle: m.detalle.trim(),
      cantidad: num(m.cantidad),
      unidad: m.unidad,
      precio_unitario: num(m.precio_unitario),
    }))

  const fila = {
    cliente_nombre: presupuesto.cliente_nombre.trim(),
    cliente_contacto: presupuesto.cliente_contacto?.trim() || null,
    prenda: presupuesto.prenda.trim(),
    descripcion: presupuesto.descripcion?.trim() || null,
    talle: presupuesto.talle?.trim() || null,
    // Las medidas vacías no se guardan: así el PDF puede imprimir solo las que
    // se tomaron sin tener que filtrar strings vacíos.
    medidas: Object.fromEntries(
      Object.entries(presupuesto.medidas ?? {}).filter(([, v]) => String(v).trim() !== ''),
    ),
    horas_trabajo: num(presupuesto.horas_trabajo),
    valor_hora: num(presupuesto.valor_hora),
    margen: num(presupuesto.margen),
    descuento: num(presupuesto.descuento),
    total: calcular(presupuesto, limpios).total,
    estado: presupuesto.estado,
    validez_dias: num(presupuesto.validez_dias),
    fecha_entrega: presupuesto.fecha_entrega || null,
    notas: presupuesto.notas?.trim() || null,
  }

  let id = presupuesto.id

  if (id) {
    const { error } = await supabase.from('presupuestos').update(fila).eq('id', id)
    if (error) throw error

    const { error: errorBorrado } = await supabase
      .from('presupuesto_materiales')
      .delete()
      .eq('presupuesto_id', id)
    if (errorBorrado) throw errorBorrado
  } else {
    const { data, error } = await supabase
      .from('presupuestos')
      .insert(fila)
      .select('id')
      .single()
    if (error) throw error
    id = data.id
  }

  if (limpios.length) {
    const { error } = await supabase
      .from('presupuesto_materiales')
      .insert(limpios.map((m) => ({ ...m, presupuesto_id: id })))
    if (error) throw error
  }

  return id
}

export async function cambiarEstadoPresupuesto(id, estado) {
  const { error } = await supabase.from('presupuestos').update({ estado }).eq('id', id)
  if (error) throw error
}

export async function eliminarPresupuesto(id) {
  // Los materiales se van solos por el on delete cascade.
  const { error } = await supabase.from('presupuestos').delete().eq('id', id)
  if (error) throw error
}
