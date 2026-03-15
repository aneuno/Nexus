'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const supabase = createClient()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState('🐉')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const avatars = ['🐉', '⚔️', '🌀', '🔮', '🦋', '🌸', '⚡', '🔥']

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  async function handleRegister() {
    setLoading(true)
    setError('')

    if (username.length < 3) {
      setError('Le nom doit faire au moins 3 caractères.')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (existing) {
      setError("Ce nom d'invocateur est déjà pris.")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, avatar }
      }
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Compte créé ! Tu peux maintenant te connecter.')
    }
    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: '#0f0f1e',
        border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: '8px',
        padding: '2rem',
        width: '100%',
        maxWidth: '380px',
        color: '#e8e0cc'
      }}>
        <h1 style={{ textAlign: 'center', color: '#c9a84c', fontSize: '1.3rem', marginBottom: '0.3rem' }}>
          NEXUS CHRONICLES
        </h1>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(232,224,204,0.5)', marginBottom: '1.5rem' }}>
          Portail des invocateurs
        </p>

        <div style={{ display: 'flex', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem' }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '10px',
              background: tab === t ? 'rgba(201,168,76,0.15)' : 'transparent',
              color: tab === t ? '#c9a84c' : 'rgba(232,224,204,0.5)',
              border: 'none', cursor: 'pointer', fontSize: '0.88rem',
              letterSpacing: '0.1em', textTransform: 'uppercase'
            }}>
              {t === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(201,76,76,0.1)', border: '1px solid rgba(201,76,76,0.3)', borderRadius: '4px', padding: '8px 12px', fontSize: '0.82rem', color: '#e88080', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(76,201,168,0.1)', border: '1px solid rgba(76,201,168,0.3)', borderRadius: '4px', padding: '8px 12px', fontSize: '0.82rem', color: '#80e8c8', marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        {tab === 'register' && (
          <>
            <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'rgba(232,224,204,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Nom d'invocateur
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="VoidSlayer99"
              style={{ width: '100%', padding: '10px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.95rem', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'rgba(232,224,204,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Avatar
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {avatars.map(a => (
                <button key={a} onClick={() => setAvatar(a)} style={{
                  width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.3rem',
                  border: `2px solid ${avatar === a ? '#c9a84c' : 'rgba(201,168,76,0.3)'}`,
                  background: '#141428', cursor: 'pointer'
                }}>{a}</button>
              ))}
            </div>
          </>
        )}

        <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'rgba(232,224,204,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="invocateur@nexus.gg"
          style={{ width: '100%', padding: '10px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.95rem', marginBottom: '1rem', boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'rgba(232,224,204,0.5)', marginBottom: '6px', textTransform: 'uppercase' }}>
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ width: '100%', padding: '10px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.95rem', marginBottom: '1.5rem', boxSizing: 'border-box' }}
        />

        <button
          onClick={tab === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          style={{
            width: '100%', padding: '12px',
            background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)',
            color: '#0a0a14', border: 'none', borderRadius: '4px',
            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
            letterSpacing: '0.1em', opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Chargement...' : tab === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </div>
    </main>
  )
}
