import { useEffect } from 'react'

// Comportamiento compartido por el modal de producto y el carrito: mientras
// estan abiertos se bloquea el scroll del fondo y Escape los cierra.
export function usePanel(abierto, cerrar) {
  useEffect(() => {
    if (!abierto) return

    const scrollPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const alPresionar = (evento) => {
      if (evento.key === 'Escape') cerrar()
    }
    window.addEventListener('keydown', alPresionar)

    return () => {
      document.body.style.overflow = scrollPrevio
      window.removeEventListener('keydown', alPresionar)
    }
  }, [abierto, cerrar])
}
