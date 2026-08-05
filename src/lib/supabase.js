import { createClient } from '@supabase/supabase-js'

// La anon key viaja en el JavaScript del sitio y es pública por diseño: no es un
// secreto. Lo único que impide que cualquiera escriba en la base son las
// políticas de Row Level Security de supabase/schema.sql.
//
// NUNCA poner acá la service_role key: esa saltea RLS y daría acceso total a
// cualquiera que abra el código del sitio.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Mientras no estén cargadas las credenciales, la tienda sigue andando con el
// catálogo local y el panel avisa que falta configurar.
export const supabaseConfigurado = Boolean(url && anonKey)

export const supabase = supabaseConfigurado
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
