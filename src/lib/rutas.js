// En GitHub Pages el sitio no cuelga de la raíz del dominio sino de /cultura-cute/,
// así que toda ruta a public/ tiene que llevar ese prefijo. Vite lo reescribe solo
// en el HTML y el CSS, pero NO dentro de strings de JavaScript: para esas usamos
// este helper. Si algún día se publica en la raíz de un dominio propio, alcanza con
// cambiar `base` en vite.config.js y esto sigue funcionando.
const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export function asset(ruta) {
  return `${base}${ruta}`
}
