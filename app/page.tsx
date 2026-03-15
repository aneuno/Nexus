'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setProfile(data)
    }
    init()
  }, [])

  if (!profile) return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', border: '2px solid #c9a84c', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        Chargement...
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e0cc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        @keyframes spin1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin2 { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes spin3 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.5; transform: translate(-50%,-50%) scale(1); } 50% { opacity: 1; transform: translate(-50%,-50%) scale(1.15); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        .nav-main-btn {
          display: flex; align-items: center; gap: 14px; padding: 16px 20px;
          background: rgba(201,168,76,0.04); border: 1px solid rgba(201,168,76,0.2);
          border-radius: 8px; color: #e8e0cc; text-decoration: none;
          transition: all 0.25s ease; cursor: pointer; width: 100%;
        }
        .nav-main-btn:hover {
          border-color: rgba(201,168,76,0.7); background: rgba(201,168,76,0.1); transform: translateX(4px);
        }
        .nav-top-btn {
          display: flex; align-items: center; gap: 6px; padding: 7px 16px;
          background: transparent; border: 1px solid rgba(201,168,76,0.2); border-radius: 20px;
          color: rgba(232,224,204,0.6); text-decoration: none; font-family: 'Rajdhani', sans-serif;
          font-size: 0.82rem; letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 0.2s; cursor: pointer; white-space: nowrap;
        }
        .nav-top-btn:hover { border-color: rgba(201,168,76,0.6); color: #c9a84c; background: rgba(201,168,76,0.08); }
      `}</style>

      {/* TOPBAR */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em', flexShrink: 0 }}>NEXUS CHRONICLES</span>
        <div style={{ width: '1px', height: '20px', background: 'rgba(201,168,76,0.2)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1.5px solid #c9a84c', background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
            {profile.avatar || '🐉'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.username}</div>
            <div style={{ fontSize: '0.65rem', color: '#c9a84c', letterSpacing: '0.08em' }}>★ {profile.rank}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', color: '#c9a84c', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>✦ {profile.nexus_coins}</span>
          <span style={{ background: '#141428', border: '1px solid rgba(76,201,168,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', color: '#4cc9a8', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>◈ {profile.crystals}</span>
        </div>
      </div>

      {/* BARRE DU HAUT */}
      <div style={{ background: 'rgba(10,10,20,0.95)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '8px 20px', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        <a href="/leaderboard" className="nav-top-btn">🏆 Classement</a>
        <a href="/friends" className="nav-top-btn">👥 Amis</a>
        <a href="/profile" className="nav-top-btn">👤 Profil</a>
        <div style={{ flex: 1 }} />
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }} className="nav-top-btn" style={{ color: 'rgba(201,76,76,0.7)', borderColor: 'rgba(201,76,76,0.2)' }}>
          ⬡ Déconnexion
        </button>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* SIDEBAR GAUCHE */}
        <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid rgba(201,168,76,0.15)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(10,10,20,0.8)', overflowY: 'auto' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.65rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '4px' }}>Navigation</div>

          <a href="/play" className="nav-main-btn">
            <span style={{ fontSize: '1.4rem' }}>⚔️</span>
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>Jouer</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)' }}>Lancer une partie</div>
            </div>
          </a>

          <a href="/inventory" className="nav-main-btn">
            <span style={{ fontSize: '1.4rem' }}>🗃️</span>
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>Inventaire</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)' }}>Cartes & decks</div>
            </div>
          </a>

          <a href="/shop" className="nav-main-btn">
            <span style={{ fontSize: '1.4rem' }}>💠</span>
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>Boutique</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)' }}>Boosters & cosmétiques</div>
            </div>
          </a>

          <a href="/catalogue" className="nav-main-btn">
            <span style={{ fontSize: '1.4rem' }}>📖</span>
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>Catalogue</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)' }}>Toutes les cartes</div>
            </div>
          </a>

          <a href="/card-maker" className="nav-main-btn">
            <span style={{ fontSize: '1.4rem' }}>🎴</span>
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>Card Maker</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)' }}>Créer une carte</div>
            </div>
          </a>

          <a href="/card-3d" className="nav-main-btn">
            <span style={{ fontSize: '1.4rem' }}>🌀</span>
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>Visu 3D</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)' }}>Aperçu holographique</div>
            </div>
          </a>
        </div>

        {/* CENTRE — Portail animé */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, rgba(155,76,201,0.04) 40%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', width: '280px', height: '280px', animation: 'float 4s ease-in-out infinite' }}>
            <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(201,168,76,0.7)', borderRadius: '50%', animation: 'spin1 10s linear infinite', boxShadow: '0 0 20px rgba(201,168,76,0.3), inset 0 0 20px rgba(201,168,76,0.1)' }} />
            <div style={{ position: 'absolute', inset: '14px', border: '1.5px solid rgba(155,76,201,0.5)', borderRadius: '50%', animation: 'spin2 7s linear infinite', boxShadow: '0 0 15px rgba(155,76,201,0.2)' }} />
            <div style={{ position: 'absolute', inset: '28px', border: '1px solid rgba(76,201,168,0.4)', borderRadius: '50%', animation: 'spin3 5s linear infinite' }} />
            <div style={{ position: 'absolute', inset: '42px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '50%', animation: 'spin2 12s linear infinite' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '90px', height: '90px', transform: 'translate(-50%, -50%)', background: 'radial-gradient(circle, rgba(201,168,76,0.6) 0%, rgba(155,76,201,0.3) 50%, transparent 70%)', borderRadius: '50%', animation: 'pulse 3s ease-in-out infinite', boxShadow: '0 0 40px rgba(201,168,76,0.4)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 2 }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: '#c9a84c', letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 0 10px rgba(201,168,76,0.8)' }}>Nexus</div>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '40px', textAlign: 'center', left: 0, right: 0 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: '#c9a84c', marginBottom: '6px' }}>
              Bienvenue, {profile.username}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(232,224,204,0.4)', letterSpacing: '0.1em' }}>
              Le multivers t'attend
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
