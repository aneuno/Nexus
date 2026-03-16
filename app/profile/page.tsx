'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [avatarList, setAvatarList] = useState<any[]>([])
  const [bannerList, setBannerList] = useState<any[]>([])
  const [titleList, setTitleList] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<any>(null)
  const [cardCount, setCardCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setSession(session)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, avatars(*), banners(*), titles(*)')
        .eq('id', session.user.id)
        .single()
      setProfile(prof)
      setNewUsername(prof?.username || '')

      // Nombre de cartes
      const { count } = await supabase
        .from('player_cards')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', session.user.id)
      setCardCount(count || 0)

      // Avatars possédés
      const { data: inv } = await supabase
        .from('player_inventory')
        .select('item_id')
        .eq('player_id', session.user.id)
        .eq('item_type', 'avatar')
      if (inv && inv.length > 0) {
        const { data: avs } = await supabase.from('avatars').select('*').in('id', inv.map((i: any) => i.item_id))
        setAvatarList(avs || [])
      }

      // Bannières possédées
      const { data: invB } = await supabase
        .from('player_inventory')
        .select('item_id')
        .eq('player_id', session.user.id)
        .eq('item_type', 'banner')
      if (invB && invB.length > 0) {
        const { data: bns } = await supabase.from('banners').select('*').in('id', invB.map((i: any) => i.item_id))
        setBannerList(bns || [])
      }

      // Titres possédés
      const { data: invT } = await supabase
        .from('player_inventory')
        .select('item_id')
        .eq('player_id', session.user.id)
        .eq('item_type', 'title')
      if (invT && invT.length > 0) {
        const { data: tls } = await supabase.from('titles').select('*').in('id', invT.map((i: any) => i.item_id))
        setTitleList(tls || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile() {
    if (!session) return
    setSaving(true)

    if (newUsername !== profile.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername)
        .single()
      if (existing) {
        setMessage({ type: 'error', text: 'Ce pseudo est déjà pris !' })
        setTimeout(() => setMessage(null), 3000)
        setSaving(false)
        return
      }
    }

    await supabase.from('profiles').update({ username: newUsername }).eq('id', session.user.id)
    setProfile((prev: any) => ({ ...prev, username: newUsername }))
    setMessage({ type: 'success', text: 'Profil mis à jour !' })
    setTimeout(() => setMessage(null), 3000)
    setSaving(false)
    setShowSettings(false)
  }

  async function equipItem(field: string, id: string) {
    if (!session) return
    await supabase.from('profiles').update({ [field]: id }).eq('id', session.user.id)
    if (field === 'avatar_id') {
      const av = avatarList.find(a => a.id === id)
      setProfile((prev: any) => ({ ...prev, avatar_id: id, avatars: av }))
    }
    if (field === 'banner_id') {
      const bn = bannerList.find(b => b.id === id)
      setProfile((prev: any) => ({ ...prev, banner_id: id, banners: bn }))
    }
    if (field === 'title_id') {
      const tl = titleList.find(t => t.id === id)
      setProfile((prev: any) => ({ ...prev, title_id: id, titles: tl }))
    }
    setMessage({ type: 'success', text: 'Équipé !' })
    setTimeout(() => setMessage(null), 2000)
  }

  const rarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: 'rgba(180,180,180,0.7)',
      rare: '#4c99c9',
      epic: '#9b4cc9',
      legendary: '#c9a84c'
    }
    return colors[rarity] || 'rgba(201,168,76,0.3)'
  }

  const winRate = profile ? Math.round((profile.wins / Math.max(profile.wins + profile.losses, 1)) * 100) : 0

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
      Chargement...
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e0cc', fontFamily: 'sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        .settings-item {
          background: #0f0f1e; border: 1px solid rgba(201,168,76,0.2);
          border-radius: 8px; padding: 12px 14px;
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; transition: all 0.2s;
        }
        .settings-item:hover { border-color: rgba(201,168,76,0.5); }
        .cosm-pick {
          border-radius: 6px; overflow: hidden;
          border: 2px solid transparent; cursor: pointer;
          transition: all 0.2s;
        }
        .cosm-pick.active { border-color: #c9a84c; box-shadow: 0 0 10px rgba(201,168,76,0.4); }
        .cosm-pick:hover { border-color: rgba(201,168,76,0.5); }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontFamily: 'Rajdhani, sans-serif' }}>← Menu</a>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Profil</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowSettings(true)}
          style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: 'rgba(201,168,76,0.7)', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          ⚙️ Paramètres
        </button>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>

        {/* Bannière */}
        <div style={{
          width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden',
          background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)',
          marginBottom: '0', position: 'relative'
        }}>
          {profile.banners?.image_url ? (
            <img src={profile.banners.image_url} alt="bannière" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0a0a14, #1a1a35)' }} />
          )}
        </div>

        {/* Avatar + infos */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginTop: '-40px', paddingLeft: '20px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #0a0a14', overflow: 'hidden', background: '#141428', flexShrink: 0, boxShadow: '0 0 0 2px #c9a84c' }}>
            {profile.avatars?.image_url ? (
              <img src={profile.avatars.image_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>{profile.avatar || '🐉'}</div>
            )}
          </div>
          <div style={{ paddingBottom: '4px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: '#e8e0cc', marginBottom: '2px' }}>{profile.username}</div>
            {profile.titles?.name && (
              <div style={{ fontSize: '0.75rem', color: rarityColor(profile.titles?.rarity), letterSpacing: '0.1em' }}>{profile.titles.name}</div>
            )}
            <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.5)', marginTop: '2px' }}>★ {profile.rank}</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Victoires', value: profile.wins },
            { label: 'Défaites', value: profile.losses },
            { label: 'Win Rate', value: winRate + '%' },
            { label: 'Cartes', value: cardCount },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.3rem', color: '#c9a84c', marginBottom: '4px' }}>{stat.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Infos compte */}
        <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: 'rgba(201,168,76,0.6)', marginBottom: '12px', letterSpacing: '0.1em' }}>INFORMATIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'rgba(232,224,204,0.5)' }}>Nexus Coins</span>
              <span style={{ color: '#c9a84c' }}>✦ {profile.nexus_coins}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'rgba(232,224,204,0.5)' }}>Cristaux</span>
              <span style={{ color: '#4cc9a8' }}>◈ {profile.crystals}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'rgba(232,224,204,0.5)' }}>Membre depuis</span>
              <span style={{ color: 'rgba(232,224,204,0.7)' }}>{new Date(profile.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Paramètres */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '28px', maxWidth: '520px', width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowSettings(false)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: 'rgba(201,168,76,0.5)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', marginBottom: '20px', letterSpacing: '0.1em' }}>Paramètres du profil</div>

            {/* Pseudo */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>Nom d'invocateur</label>
              <input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Choisir avatar */}
            {avatarList.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Icône de profil</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {avatarList.map(av => (
                    <div key={av.id} className={`cosm-pick ${profile.avatar_id === av.id ? 'active' : ''}`} onClick={() => equipItem('avatar_id', av.id)}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden' }}>
                        <img src={av.image_url} alt={av.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Choisir bannière */}
            {bannerList.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Bannière</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {bannerList.map(bn => (
                    <div key={bn.id} className={`cosm-pick ${profile.banner_id === bn.id ? 'active' : ''}`} onClick={() => equipItem('banner_id', bn.id)} style={{ width: '140px', height: '50px' }}>
                      <img src={bn.image_url} alt={bn.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Choisir titre */}
            {titleList.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Titre</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {titleList.map(tl => (
                    <div key={tl.id} onClick={() => equipItem('title_id', tl.id)} style={{ padding: '10px 14px', background: '#141428', border: `1px solid ${profile.title_id === tl.id ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: rarityColor(tl.rarity) }}>{tl.name}</span>
                      {profile.title_id === tl.id && <span style={{ fontSize: '0.7rem', color: '#c9a84c' }}>✓ Équipé</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={saveProfile}
              disabled={saving}
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '5px', fontFamily: 'Cinzel, serif', fontSize: '0.88rem', letterSpacing: '0.1em', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: message.type === 'success' ? 'rgba(76,201,168,0.15)' : 'rgba(201,76,76,0.15)',
          border: `1px solid ${message.type === 'success' ? 'rgba(76,201,168,0.4)' : 'rgba(201,76,76,0.4)'}`,
          borderRadius: '8px', padding: '12px 24px',
          color: message.type === 'success' ? '#4cc9a8' : '#e88080',
          fontSize: '0.88rem', zIndex: 200, whiteSpace: 'nowrap'
        }}>
          {message.text}
        </div>
      )}
    </main>
  )
}
