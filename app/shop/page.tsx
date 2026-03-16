'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ShopPage() {
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('void')
  const [voidItems, setVoidItems] = useState<any[]>([])
  const [icons, setIcons] = useState<any[]>([])
  const [banners, setBanners] = useState<any[]>([])
  const [titles, setTitles] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [owned, setOwned] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState<any>(null)
  const [message, setMessage] = useState<any>(null)
  const [preview, setPreview] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: inv } = await supabase.from('player_inventory').select('item_id').eq('player_id', session.user.id)
      if (inv) setOwned(inv.map((i: any) => i.item_id))

      const { data: items } = await supabase.from('shop_items').select('*').eq('is_active', true)
      if (items) {
        setVoidItems(items.filter((i: any) => i.item_type === 'booster'))
        setIcons(items.filter((i: any) => i.item_type === 'avatar'))
        setBanners(items.filter((i: any) => i.item_type === 'banner'))
        setTitles(items.filter((i: any) => i.item_type === 'title'))
        setBadges(items.filter((i: any) => i.item_type === 'badge'))
      }

      setLoading(false)
    }
    load()
  }, [])

  const tabs = [
    { id: 'void', label: '🌀 Void' },
    { id: 'icons', label: '👤 Icônes' },
    { id: 'banners', label: '🖼️ Bannières' },
    { id: 'titles', label: '📜 Titres' },
    { id: 'badges', label: '🏅 Badges' },
  ]

  const rarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: 'rgba(180,180,180,0.7)',
      rare: '#4c99c9',
      epic: '#9b4cc9',
      legendary: '#c9a84c'
    }
    return colors[rarity] || 'rgba(201,168,76,0.3)'
  }

  async function buyItem(item: any) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const useCoins = item.price_coins > 0
    const useCrystals = item.price_crystals > 0

    if (useCoins && profile.nexus_coins < item.price_coins) {
      setMessage({ type: 'error', text: 'Nexus Coins insuffisants !' })
      setTimeout(() => setMessage(null), 3000)
      setConfirm(null)
      return
    }
    if (useCrystals && profile.crystals < item.price_crystals) {
      setMessage({ type: 'error', text: 'Cristaux insuffisants !' })
      setTimeout(() => setMessage(null), 3000)
      setConfirm(null)
      return
    }

    const updates: any = {}
    if (useCoins) updates.nexus_coins = profile.nexus_coins - item.price_coins
    if (useCrystals) updates.crystals = profile.crystals - item.price_crystals
    await supabase.from('profiles').update(updates).eq('id', session.user.id)

    if (item.item_type !== 'booster') {
      await supabase.from('player_inventory').insert({
        player_id: session.user.id,
        item_type: item.item_type,
        item_id: item.item_id,
        obtained_from: 'shop'
      })
      setOwned(prev => [...prev, item.item_id])
    }

    await supabase.from('transactions').insert({
      player_id: session.user.id,
      item_id: item.id,
      item_name: item.name,
      cost_coins: item.price_coins,
      cost_crystals: item.price_crystals
    })

    setProfile((prev: any) => ({ ...prev, ...updates }))
    setMessage({ type: 'success', text: `"${item.name}" acheté avec succès !` })
    setTimeout(() => setMessage(null), 3000)
    setConfirm(null)
  }

  const ItemCard = ({ item }: { item: any }) => {
    const isOwned = owned.includes(item.item_id)
    const isVoid = item.item_type === 'booster'
    const rc = rarityColor(item.rarity || 'common')

    return (
      <div style={{
        background: '#0f0f1e',
        border: `1px solid ${isOwned && !isVoid ? 'rgba(201,168,76,0.15)' : rc + '40'}`,
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        opacity: isOwned && !isVoid ? 0.6 : 1,
        position: 'relative',
        transition: 'all 0.2s'
      }}>
        {isOwned && !isVoid && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '2px 8px', fontSize: '0.62rem', color: '#c9a84c', letterSpacing: '0.1em' }}>
            POSSÉDÉ
          </div>
        )}

        {/* Image */}
        <div style={{
          width: '100%',
          height: item.item_type === 'avatar' ? '120px' : item.item_type === 'banner' ? '80px' : '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#141428',
          borderRadius: '6px',
          border: `1px solid ${rc}30`
        }}>
          {item.image_url ? (
            item.item_type === 'avatar' ? (
              <div
                onClick={() => setPreview(item)}
                style={{
                  width: '90px', height: '90px',
                  borderRadius: '50%', overflow: 'hidden',
                  border: `2px solid ${rc}`,
                  cursor: 'zoom-in', flexShrink: 0
                }}
              >
                <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <img
                src={item.image_url}
                alt={item.name}
                onClick={() => setPreview(item)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in', borderRadius: '6px' }}
              />
            )
          ) : (
            <span style={{ fontSize: '2rem', opacity: 0.3 }}>
              {item.item_type === 'booster' ? '🌀' : item.item_type === 'avatar' ? '👤' : item.item_type === 'banner' ? '🖼️' : item.item_type === 'title' ? '📜' : '🏅'}
            </span>
          )}
        </div>

        {/* Infos */}
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: rc, marginBottom: '2px' }}>{item.name}</div>
          {item.description && <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.5)', lineHeight: '1.4' }}>{item.description}</div>}
        </div>

        {/* Prix */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {item.price_coins > 0 && (
            <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '3px 8px', fontSize: '0.75rem', color: '#c9a84c' }}>
              ✦ {item.price_coins}
            </span>
          )}
          {item.price_crystals > 0 && (
            <span style={{ background: 'rgba(76,201,168,0.1)', border: '1px solid rgba(76,201,168,0.3)', borderRadius: '10px', padding: '3px 8px', fontSize: '0.75rem', color: '#4cc9a8' }}>
              ◈ {item.price_crystals}
            </span>
          )}
        </div>

        {/* Bouton achat */}
        {!isOwned || isVoid ? (
          <button
            onClick={() => setConfirm(item)}
            style={{
              width: '100%', padding: '9px',
              background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)',
              color: '#0a0a14', border: 'none', borderRadius: '5px',
              fontFamily: 'Cinzel, serif', fontSize: '0.78rem',
              letterSpacing: '0.1em', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Acheter
          </button>
        ) : (
          <div style={{ width: '100%', padding: '9px', background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '5px', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(201,168,76,0.4)' }}>
            Déjà possédé
          </div>
        )}
      </div>
    )
  }

  const EmptyState = ({ icon, text }: { icon: string, text: string }) => (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{icon}</div>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem' }}>{text}</div>
      <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'rgba(201,168,76,0.3)' }}>Revenez bientôt</div>
    </div>
  )

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
      Chargement...
    </main>
  )

  const currentItems = {
    void: voidItems,
    icons: icons,
    banners: banners,
    titles: titles,
    badges: badges
  }[activeTab] || []

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e0cc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        .tab-btn {
          padding: 10px 18px; background: transparent;
          border: none; border-bottom: 2px solid transparent;
          color: rgba(232,224,204,0.5); cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 0.85rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 0.2s; white-space: nowrap;
        }
        .tab-btn.active { color: #c9a84c; border-bottom-color: #c9a84c; }
        .tab-btn:hover { color: #e8e0cc; }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <a href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontFamily: 'Rajdhani, sans-serif' }}>← Menu</a>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Boutique</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', color: '#c9a84c' }}>✦ {profile?.nexus_coins ?? 0}</span>
          <span style={{ background: '#141428', border: '1px solid rgba(76,201,168,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', color: '#4cc9a8' }}>◈ {profile?.crystals ?? 0}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'rgba(10,10,20,0.95)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '0 20px', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Description Void */}
      {activeTab === 'void' && (
        <div style={{ padding: '16px 20px', background: 'rgba(155,76,201,0.06)', borderBottom: '1px solid rgba(155,76,201,0.15)' }}>
          <div style={{ fontFamily: 'Cinzel, serif', color: '#9b4cc9', fontSize: '0.88rem', marginBottom: '4px' }}>Le Void</div>
          <div style={{ fontSize: '0.78rem', color: 'rgba(232,224,204,0.5)', lineHeight: '1.5' }}>
            Ouvrez des portails dimensionnels pour invoquer des cartes du multivers. Les boosters Void nécessitent des Cristaux.
          </div>
        </div>
      )}

      {/* Grille items */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {currentItems.length === 0 ? (
          <EmptyState
            icon={activeTab === 'void' ? '🌀' : activeTab === 'icons' ? '👤' : activeTab === 'banners' ? '🖼️' : activeTab === 'titles' ? '📜' : '🏅'}
            text="Aucun article disponible pour le moment"
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: activeTab === 'titles' ? '1fr' : activeTab === 'banners' ? 'repeat(auto-fill, minmax(260px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '14px'
          }}>
            {currentItems.map((item: any) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Modal confirmation achat */}
      {confirm && (
        <div onClick={() => setConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '28px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', marginBottom: '8px' }}>Confirmer l'achat</div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(232,224,204,0.7)', marginBottom: '16px' }}>
              Acheter <span style={{ color: '#c9a84c' }}>{confirm.name}</span> ?
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {confirm.price_coins > 0 && (
                <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '4px 12px', fontSize: '0.82rem', color: '#c9a84c' }}>
                  ✦ {confirm.price_coins}
                </span>
              )}
              {confirm.price_crystals > 0 && (
                <span style={{ background: 'rgba(76,201,168,0.1)', border: '1px solid rgba(76,201,168,0.3)', borderRadius: '10px', padding: '4px 12px', fontSize: '0.82rem', color: '#4cc9a8' }}>
                  ◈ {confirm.price_crystals}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '5px', color: 'rgba(232,224,204,0.5)', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.88rem' }}>
                Annuler
              </button>
              <button onClick={() => buyItem(confirm)} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '5px', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', letterSpacing: '0.1em' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal preview image */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '20px', cursor: 'zoom-out' }}>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: preview.item_type === 'avatar' ? '200px' : '500px',
              height: preview.item_type === 'avatar' ? '200px' : preview.item_type === 'banner' ? '160px' : '300px',
              borderRadius: preview.item_type === 'avatar' ? '50%' : '12px',
              overflow: 'hidden',
              border: `2px solid ${rarityColor(preview.rarity || 'common')}`,
              boxShadow: `0 0 40px ${rarityColor(preview.rarity || 'common')}40`
            }}>
              <img src={preview.image_url} alt={preview.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem' }}>{preview.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(232,224,204,0.4)' }}>Cliquez n'importe où pour fermer</div>
          </div>
        </div>
      )}

      {/* Message succès/erreur */}
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
