import { MARCA } from '../data/marca.js'

// El nombre de la marca con las dos tipografías mezcladas: las iniciales en
// mayúscula van en UnifrakturCook y el resto de las letras en MedievalSharp.
//
// Se parte el nombre acá y no a mano en cada lugar para que la portada y el pie
// no se desincronicen, y para que siga saliendo bien si algún día cambia
// MARCA.nombre.
export default function NombreMarca({ className = '' }) {
  // Tramos seguidos de mayúsculas y de "el resto". El punto de «Cultura.Cute»
  // no es mayúscula, así que cae del lado de MedievalSharp.
  const tramos = []
  for (const letra of MARCA.nombre) {
    const esMayuscula = letra !== letra.toLowerCase()
    const ultimo = tramos.at(-1)
    if (ultimo && ultimo.esMayuscula === esMayuscula) ultimo.texto += letra
    else tramos.push({ esMayuscula, texto: letra })
  }

  return (
    <span className={`marca ${className}`.trim()}>
      {tramos.map((tramo, i) => (
        <span key={i} className={tramo.esMayuscula ? 'marca__inicial' : undefined}>
          {tramo.texto}
        </span>
      ))}
    </span>
  )
}
