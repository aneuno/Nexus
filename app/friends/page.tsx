'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function FriendsPage() {
  const [myId, setMyId] = useState<string | null>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [sent, setSent] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('friends')
  const [message, setMessage] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setMyId(session.user.id)
      await loadFriends(session.user.id)
      setLoading(false)
    }
    load()
  }, [])

  async function loadFriends(userId: string) {
    const { data: f1 } = await supabase
      .from('friends')
      .select('*, profiles!friends_receiver_id_fkey(id, username, avatar, rank, avatar_id)')
      .eq('sender_id', userId)
      .eq('status', 'accepted')

    const { data: f2 } = await supabase
      .from('friends')
      .select('*, profiles!friends_sender_id_fkey(id, username, avatar, rank, avatar_id)')
      .eq('receiver_id', userId)
      .eq('status', 'accepted')

    const { data: recv } = await supabase
      .from('friends')
      .select('*, profiles!friends_sender_id_fkey(id, username, avatar, rank, avatar_id)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')

    const { data: sent_ } = await supabase
      .from('friends')
      .select('*, profiles!friends_receiver_id_fkey(id, username, avatar, rank, avatar_id)')
      .eq('sender_id', userId)
      .eq('status', 'pending')

    // Charger les avatars
    const allProfiles = [
      ...(f1 || []).map((f: any) => f.profiles),
      ...(f2 || []).map((f: any) => f.profiles),
      ...(recv || []).map((f: any) => f.profiles),
      ...(sent_ || []).map((f: any) => f.profiles),
    ].filter(Boolean)

    const avatarIds = allProfiles.map(p => p.avatar_id).filter(Boolean)
    const { data: avatars } = avatarIds.length > 0
      ? await supabase.from('avatars').select('id, image_url').in('id', avatarIds)
      : { data: [] }

    const withAvatar = (profile: any) => ({
      ...profile,
      avatars: avatars?.find((a: any) => a.id === profile?.avatar_id) || null
    })

    setFriends([
      ...(f1 || []).map((f: any) => ({ ...f, friend: withAvatar(f.profiles) })),
      ...(f2 || []).map((f: any) => ({ ...f, friend: withAvatar(f.profiles) })),
    ])
    setPending((recv || []).map((f: any) => ({ ...f, friend: withAvatar(f.profiles) })))
    setSent((sent_ || []).map((f: any) => ({ ...f, friend: withAvatar(f.profiles) })))
  }

  async function searchPlayers(query: string) {
    if (!query.trim()) { setSearchResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar, rank, avatar_id')
      .ilike('username', `%${query}%`)
      .neq('id', myId)
      .limit(10)

    if (!data) { setSearchResults([]); return }

    const avatarIds = data.map(p => p.avatar_id).filter(Boolean)
    const { data: avatars } = avatarIds.length > 0
      ? await supabase.from('avatars').select('id, image_url').in('id', avatarIds)
      : { data: [] }

    setSearchResults(data.map(p => ({
      ...p,
      avatars: avatars?.find((a: any) => a.id === p.avatar_id) || null
    })))
  }

  async function sendRequest(receiverId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('friends').insert({
      sender_id: session.user.id,
      receiver_id: receiverId,
      status: 'pending'
    })

    const { data: me } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single()

    await supabase.from('notifications').insert({
      player_id: receiverId,
      type: 'friend_request',
      title: "Demande d'ami",
      message: `${me?.username} vous a envoyé une demande d'ami.`,
      is_read: false
    })

    setMessage({ type: 'success', text: 'Demande envoyée !' })
    setTimeout(() => setMessage(null), 3000)
    await loadFriends(session.user.id)
    setSearchResults([])
    setSearch('')
  }

  async function acceptRequest(friendRowId: string, senderId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase.from('friends').update({ status: 'accepted' }).eq('id', friendRowId)

    const { data: me } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single()

    await supabase.from('notifications').insert({
      player_id: senderId,
      type: 'friend_accepted',
      title: 'Demande acceptée',
      message: `${me?.username} a accepté votre demande d'ami.`,
      is_read: false
    })

    setMessage({ type: 'success', text: 'Ami ajouté !' })
    setTimeout(() => setMessage(null), 3000)
    await loadFriends(session.user.id)
  }

  async function declineRequest(friendRowId: string) {
    await supabase.from('friends').delete().eq('id', friendRowId)
    setMessage({ type: 'success', text: 'Demande refusée.' })
    setTimeout(() => setMessage(null), 3000)
    if (myId) await loadFriends(myId)
  }

  async function removeFriend(friendRowId: string) {
    await supabase.from('friends').delete().eq('id', friendRowId)
    setMessage({ type: 'success', text: 'Ami retiré.' })
    setTimeout(() => setMessage(null), 3000)
    if (myId) await loadFriends(myId)
  }

  const tabs = [
    { id: 'friends', label: `Amis (${friends.length})` },
    { id: 'pending', label: `Demandes (${pending.length})` },
    { id: 'sent', label: `Envoyées (${sent.length})` },
    { id: 'search', label: '🔍 Rechercher' },
  ]

  const PlayerCard = ({ player, actions }: { player: any, actions: React.ReactNode }) => (
    <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <a href={`/profile/${player.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, textDecoration: 'none' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: '#141428', border: '2px solid rgba(201,168,76,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
          {player.avatars?.image_url ? (
            <img src={player.avatars.image_url} alt={player.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : player.avatar || '🐉'}
        </div>
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c' }}>{player.username}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.4)' }}>★ {player.rank}</div>
        </div>
      </a>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>{actions}</div>
    </div>
  )

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
      Chargement...
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e0cc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        .tab-btn {
          padding: 10px 16px; background: transparent;
          border: none; border-bottom: 2px solid transparent;
          color: rgba(232,224,204,0.5); cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 0.82rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 0.2s; white-space: nowrap;
        }
        .tab-btn.active { color: #c9a84c; border-bottom-color: #c9a84c; }
        .tab-btn:hover { color: #e8e0cc; }
        .action-btn {
          padding: 6px 12px; border-radius: 5px; cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 0.75rem;
          letter-spacing: 0.05em; transition: all 0.2s; border: none;
        }
      `}</style>

      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => window.history.back()} style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>← Retour</button>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Amis</span>
      </div>

      <div style={{ background: 'rgba(10,10,20,0.95)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '0 20px', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>

        {activeTab === 'friends' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {friends.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👥</div>
                <div style={{ fontFamily: 'Cinzel, serif' }}>Aucun ami pour le moment</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'rgba(201,168,76,0.3)' }}>Recherchez des joueurs pour les ajouter</div>
              </div>
            ) : friends.map(f => (
              <PlayerCard key={f.id} player={f.friend} actions={
                <>
                  <button className="action-btn" style={{ background: 'rgba(155,76,201,0.2)', color: '#9b4cc9', border: '1px solid rgba(155,76,201,0.3)' }}>⚔️ Duel</button>
                  <button className="action-btn" onClick={() => removeFriend(f.id)} style={{ background: 'transparent', color: 'rgba(201,76,76,0.6)', border: '1px solid rgba(201,76,76,0.2)' }}>Retirer</button>
                </>
              } />
            ))}
          </div>
        )}

        {activeTab === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📬</div>
                <div style={{ fontFamily: 'Cinzel, serif' }}>Aucune demande reçue</div>
              </div>
            ) : pending.map(f => (
              <PlayerCard key={f.id} player={f.friend} actions={
                <>
                  <button className="action-btn" onClick={() => acceptRequest(f.id, f.friend.id)} style={{ background: 'linear-gradient(135deg, #1e8a6a, #4cc9a8)', color: '#0a0a14' }}>Accepter</button>
                  <button className="action-btn" onClick={() => declineRequest(f.id)} style={{ background: 'transparent', color: 'rgba(201,76,76,0.6)', border: '1px solid rgba(201,76,76,0.2)' }}>Refuser</button>
                </>
              } />
            ))}
          </div>
        )}

        {activeTab === 'sent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📤</div>
                <div style={{ fontFamily: 'Cinzel, serif' }}>Aucune demande envoyée</div>
              </div>
            ) : sent.map(f => (
              <PlayerCard key={f.id} player={f.friend} actions={
                <button className="action-btn" onClick={() => declineRequest(f.id)} style={{ background: 'transparent', color: 'rgba(201,76,76,0.6)', border: '1px solid rgba(201,76,76,0.2)' }}>Annuler</button>
              } />
            ))}
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); searchPlayers(e.target.value) }}
              placeholder="Rechercher un joueur par pseudo..."
              style={{ width: '100%', padding: '10px 14px', background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: '#e8e0cc', fontSize: '0.88rem', outline: 'none', marginBottom: '16px', boxSizing: 'border-box', fontFamily: 'Rajdhani, sans-serif' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {searchResults.map(player => {
                const isFriend = friends.some(f => f.friend?.id === player.id)
                const isPending = sent.some(f => f.friend?.id === player.id)
                return (
                  <PlayerCard key={player.id} player={player} actions={
                    isFriend ? (
                      <span style={{ fontSize: '0.75rem', color: '#4cc9a8', fontFamily: 'Rajdhani, sans-serif' }}>✓ Ami</span>
                    ) : isPending ? (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(201,168,76,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>En attente...</span>
                    ) : (
                      <button className="action-btn" onClick={() => sendRequest(player.id)} style={{ background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14' }}>+ Ajouter</button>
                    )
                  } />
                )
              })}
            </div>
          </div>
        )}
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
