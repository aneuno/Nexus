'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('wins')
  const [players, setPlayers] = useState<any[]>([])
  const [myId, setMyId] = useState<string | null>(null)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const tabs = [
    { id: 'wins', label: '⚔️ Victoires', field: 'wins' },
    { id: 'cards', label: '🎴 Cartes', field: 'cards' },
    { id: 'coins', label: '✦ Coins', field: 'nexus_coins' },
    { id: 'crystals', label: '◈ Cristaux', field: 'crystals' },
    { id: 'rank', label: '★ Rang', field: 'rank_points' },
  ]

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setMyId(session.user.id)
      await loadLeaderboardWithId(session.user.id, 'wins')
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!myId) return
    loadLeaderboardWithId(myId, activeTab)
  }, [activeTab])

  async function loadLeaderboardWithId(userId: string, tab: string) {
    setLoading(true)
    const tabObj = tabs.find(t => t.id === tab)
    if (!tabObj) return

    if (tab === 'cards') {
      const { data } = await supabase
        .from('player_cards')
        .select('player_id, quantity')

      if (!data) { setLoading(false); return }

      const countMap: Record<string, number> = {}
      for (const row of data) {
        countMap[row.player_id] = (countMap[row.player_id] || 0) + row.quantity
      }

      const sorted = Object.entries(countMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50)

      const playerIds = sorted.map(([id]) => id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar, rank, avatar_id, avatars(image_url)')
        .in('id', playerIds)

      const result = sorted.map(([id, count], index) => {
        const profile = profiles?.find(p => p.id === id)
        return { ...profile, _value: count, _rank: index + 1 }
      })

      setPlayers(result)
      const myIndex = result.findIndex(p => p.id === userId)
      setMyRank(myIndex >= 0 ? myIndex + 1 : null)
    } else {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar, rank, rank_points, wins, nexus_coins, crystals, avatar_id, avatars(image_url)')
        .order(tabObj.field, { ascending: false })
        .limit(50)

      if (!data) { setLoading(false); return }

      const result = data.map((p, i) => ({
        ...p,
        _value: p[tabObj.field],
        _rank: i + 1
      }))

      setPlayers(result)
      const myIndex = result.findIndex(p => p.id === userId)
      setMyRank(myIndex >= 0 ? myIndex + 1 : null)
    }

    setLoading(false)
  }

  const rankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'
    if (rank === 2) return '#C0C0C0'
    if (rank === 3) return '#CD7F32'
    return 'rgba(201,168,76,0.4)'
  }

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '👑'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const valueLabel = (value: number) => {
    if (activeTab === 'coins') return `✦ ${value?.toLocaleString()}`
    if (activeTab === 'crystals') return `◈ ${value?.toLocaleString()}`
    if (activeTab === 'rank') return `${value?.toLocaleString()} pts`
    return value?.toLocaleString()
  }

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
        .player-row {
          display: flex; align-items: center; gap: 12px;
          background: #0f0f1e; border: 1px solid rgba(201,168,76,0.15);
          border-radius: 8px; padding: 12px 16px;
          transition: all 0.2s; text-decoration: none; color: inherit;
        }
        .player-row:hover { border-color: rgba(201,168,76,0.4); background: rgba(201,168,76,0.04); }
        .player-row.me { border-color: rgba(201,168,76,0.5); background: rgba(201,168,76,0.06); }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => window.history.back()} style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>← Retour</button>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Classement</span>
      </div>

      {/* Tabs */}
      <div style={{ background: 'rgba(10,10,20,0.95)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '0 20px', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {!loading && players.length >= 3 && (
        <div style={{ padding: '24px 20px 0', display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'flex-end' }}>
          {/* 2ème */}
          <div style={{ textAlign: 'center', flex: 1, maxWidth: '140px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid #C0C0C0', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
              {players[1]?.avatars?.image_url ? <img src={players[1].avatars.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : players[1]?.avatar || '🐉'}
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#C0C0C0', marginBottom: '2px' }}>{players[1]?.username}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)', marginBottom: '6px' }}>{valueLabel(players[1]?._value)}</div>
            <div style={{ background: 'rgba(192,192,192,0.1)', border: '1px solid rgba(192,192,192,0.3)', borderRadius: '6px 6px 0 0', padding: '10px 0', fontSize: '1.4rem' }}>🥈</div>
          </div>

          {/* 1er */}
          <div style={{ textAlign: 'center', flex: 1, maxWidth: '140px' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', border: '3px solid #FFD700', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 0 20px rgba(255,215,0,0.3)' }}>
              {players[0]?.avatars?.image_url ? <img src={players[0].avatars.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : players[0]?.avatar || '🐉'}
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: '#FFD700', marginBottom: '2px' }}>{players[0]?.username}</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(232,224,204,0.5)', marginBottom: '6px' }}>{valueLabel(players[0]?._value)}</div>
            <div style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.4)', borderRadius: '6px 6px 0 0', padding: '14px 0', fontSize: '1.6rem' }}>👑</div>
          </div>

          {/* 3ème */}
          <div style={{ textAlign: 'center', flex: 1, maxWidth: '140px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid #CD7F32', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
              {players[2]?.avatars?.image_url ? <img src={players[2].avatars.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : players[2]?.avatar || '🐉'}
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: '#CD7F32', marginBottom: '2px' }}>{players[2]?.username}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)', marginBottom: '6px' }}>{valueLabel(players[2]?._value)}</div>
            <div style={{ background: 'rgba(205,127,50,0.1)', border: '1px solid rgba(205,127,50,0.3)', borderRadius: '6px 6px 0 0', padding: '8px 0', fontSize: '1.4rem' }}>🥉</div>
          </div>
        </div>
      )}

      {/* Liste */}
      <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', maxWidth: '700px', width: '100%', margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>Chargement...</div>
        ) : players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏆</div>
            <div style={{ fontFamily: 'Cinzel, serif' }}>Aucun joueur pour le moment</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {players.slice(3).map((player) => (
              <a key={player.id} href={`/profile/${player.id}`} className={`player-row ${player.id === myId ? 'me' : ''}`}>
                <div style={{ width: '32px', textAlign: 'center', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: rankColor(player._rank), flexShrink: 0 }}>
                  {rankEmoji(player._rank)}
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#141428', border: `1px solid ${player.id === myId ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.2)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  {player.avatars?.image_url ? (
                    <img src={player.avatars.image_url} alt={player.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : player.avatar || '🐉'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: player.id === myId ? '#c9a84c' : '#e8e0cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.username} {player.id === myId ? '(moi)' : ''}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(201,168,76,0.4)' }}>★ {player.rank}</div>
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: '#c9a84c', flexShrink: 0 }}>
                  {valueLabel(player._value)}
                </div>
              </a>
            ))}
          </div>
        )}

        {!loading && myRank === null && players.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', textAlign: 'center', fontSize: '0.82rem', color: 'rgba(201,168,76,0.5)' }}>
            Vous n'êtes pas dans le top 50
          </div>
        )}
      </div>
    </main>
  )
}
