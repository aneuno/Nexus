'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('player_id', session.user.id)
        .order('created_at', { ascending: false })
      setNotifications(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('notifications').update({ is_read: true }).eq('player_id', session.user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function deleteNotification(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const typeIcon = (type: string) => {
    const icons: Record<string, string> = {
      friend_request: '👥',
      friend_accepted: '✅',
      system: '📢',
      duel: '⚔️',
      reward: '🎁',
    }
    return icons[type] || '🔔'
  }

  const typeColor = (type: string) => {
    const colors: Record<string, string> = {
      friend_request: '#4c99c9',
      friend_accepted: '#4cc9a8',
      system: '#c9a84c',
      duel: '#9b4cc9',
      reward: '#c9a84c',
    }
    return colors[type] || 'rgba(201,168,76,0.5)'
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `Il y a ${minutes}min`
    if (hours < 24) return `Il y a ${hours}h`
    return `Il y a ${days}j`
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
        .notif-row {
          background: #0f0f1e; border-radius: 8px; padding: 14px 16px;
          display: flex; gap: 12px; align-items: flex-start;
          transition: all 0.2s; cursor: pointer;
          border: 1px solid rgba(201,168,76,0.1);
        }
        .notif-row.unread { border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.04); }
        .notif-row:hover { border-color: rgba(201,168,76,0.4); }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => window.history.back()} style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>← Retour</button>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Notifications</span>
        {unreadCount > 0 && (
          <span style={{ background: '#c9a84c', color: '#0a0a14', borderRadius: '10px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'Rajdhani, sans-serif' }}>
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: 'rgba(201,168,76,0.5)', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', maxWidth: '700px', width: '100%', margin: '0 auto' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔔</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem' }}>Aucune notification</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.map(n => (
              <div key={n.id} className={`notif-row ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && markRead(n.id)}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: typeColor(n.type) + '20', border: `1px solid ${typeColor(n.type)}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  {typeIcon(n.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: !n.is_read ? '#c9a84c' : 'rgba(232,224,204,0.7)' }}>{n.title}</div>
                    {!n.is_read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c9a84c', flexShrink: 0 }} />}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(232,224,204,0.5)', lineHeight: '1.4', marginBottom: '6px' }}>{n.message}</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(201,168,76,0.3)' }}>{timeAgo(n.created_at)}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteNotification(n.id) }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(201,76,76,0.4)', cursor: 'pointer', fontSize: '1rem', padding: '4px', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
