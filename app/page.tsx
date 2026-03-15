import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a14',
      color: '#e8e0cc',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        background: '#0f0f1e',
        borderBottom: '1px solid rgba(201,168,76,0.3)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.1em' }}>
          NEXUS CHRONICLES
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            border: '1.5px solid #c9a84c', background: '#1a1a35',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
          }}>
            {profile?.avatar || '🐉'}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{profile?.username || 'Invocateur'}</div>
            <div style={{ fontSize: '0.72rem', color: '#c9a84c' }}>★ {profile?.rank || 'Novice du Nexus'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{
            background: '#141428', border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '20px', padding: '4px 10px', fontSize: '0.82rem', color: '#c9a84c'
          }}>
            ✦ {profile?.nexus_coins ?? 0}
          </span>
          <span style={{
            background: '#141428', border: '1px solid rgba(76,201,168,0.3)',
            borderRadius: '20px', padding: '4px 10px', fontSize: '0.82rem', color: '#4cc9a8'
          }}>
            ◈ {profile?.crystals ?? 0}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', padding: '2rem 0 1.5rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🌀</div>
          <h1 style={{ color: '#c9a84c', fontSize: '1.5rem', marginBottom: '0.3rem' }}>
            Bienvenue, {profile?.username}
          </h1>
          <p style={{ color: 'rgba(232,224,204,0.5)', fontSize: '0.88rem' }}>
            Le multivers t'attend
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { href: '/play', icon: '⚔️', title: 'Jouer', desc: 'Lancer une partie' },
            { href: '/inventory', icon: '🗃️', title: 'Inventaire', desc: 'Cartes & decks' },
            { href: '/shop', icon: '💠', title: 'Boutique', desc: 'Boosters & cosmétiques' },
            { href: '/leaderboard', icon: '🏆', title: 'Classement', desc: 'Top invocateurs' },
            { href: '/friends', icon: '👥', title: 'Amis', desc: 'Réseau social' },
            { href: '/profile', icon: '👤', title: 'Profil', desc: 'Mon compte' },
          ].map(item => (
            <a key={item.href} href={item.href} style={{
              background: '#0f0f1e',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
              <span style={{ color: '#c9a84c', fontSize: '0.9rem' }}>{item.title}</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(232,224,204,0.5)' }}>{item.desc}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
