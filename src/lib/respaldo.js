import { supabase } from './supabase.js'

// Copia de seguridad de la base, bajable desde el panel.
//
// Es un archivo de texto con todo lo que hay cargado. Sirve para dos cosas:
// tener con qué reconstruir si algo se rompe en Supabase, y poder mirar los
// datos sin depender de que Supabase esté andando.
//
// NO incluye las fotos de las prendas, y no hace falta: hoy son archivos del
// repositorio (`/img/productos/…`), o sea que ya están guardadas en GitHub. Lo
// que sí queda en el archivo es la ruta de cada una, así que si alguna vez se
// suben fotos desde el panel —esas van a Supabase Storage— el respaldo va a
// tener el link pero no el archivo. Está dicho en la pantalla.

// El orden importa: para reconstruir hay que meter primero las tablas de las que
// cuelgan las demás. Categorías antes que productos, productos antes que talles,
// ventas antes que sus renglones.
export const TABLAS = [
  { nombre: 'categorias', titulo: 'Categorías' },
  { nombre: 'subcategorias', titulo: 'Subcategorías' },
  { nombre: 'productos', titulo: 'Prendas' },
  { nombre: 'talles', titulo: 'Talles y stock' },
  { nombre: 'ventas', titulo: 'Ventas' },
  { nombre: 'venta_items', titulo: 'Prendas de cada venta' },
  { nombre: 'envios', titulo: 'Envíos' },
  { nombre: 'encargos', titulo: 'Encargos' },
  { nombre: 'reservas', titulo: 'Reservas' },
  { nombre: 'presupuestos', titulo: 'Presupuestos' },
  { nombre: 'presupuesto_materiales', titulo: 'Materiales de los presupuestos' },
  { nombre: 'cajas', titulo: 'Cajas' },
  { nombre: 'movimientos', titulo: 'Movimientos de plata' },
  { nombre: 'visitas', titulo: 'Visitas a la tienda' },
  { nombre: 'visita_secciones', titulo: 'Secciones que miraron' },
]

// Trae una tabla entera. Supabase corta en 1000 filas por pedido, así que se va
// de a tandas hasta que no venga nada más: sin esto, el día que haya más de mil
// visitas el respaldo se llevaría solo las primeras mil sin avisar.
const TANDA = 1000

async function traerTabla(nombre) {
  const filas = []

  for (let desde = 0; ; desde += TANDA) {
    const { data, error } = await supabase
      .from(nombre)
      .select('*')
      .range(desde, desde + TANDA - 1)

    if (error) throw error
    filas.push(...data)
    if (data.length < TANDA) break
  }

  return filas
}

// Arma el respaldo entero. `alAvanzar` se llama después de cada tabla para poder
// mostrar el progreso: con la base llena son quince pedidos y conviene ver que
// está pasando algo.
//
// Si una tabla falla, se anota y se sigue con las demás: es mejor un respaldo de
// catorce tablas que ninguno.
export async function armarRespaldo(alAvanzar) {
  const tablas = {}
  const problemas = []

  for (const { nombre, titulo } of TABLAS) {
    try {
      tablas[nombre] = await traerTabla(nombre)
    } catch (e) {
      tablas[nombre] = []
      problemas.push({ tabla: titulo, motivo: e.message })
    }
    alAvanzar?.({ nombre, titulo, filas: tablas[nombre].length })
  }

  return {
    marca: 'cultura-cute',
    version: 1,
    generado_en: new Date().toISOString(),
    // Para saber de dónde salió sin tener que adivinar, si alguna vez hay más de
    // un proyecto de Supabase dando vueltas.
    origen: import.meta.env.VITE_SUPABASE_URL ?? null,
    orden_para_restaurar: TABLAS.map((t) => t.nombre),
    tablas,
    problemas,
  }
}

export function totalDeFilas(respaldo) {
  return Object.values(respaldo?.tablas ?? {}).reduce((suma, filas) => suma + filas.length, 0)
}

export function descargarRespaldo(respaldo) {
  const texto = JSON.stringify(respaldo, null, 2)
  const dia = respaldo.generado_en.slice(0, 10)
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }))

  const a = document.createElement('a')
  a.href = url
  a.download = `cultura-cute-respaldo-${dia}.json`
  a.click()
  URL.revokeObjectURL(url)

  return texto.length
}
