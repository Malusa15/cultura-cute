import { useEffect, useState } from 'react'
import { supabase, supabaseConfigurado } from '../lib/supabase.js'

// Estado de la sesión de Supabase Auth. Se suscribe a los cambios para que
// cerrar sesión en otra pestaña también saque del panel acá.
export function useSesion() {
  const [sesion, setSesion] = useState(null)
  const [cargando, setCargando] = useState(supabaseConfigurado)

  useEffect(() => {
    if (!supabaseConfigurado) return

    let vigente = true

    supabase.auth.getSession().then(({ data }) => {
      if (!vigente) return
      setSesion(data.session)
      setCargando(false)
    })

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion)
      setCargando(false)
    })

    return () => {
      vigente = false
      suscripcion.subscription.unsubscribe()
    }
  }, [])

  return { sesion, cargando }
}
