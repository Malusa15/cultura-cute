import { useEffect, useState } from 'react'

// La hora del dispositivo de quien está mirando, actualizada segundo a segundo.
// La usan el reloj de la tienda y el del panel: una sola fuente para los dos.
export function useReloj() {
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    let id

    const tic = () => {
      const momento = new Date()
      setAhora(momento)
      // Apuntamos al filo del segundo siguiente en vez de usar un setInterval
      // de 1000: el interval se va corriendo unos milisegundos por vuelta y,
      // cada tanto, el reloj se saltea un segundo a la vista.
      id = setTimeout(tic, 1000 - (momento.getTime() % 1000))
    }

    tic()

    return () => clearTimeout(id)
  }, [])

  return ahora
}
