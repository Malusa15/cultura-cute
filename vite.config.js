import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El sitio se publica en GitHub Pages bajo https://<usuario>.github.io/cultura-cute/,
// así que todo tiene que colgar de ese subdirectorio. Ojo: `base` también aplica en
// desarrollo, o sea que `npm run dev` sirve en localhost:5173/cultura-cute/ (entrar a
// la raíz redirige solo).
export default defineConfig({
  base: '/cultura-cute/',
  plugins: [react()],
  server: {
    port: 5173,
  },
})
