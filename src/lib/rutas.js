// En GitHub Pages el sitio no cuelga de la raíz del dominio sino de /cultura-cute/,
// así que toda ruta a public/ tiene que llevar ese prefijo. Vite lo reescribe solo
// en el HTML y el CSS, pero NO dentro de strings de JavaScript: para esas usamos
// este helper. Si algún día se publica en la raíz de un dominio propio, alcanza con
// cambiar `base` en vite.config.js y esto sigue funcionando.
const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export function asset(ruta) {
  return `${base}${ruta}`
}

// Las fotos de las prendas vienen de dos lados: las viejas son rutas del repo
// ("/img/productos/x.png") y las que se suben desde el panel son URLs completas
// de Supabase Storage. Solo las primeras llevan el prefijo del deploy.
//
// El prefijo se aplica SIEMPRE al pintar y nunca se guarda en la base: si una
// ruta ya prefijada volviera a pasar por acá quedaría "/cultura-cute/cultura-cute/…",
// así que de paso sacamos los prefijos repetidos que puedan haber quedado
// guardados antes de que esto fuera así.
// Prefijos viejos que pueden haber quedado guardados en la base. `/cultura-cute`
// va escrito a mano y no sale de BASE_URL a propósito: en Vercel el sitio cuelga
// de la raíz, ahí BASE_URL es "/" y el bucle de abajo no sacaría nada, así que
// una foto guardada en la época de GitHub Pages quedaría rota.
const PREFIJOS_VIEJOS = [base, '/cultura-cute'].filter(Boolean)

export function fotoUrl(ruta) {
  if (!ruta) return null
  if (/^https?:\/\//.test(ruta)) return ruta

  let limpia = ruta
  let saco = true
  while (saco) {
    saco = false
    for (const viejo of PREFIJOS_VIEJOS) {
      if (limpia.startsWith(`${viejo}/`)) {
        limpia = limpia.slice(viejo.length)
        saco = true
      }
    }
  }

  return asset(limpia)
}
