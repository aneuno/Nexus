'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function PlayPage() {
  const [profile, setProfile] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [message, setMessage] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, avatars(*)')
        .eq('id', session.user.id)
        .single()
      setProfile(prof)

      await loadRooms()
      setLoading(false)
    }
    load()

    const interval = setInterval(loadRooms, 5000)
    return () => clearInterval(interval)
  }, [])

  async function loadRooms() {
    const { data } = await supabase
      .from('game_rooms')
      .select('*, profiles!game_rooms_host_id_fkey(id, username, avatar, avatar_id)')
      .eq('status', 'waiting')
      .eq('is_private', false)
      .is('guest_id', null)
      .order('created_at', { ascending: false })

    if (!data) return

    const avatarIds = data.map(r => r.profiles?.avatar_id).filter(Boolean)
    const { data: avatars } = avatarIds.length > 0
      ? await supabase.from('avatars').select('id, image_url').in('id', avatarIds)
      : { data: [] }

    const result = data.map(r => ({
      ...r,
      host: {
        ...r.profiles,
        avatars: avatars?.find((a: any) => a.id === r.profiles?.avatar_id) || null
      }
    }))

    setRooms(result)
  }

  async function createRoom() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setCreating(true)

    // Vérifier si l'hôte a déjà une room active
    const { data: existing } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('host_id', session.user.id)
      .in('status', ['waiting', 'ready'])
      .single()

    if (existing) {
      window.location.href = `/play/${existing.id}`
      return
    }

    const code = isPrivate ? roomCode.trim().toUpperCase() : null
    if (isPrivate && !code) {
      setMessage({ type: 'error', text: 'Entrez un code pour la room privée !' })
      setTimeout(() => setMessage(null), 3000)
      setCreating(false)
      return
    }

    const { data: room } = await supabase
      .from('game_rooms')
      .insert({
        host_id: session.user.id,
        is_private: isPrivate,
        room_code: code,
        status: 'waiting'
      })
      .select()
      .single()

    if (room) {
      window.location.href = `/play/${room.id}`
    }
    setCreating(false)
  }

  async function joinRoom(roomId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (!room) {
      setMessage({ type: 'error', text: 'Room introuvable !' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (room.guest_id) {
      setMessage({ type: 'error', text: 'Cette room est déjà pleine !' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    await supabase.from('game_rooms').update({
      guest_id: session.user.id,
      status: 'waiting'
    }).eq('id', roomId)

    window.location.href = `/play/${roomId}`
  }

  async function joinByCode() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const code = joinCode.trim().toUpperCase()
    if (!code) return

    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', code)
      .eq('is_private', true)
      .in('status', ['waiting'])
      .single()

    if (!room) {
      setMessage({ type: 'error', text: 'Code invalide ou room introuvable !' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (room.guest_id && room.guest_id !== session.user.id) {
      setMessage({ type: 'error', text: 'Cette room est déjà pleine !' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    if (room.host_id === session.user.id) {
      window.location.href = `/play/${room.id}`
      return
    }

    await supabase.from('game_rooms').update({
      guest_id: session.user.id
    }).eq('id', room.id)

    window.location.href = `/play/${room.id}`
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
      Chargement...
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e0cc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        .room-card {
          background: #0f0f1e; border: 1px solid rgba(201,168,76,0.2);
          border-radius: 10px; padding: 16px;
          display: flex; align-items: center; gap: 14px;
          transition: all 0.2s;
        }
        .room-card:hover { border-color: rgba(201,168,76,0.5); }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <a href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontFamily: 'Rajdhani, sans-serif' }}>← Menu</a>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Jouer</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowCreate(true)} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer', letterSpacing: '0.1em' }}>
          + Créer une table
        </button>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', maxWidth: '800px', width: '100%', margin: '0 auto' }}>

        {/* Rejoindre par code */}
        <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: 'rgba(201,168,76,0.6)', marginBottom: '12px', letterSpacing: '0.1em' }}>REJOINDRE UNE TABLE PRIVÉE</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Entrez le code..."
              maxLength={10}
              style={{ flex: 1, padding: '10px 14px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: '#e8e0cc', fontSize: '0.95rem', outline: 'none', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.2em' }}
            />
            <button onClick={joinByCode} style={{ padding: '10px 20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: '#c9a84c', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>
              Rejoindre
            </button>
          </div>
        </div>

        {/* Tables publiques */}
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: 'rgba(201,168,76,0.6)', marginBottom: '14px', letterSpacing: '0.1em' }}>
          TABLES PUBLIQUES ({rooms.length})
        </div>

        {rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚔️</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem' }}>Aucune table disponible</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'rgba(201,168,76,0.3)' }}>Créez la première table !</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {rooms.map(room => (
              <div key={room.id} className="room-card">
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#141428', border: '2px solid rgba(201,168,76,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  {room.host?.avatars?.image_url ? (
                    <img src={room.host.avatars.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : room.host?.avatar || '🐉'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: '#c9a84c', marginBottom: '2px' }}>{room.host?.username}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(232,224,204,0.4)' }}>En attente d'un adversaire...</div>
                </div>
                <button
                  onClick={() => joinRoom(room.id)}
                  style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #6a1e8a, #9b4cc9)', color: '#e8e0cc', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.78rem', cursor: 'pointer', letterSpacing: '0.05em' }}
                >
                  Rejoindre
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal créer une table */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '28px', maxWidth: '400px', width: '100%' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', marginBottom: '20px', letterSpacing: '0.1em' }}>Créer une table</div>

            {/* Public / Privé */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => setIsPrivate(false)}
                style={{ flex: 1, padding: '10px', background: !isPrivate ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${!isPrivate ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`, borderRadius: '6px', color: !isPrivate ? '#c9a84c' : 'rgba(232,224,204,0.4)', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.85rem', cursor: 'pointer', letterSpacing: '0.1em' }}
              >
                🌐 Publique
              </button>
              <button
                onClick={() => setIsPrivate(true)}
                style={{ flex: 1, padding: '10px', background: isPrivate ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${isPrivate ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`, borderRadius: '6px', color: isPrivate ? '#c9a84c' : 'rgba(232,224,204,0.4)', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.85rem', cursor: 'pointer', letterSpacing: '0.1em' }}
              >
                🔒 Privée
              </button>
            </div>

            {/* Code si privé */}
            {isPrivate && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>Code de la room</label>
                <input
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Ex: NEXUS42"
                  maxLength={10}
                  style={{ width: '100%', padding: '10px 14px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.2em' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '5px', color: 'rgba(232,224,204,0.5)', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>
                Annuler
              </button>
              <button onClick={createRoom} disabled={creating} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '5px', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', letterSpacing: '0.1em', opacity: creating ? 0.7 : 1 }}>
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

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
