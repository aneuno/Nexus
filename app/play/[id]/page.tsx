'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LobbyPage({ params }: { params: { id: string } }) {
  const [myId, setMyId] = useState<string | null>(null)
  const [room, setRoom] = useState<any>(null)
  const [host, setHost] = useState<any>(null)
  const [guest, setGuest] = useState<any>(null)
  const [myDecks, setMyDecks] = useState<any[]>([])
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<any>(null)
  const [isHost, setIsHost] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setMyId(session.user.id)

      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!roomData) { window.location.href = '/play'; return }
      setRoom(roomData)
      setIsHost(roomData.host_id === session.user.id)

      // Charger les profils
      await loadProfiles(roomData)

      // Charger mes decks
      const { data: decks } = await supabase
        .from('player_decks')
        .select('*, card_backs(*), deck_skins(*)')
        .eq('player_id', session.user.id)
        .order('created_at', { ascending: false })
      setMyDecks(decks || [])

      // Pré-sélectionner le deck actif
      const activeD = decks?.find(d => d.is_active)
      if (activeD) setSelectedDeck(activeD.id)

      setLoading(false)
    }
    load()

    // Polling toutes les 2 secondes
    const interval = setInterval(async () => {
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!roomData) return
      setRoom(roomData)
      await loadProfiles(roomData)

      // Si les deux sont prêts → lancer la partie
      if (roomData.host_ready && roomData.guest_ready && roomData.status === 'ready') {
        window.location.href = `/game/${params.id}`
      }

      // Si la room est annulée
      if (roomData.status === 'cancelled') {
        window.location.href = '/play'
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  async function loadProfiles(roomData: any) {
    if (roomData.host_id) {
      const { data: h } = await supabase
        .from('profiles')
        .select('id, username, avatar, rank, avatar_id')
        .eq('id', roomData.host_id)
        .single()
      if (h) {
        const { data: av } = h.avatar_id
          ? await supabase.from('avatars').select('image_url').eq('id', h.avatar_id).single()
          : { data: null }
        setHost({ ...h, avatars: av })
      }
    }
    if (roomData.guest_id) {
      const { data: g } = await supabase
        .from('profiles')
        .select('id, username, avatar, rank, avatar_id')
        .eq('id', roomData.guest_id)
        .single()
      if (g) {
        const { data: av } = g.avatar_id
          ? await supabase.from('avatars').select('image_url').eq('id', g.avatar_id).single()
          : { data: null }
        setGuest({ ...g, avatars: av })
      }
    }
  }

  async function setReady() {
    if (!selectedDeck) {
      setMessage({ type: 'error', text: 'Choisissez un deck avant de vous déclarer prêt !' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const updates: any = isHost
      ? { host_ready: true, host_deck_id: selectedDeck }
      : { guest_ready: true, guest_deck_id: selectedDeck }

    await supabase.from('game_rooms').update(updates).eq('id', params.id)

    // Vérifier si les deux sont prêts
    const { data: updatedRoom } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', params.id)
      .single()

    if (updatedRoom) {
      const hostReady = isHost ? true : updatedRoom.host_ready
      const guestReady = !isHost ? true : updatedRoom.guest_ready
      if (hostReady && guestReady && updatedRoom.guest_id) {
        await supabase.from('game_rooms').update({ status: 'ready' }).eq('id', params.id)
      }
    }

    setRoom((prev: any) => ({ ...prev, ...updates }))
  }

  async function cancelReady() {
    const updates: any = isHost
      ? { host_ready: false }
      : { guest_ready: false }
    await supabase.from('game_rooms').update(updates).eq('id', params.id)
    setRoom((prev: any) => ({ ...prev, ...updates }))
  }

  async function leaveRoom() {
    if (isHost) {
      await supabase.from('game_rooms').update({ status: 'cancelled' }).eq('id', params.id)
    } else {
      await supabase.from('game_rooms').update({ guest_id: null, guest_ready: false, guest_deck_id: null }).eq('id', params.id)
    }
    window.location.href = '/play'
  }

  const myReady = isHost ? room?.host_ready : room?.guest_ready
  const opponentReady = isHost ? room?.guest_ready : room?.host_ready
  const opponent = isHost ? guest : host

  const rarityColor = (rarity: string) => {
    const colors: Record<string, string> = { common: 'rgba(180,180,180,0.7)', rare: '#4c99c9', epic: '#9b4cc9', legendary: '#c9a84c' }
    return colors[rarity] || 'rgba(201,168,76,0.3)'
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
        @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        .deck-pick {
          background: #0f0f1e; border: 2px solid rgba(201,168,76,0.2);
          border-radius: 8px; padding: 10px; cursor: pointer;
          transition: all 0.2s; display: flex; align-items: center; gap: 10px;
        }
        .deck-pick:hover { border-color: rgba(201,168,76,0.5); }
        .deck-pick.selected { border-color: #c9a84c; background: rgba(201,168,76,0.08); }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={leaveRoom} style={{ fontSize: '0.8rem', color: 'rgba(201,76,76,0.6)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>← Quitter</button>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Lobby</span>
        {room?.is_private && room?.room_code && (
          <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '3px 10px', fontSize: '0.78rem', color: '#c9a84c', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.2em' }}>
            🔒 {room.room_code}
          </span>
        )}
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', maxWidth: '800px', width: '100%', margin: '0 auto' }}>

        {/* VS Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>

          {/* Joueur 1 (hôte) */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', border: `3px solid ${room?.host_ready ? '#4cc9a8' : 'rgba(201,168,76,0.4)'}`, background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', transition: 'border-color 0.3s' }}>
              {host?.avatars?.image_url ? <img src={host.avatars.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : host?.avatar || '🐉'}
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>{host?.username}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.4)' }}>★ {host?.rank}</div>
            <div style={{ marginTop: '6px', fontSize: '0.72rem', color: room?.host_ready ? '#4cc9a8' : 'rgba(232,224,204,0.3)', fontFamily: 'Rajdhani, sans-serif' }}>
              {room?.host_ready ? '✓ Prêt' : 'En attente...'}
            </div>
          </div>

          {/* VS */}
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.8rem', color: 'rgba(201,168,76,0.4)', flexShrink: 0 }}>VS</div>

          {/* Joueur 2 (guest) */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            {guest ? (
              <>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', border: `3px solid ${room?.guest_ready ? '#4cc9a8' : 'rgba(201,168,76,0.4)'}`, background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', transition: 'border-color 0.3s' }}>
                  {guest?.avatars?.image_url ? <img src={guest.avatars.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : guest?.avatar || '🐉'}
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>{guest?.username}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.4)' }}>★ {guest?.rank}</div>
                <div style={{ marginTop: '6px', fontSize: '0.72rem', color: room?.guest_ready ? '#4cc9a8' : 'rgba(232,224,204,0.3)', fontFamily: 'Rajdhani, sans-serif' }}>
                  {room?.guest_ready ? '✓ Prêt' : 'En attente...'}
                </div>
              </>
            ) : (
              <>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 8px', border: '3px dashed rgba(201,168,76,0.2)', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
                  <span style={{ fontSize: '1.8rem', opacity: 0.3 }}>?</span>
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: 'rgba(201,168,76,0.3)' }}>En attente...</div>
              </>
            )}
          </div>
        </div>

        {/* Sélection de deck */}
        <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.1em', marginBottom: '12px' }}>CHOISIR MON DECK</div>

          {myDecks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(201,168,76,0.4)' }}>
              <div style={{ fontSize: '0.82rem', marginBottom: '8px' }}>Aucun deck créé</div>
              <a href="/decks" style={{ color: '#c9a84c', fontSize: '0.78rem' }}>Créer un deck →</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myDecks.map(deck => (
                <div key={deck.id} className={`deck-pick ${selectedDeck === deck.id ? 'selected' : ''}`} onClick={() => !myReady && setSelectedDeck(deck.id)}>
                  <div style={{ width: '36px', height: '50px', borderRadius: '4px', overflow: 'hidden', background: '#141428', border: '1px solid rgba(201,168,76,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {deck.deck_skins?.image_url ? <img src={deck.deck_skins.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1rem', opacity: 0.3 }}>🗂️</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: selectedDeck === deck.id ? '#c9a84c' : '#e8e0cc' }}>{deck.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(201,168,76,0.4)' }}>
                      {deck.cards?.reduce((s: number, c: any) => s + c.quantity, 0) || 0} cartes
                      {deck.is_active && <span style={{ marginLeft: '6px', color: '#4cc9a8' }}>· Actif</span>}
                    </div>
                  </div>
                  {selectedDeck === deck.id && <span style={{ color: '#c9a84c', fontSize: '1rem' }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bouton Prêt */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {!myReady ? (
            <button
              onClick={setReady}
              disabled={!selectedDeck || !guest}
              style={{ flex: 1, padding: '14px', background: selectedDeck && guest ? 'linear-gradient(135deg, #1e8a6a, #4cc9a8)' : 'rgba(201,168,76,0.05)', color: selectedDeck && guest ? '#0a0a14' : 'rgba(201,168,76,0.3)', border: `1px solid ${selectedDeck && guest ? 'transparent' : 'rgba(201,168,76,0.2)'}`, borderRadius: '8px', fontFamily: 'Cinzel, serif', fontSize: '0.92rem', letterSpacing: '0.1em', cursor: selectedDeck && guest ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}
            >
              {!guest ? 'En attente d\'un adversaire...' : !selectedDeck ? 'Choisissez un deck' : '✓ Je suis prêt !'}
            </button>
          ) : (
            <button
              onClick={cancelReady}
              style={{ flex: 1, padding: '14px', background: 'rgba(201,76,76,0.1)', color: '#e88080', border: '1px solid rgba(201,76,76,0.3)', borderRadius: '8px', fontFamily: 'Cinzel, serif', fontSize: '0.92rem', letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              Annuler
            </button>
          )}
        </div>

        {/* Statut */}
        {room?.host_ready && room?.guest_ready && (
          <div style={{ textAlign: 'center', marginTop: '16px', fontFamily: 'Cinzel, serif', color: '#4cc9a8', fontSize: '0.88rem', animation: 'pulse 1s ease-in-out infinite' }}>
            ⚔️ La partie commence...
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
