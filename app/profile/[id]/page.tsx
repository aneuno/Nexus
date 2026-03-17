'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<any>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [friendStatus, setFriendStatus] = useState<string | null>(null)
  const [friendRow, setFriendRow] = useState<any>(null)
  const [cardCount, setCardCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setMyId(session.user.id)

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, avatars(*), banners(*), titles(*)')
        .eq('id', params.id)
        .single()
      setProfile(prof)

      const { count } = await supabase
        .from('player_cards')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', params.id)
      setCardCount(count || 0)

      // Vérifier statut ami
      const { data: fr1 } = await supabase
        .from('friends')
        .select('*')
        .eq('sender_id', session.user.id)
        .eq('receiver_id', params.id)
        .single()

      const { data: fr2 } = await supabase
        .from('friends')
        .select('*')
        .eq('sender_id', params.id)
        .eq('receiver_id', session.user.id)
        .single()

      if (fr1) { setFriendStatus(fr1.status); setFriendRow(fr1) }
      else if (fr2) { setFriendStatus(fr2.status === 'pending' ? 'received' : fr2.status); setFriendRow(fr2) }

      setLoading(false)
    }
    load()
  }, [])

  async function sendFriendRequest() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('friends').insert({
      sender_id: session.user.id,
      receiver_id: params.id,
      status: 'pending'
    })
    setFriendStatus('pending')
    setMessage({ type: 'success', text: 'Demande envoyée !' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function cancelFriendRequest() {
    if (!friendRow) return
    await supabase.from('friends').delete().eq('id', friendRow.id)
    setFriendStatus(null)
    setFriendRow(null)
    setMessage({ type: 'success', text: 'Demande annulée.' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function acceptFriendRequest() {
    if (!friendRow) return
    await supabase.from('friends').update({ status: 'accepted' }).eq('id', friendRow.id)
    setFriendStatus('accepted')
    setMessage({ type: 'success', text: 'Ami ajouté !' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function removeFriend() {
    if (!friendRow) return
    await supabase.from('friends').delete().eq('id', friendRow.id)
    setFriendStatus(null)
    setFriendRow(null)
    setMessage({ type: 'success', text: 'Ami retiré.' })
    setTimeout(() => setMessage(null), 3000)
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

  if (!profile) return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
      Joueur introuvable.
    </main>
  )

  const isMe = myId === params.id

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e0cc', fontFamily: 'sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => window.history.back()} style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>← Retour</button>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Profil</span>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>

        {/* Bannière */}
        <div style={{ width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', marginBottom: '0', position: 'relative' }}>
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
          <div style={{ paddingBottom: '4px', flex: 1 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: '#e8e0cc', marginBottom: '2px' }}>{profile.username}</div>
            {profile.titles?.name && (
              <div style={{ fontSize: '0.75rem', color: rarityColor(profile.titles?.rarity), letterSpacing: '0.1em' }}>{profile.titles.name}</div>
            )}
            <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.5)', marginTop: '2px' }}>★ {profile.rank}</div>
          </div>

          {/* Boutons action */}
          {!isMe && (
            <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
              {friendStatus === null && (
                <button onClick={sendFriendRequest} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.78rem', cursor: 'pointer' }}>
                  + Ajouter
                </button>
              )}
              {friendStatus === 'pending' && (
                <button onClick={cancelFriendRequest} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: 'rgba(201,168,76,0.6)', borderRadius: '6px', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem', cursor: 'pointer' }}>
                  En attente...
                </button>
              )}
              {friendStatus === 'received' && (
                <button onClick={acceptFriendRequest} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #1e8a6a, #4cc9a8)', color: '#0a0a14', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.78rem', cursor: 'pointer' }}>
                  Accepter
                </button>
              )}
              {friendStatus === 'accepted' && (
                <>
                  <button style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6a1e8a, #9b4cc9)', color: '#e8e0cc', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.78rem', cursor: 'pointer' }}>
                    ⚔️ Duel
                  </button>
                  <button onClick={removeFriend} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(201,76,76,0.3)', color: 'rgba(201,76,76,0.6)', borderRadius: '6px', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem', cursor: 'pointer' }}>
                    Retirer
                  </button>
                </>
              )}
            </div>
          )}
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

        {/* Infos */}
        <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: 'rgba(201,168,76,0.6)', marginBottom: '12px', letterSpacing: '0.1em' }}>INFORMATIONS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'rgba(232,224,204,0.5)' }}>Membre depuis</span>
              <span style={{ color: 'rgba(232,224,204,0.7)' }}>{new Date(profile.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </div>

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
