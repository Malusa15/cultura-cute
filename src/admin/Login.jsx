import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { asset } from '../lib/rutas.js'

// No hay registro público: las cuentas se dan de alta a mano desde el panel de
// Supabase (Authentication > Users). Por eso acá solo hay login.
export default function Login() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const entrar = async (evento) => {
    evento.preventDefault()
    setEnviando(true)
    setError(null)

    const { error: fallo } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: clave,
    })

    if (fallo) {
      // El mensaje de Supabase viene en inglés y es genérico a propósito, para
      // no revelar si el mail existe o no.
      setError('No pudimos entrar con esos datos. Revisá el mail y la contraseña.')
      setEnviando(false)
      return
    }

    setEnviando(false)
  }

  return (
    <div className="admin-login">
      <form className="admin-login__caja" onSubmit={entrar}>
        <img className="admin-login__logo" src={asset('/img/marca/wordmark.png')} alt="Cultura.Cute" />
        <h1 className="admin-login__titulo gotica">Panel</h1>

        <label className="admin-campo">
          <span className="admin-campo__label">Mail</span>
          <input
            type="email"
            className="admin-campo__control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="admin-campo">
          <span className="admin-campo__label">Contraseña</span>
          <input
            type="password"
            className="admin-campo__control"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="admin-error">{error}</p>}

        <button type="submit" className="boton boton--ancho" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
