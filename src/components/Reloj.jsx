import { useReloj } from '../hooks/useReloj.js'
import { fechaHora } from '../lib/formato.js'

// Fecha y hora corriendo segundo a segundo. Es la hora del dispositivo de quien
// mira la página, no la del servidor: en el panel eso es la hora de Malena, y en
// la tienda la de cada clienta.
export default function Reloj({ className = '' }) {
  const ahora = useReloj()

  return (
    <time className={`reloj ${className}`.trim()} dateTime={ahora.toISOString()}>
      {fechaHora(ahora)}
    </time>
  )
}
