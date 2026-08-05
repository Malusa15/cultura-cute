import { supabase } from './supabase.js'

const ORDEN_TALLES = ['XS', 'S', 'M', 'L', 'XL', 'Único']

// Pasa una fila de la base a la forma que usan los componentes, que es plana:
// la tienda no tiene por qué saber que categoría y subcategoría viven en otras
// tablas.
export function aProducto(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    precio: fila.precio,
    genero: fila.genero ?? null,
    // La tienda filtra por nombre; el formulario del panel necesita los ids.
    categoria: fila.categorias?.nombre ?? null,
    subcategoria: fila.subcategorias?.nombre ?? null,
    categoria_id: fila.categoria_id ?? null,
    subcategoria_id: fila.subcategoria_id ?? null,
    orden: fila.orden ?? 0,
    descripcion: fila.descripcion ?? '',
    medidas: fila.medidas ?? {},
    materiales: fila.materiales ?? [],
    composicion: fila.composicion ?? '',
    color: fila.color ?? null,
    estilo: fila.estilo ?? [],
    // Tal como están guardadas: el prefijo del deploy lo pone `fotoUrl` al
    // pintar. Si se resolvieran acá, el formulario del panel las leería ya
    // prefijadas y las volvería a guardar así, rompiendo la ruta.
    imagenes: (fila.imagenes ?? []).filter(Boolean),
    activo: fila.activo,
    talles: [...(fila.talles ?? [])]
      .sort((a, b) => {
        const posA = ORDEN_TALLES.indexOf(a.talle)
        const posB = ORDEN_TALLES.indexOf(b.talle)
        if (posA !== -1 && posB !== -1) return posA - posB
        return (a.orden ?? 0) - (b.orden ?? 0)
      })
      .map((t) => ({ talle: t.talle, stock: t.stock })),
  }
}

const SELECT_PRODUCTO = `
  id, nombre, precio, genero, descripcion, medidas, materiales, composicion,
  color, estilo, imagenes, activo, orden, categoria_id, subcategoria_id,
  categorias ( nombre ),
  subcategorias ( nombre ),
  talles ( id, talle, stock, orden )
`

// Para la tienda pública. Las políticas de RLS ya filtran los inactivos cuando
// no hay sesión, pero lo pedimos explícito para que también valga si el panel
// está abierto en otra pestaña.
export async function traerCatalogoPublico() {
  const { data, error } = await supabase
    .from('productos')
    .select(SELECT_PRODUCTO)
    .eq('activo', true)
    .order('orden', { ascending: true })

  if (error) throw error
  return data.map(aProducto)
}

// Para el panel: incluye las prendas despublicadas.
export async function traerTodosLosProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select(SELECT_PRODUCTO)
    .order('orden', { ascending: true })

  if (error) throw error
  return data.map(aProducto)
}

export async function traerCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre, descripcion, orden, subcategorias ( id, nombre, orden )')
    .order('orden', { ascending: true })

  if (error) throw error

  return data.map((c) => ({
    ...c,
    subcategorias: [...(c.subcategorias ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
  }))
}

// --- Escritura (solo desde el panel, requiere sesión) ------------------------

export async function guardarProducto(producto, talles) {
  const fila = {
    nombre: producto.nombre,
    precio: producto.precio,
    genero: producto.genero || null,
    categoria_id: producto.categoria_id || null,
    subcategoria_id: producto.subcategoria_id || null,
    descripcion: producto.descripcion || null,
    medidas: producto.medidas ?? {},
    materiales: producto.materiales ?? [],
    composicion: producto.composicion || null,
    color: producto.color || null,
    estilo: producto.estilo ?? [],
    imagenes: producto.imagenes ?? [],
    activo: producto.activo ?? true,
    orden: producto.orden ?? 0,
  }

  let id = producto.id

  if (id) {
    const { error } = await supabase.from('productos').update(fila).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('productos').insert(fila).select('id').single()
    if (error) throw error
    id = data.id
  }

  // Los talles se reemplazan enteros en vez de ir uno por uno: es una lista
  // corta y así no quedan talles viejos colgados al sacar uno del formulario.
  const { error: errorBorrado } = await supabase.from('talles').delete().eq('producto_id', id)
  if (errorBorrado) throw errorBorrado

  const filasTalles = talles
    .filter((t) => t.talle.trim())
    .map((t, indice) => ({
      producto_id: id,
      talle: t.talle.trim(),
      stock: Number(t.stock) || 0,
      orden: indice,
    }))

  if (filasTalles.length) {
    const { error } = await supabase.from('talles').insert(filasTalles)
    if (error) throw error
  }

  return id
}

export async function cambiarPublicacion(id, activo) {
  const { error } = await supabase.from('productos').update({ activo }).eq('id', id)
  if (error) throw error
}

export async function eliminarProducto(id) {
  // Los talles se van solos por el on delete cascade del esquema.
  const { error } = await supabase.from('productos').delete().eq('id', id)
  if (error) throw error
}

export async function crearCategoria(nombre, descripcion) {
  const { error } = await supabase
    .from('categorias')
    .insert({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null })
  if (error) throw error
}

export async function crearSubcategoria(categoriaId, nombre) {
  const { error } = await supabase
    .from('subcategorias')
    .insert({ categoria_id: categoriaId, nombre: nombre.trim() })
  if (error) throw error
}

export async function eliminarCategoria(id) {
  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) throw error
}

export async function eliminarSubcategoria(id) {
  const { error } = await supabase.from('subcategorias').delete().eq('id', id)
  if (error) throw error
}

// --- Fotos -------------------------------------------------------------------

export async function subirFoto(archivo) {
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const nombre = `${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from('prendas').upload(nombre, archivo, {
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from('prendas').getPublicUrl(nombre)
  return data.publicUrl
}
