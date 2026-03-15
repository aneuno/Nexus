'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister() {
    setLoading(true)
    setError('')

    if (username.length < 3) {
      setError('Le nom doit faire au moins 3 caractères.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, avatar: '🐉' }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/login'
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '2rem', width: '100%', maxWidth: '360px', color: '#e8e0cc' }}>
        <h1 style={{ textAlign: 'center', color: '#c9a84c', fontSize: '1.3rem', marginBottom: '2rem' }}>NEXUS CHRONICLES</h1>

        {error && (
          <div style={{ background: 'rgba(201,76,76,0.1)', border: '1px solid rgba(201,76,76,0.3)', borderRadius: '4px', padding: '8px 12px', fontSize: '0.82rem', color: '#e88080', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(232,224,204,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nom d'invocateur</label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="VoidSlayer99"
          style={{ width: '100%', padding: '10px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.95rem', marginBottom: '1rem', boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(232,224,204,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="ton@email.com"
          style={{ width: '100%', padding: '10px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.95rem', marginBottom: '1rem', boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(232,224,204,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ width: '100%', padding: '10px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.95rem', marginBottom: '1.5rem', boxSizing: 'border-box' }}
        />

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Création...' : 'Créer mon compte'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/login" style={{ fontSize: '0.82rem', color: 'rgba(232,224,204,0.5)' }}>Déjà un compte ? Se connecter</a>
        </div>
      </div>
    </main>
  )
}
