import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En GitHub Pages el sitio cuelga de https://<usuario>.github.io/cultura-cute/, así que
// todo tiene que colgar de ese subdirectorio. En Vercel cuelga de la raíz del dominio.
//
// Los dos deploys conviven a propósito mientras dura la mudanza: Vercel define VERCEL=1
// en sus builds, así que cada uno compila con la ruta que le corresponde y el sitio de
// GitHub sigue andando hasta que se decida apagarlo.
//
// Ojo: `base` también aplica en desarrollo, o sea que `npm run dev` sirve en
// localhost:5173/cultura-cute/ (entrar a la raíz redirige solo).
const base = process.env.VERCEL ? '/' : '/cultura-cute/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
  },
})
