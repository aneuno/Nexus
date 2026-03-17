'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function InventoryPage() {
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('cards')
  const [playerCards, setPlayerCards] = useState<any[]>([])
  const [avatars, setAvatars] = useState<any[]>([])
  const [banners, setBanners] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [titles, setTitles] = useState<any[]>([])
  const [cardBacks, setCardBacks] = useState<any[]>([])
  const [deckSkins, setDeckSkins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: pc } = await supabase.from('player_cards').select('*, cards(*)').eq('player_id', session.user.id)
      setPlayerCards(pc || [])

      const { data: inv } = await supabase.from('player_inventory').select('*').eq('player_id', session.user.id)

      if (inv) {
        const get = (type: string) => inv.filter(i => i.item_type === type).map(i => i.item_id)

        const avatarIds = get('avatar')
        const bannerIds = get('banner')
        const badgeIds = get('badge')
        const titleIds = get('title')
        const cardBackIds = get('card_back')
        const deckSkinIds = get('deck_skin')

        if (avatarIds.length > 0) { const { data } = await supabase.from('avatars').select('*').in('id', avatarIds); setAvatars(data || []) }
        if (bannerIds.length > 0) { const { data } = await supabase.from('banners').select('*').in('id', bannerIds); setBanners(data || []) }
        if (badgeIds.length > 0) { const { data } = await supabase.from('badges').select('*').in('id', badgeIds); setBadges(data || []) }
        if (titleIds.length > 0) { const { data } = await supabase.from('titles').select('*').in('id', titleIds); setTitles(data || []) }
        if (cardBackIds.length > 0) { const { data } = await supabase.from('card_backs').select('*').in('id', cardBackIds); setCardBacks(data || []) }
        if (deckSkinIds.length > 0) { const { data } = await supabase.from('deck_skins').select('*').in('id', deckSkinIds); setDeckSkins(data || []) }
      }

      setLoading(false)
    }
    load()
  }, [])

  const tabs = [
    { id: 'cards', label: '🎴 Cartes', count: playerCards.length },
    { id: 'avatars', label: '👤 PDP', count: avatars.length },
    { id: 'banners', label: '🖼️ Bannières', count: banners.length },
    { id: 'card_backs', label: '🎴 Dos', count: cardBacks.length },
    { id: 'deck_skins', label: '🗂️ Decks', count: deckSkins.length },
    { id: 'badges', label: '🏅 Badges', count: badges.length },
    { id: 'titles', label: '📜 Titres', count: titles.length },
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

  const rarityGlow = (rarity: string) => {
    const glows: Record<string, string> = {
      common: 'rgba(180,180,180,0.2)',
      rare: 'rgba(76,153,201,0.5)',
      epic: 'rgba(155,76,201,0.6)',
      legendary: 'rgba(201,168,76,0.8)'
    }
    return glows[rarity] || 'rgba(201,168,76,0.3)'
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
        .tab-btn { padding: 10px 16px; background: transparent; border: none; border-bottom: 2px solid transparent; color: rgba(232,224,204,0.5); cursor: pointer; font-family: 'Rajdhani', sans-serif; font-size: 0.82rem; letter-spacing: 0.1em; text-transform: uppercase; transition: all 0.2s; white-space: nowrap; }
        .tab-btn.active { color: #c9a84c; border-bottom-color: #c9a84c; }
        .tab-btn:hover { color: #e8e0cc; }
        .card-thumb { cursor: pointer; border-radius: 8px; overflow: hidden; transition: all 0.2s; }
        .card-thumb:hover { transform: translateY(-3px); filter: brightness(1.15); }
        .cosm-item { background: #0f0f1e; border: 1px solid rgba(201,168,76,0.2); border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s; text-align: center; }
        .cosm-item:hover { border-color: rgba(201,168,76,0.6); transform: translateY(-2px); }
        .cosm-item.equipped { border-color: #c9a84c; background: rgba(201,168,76,0.08); }
        .equip-btn { width: 100%; padding: 8px; margin-top: 8px; background: linear-gradient(135deg, #8a6a1e, #c9a84c); color: #0a0a14; border: none; border-radius: 4px; font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s; }
        .equip-btn:hover { filter: brightness(1.1); }
        .equip-btn.active { background: rgba(201,168,76,0.15); color: #c9a84c; border: 1px solid rgba(201,168,76,0.4); }
      `}</style>

      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => window.history.back()} style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>← Retour</button>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Inventaire</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', color: '#c9a84c' }}>✦ {profile?.nexus_coins ?? 0}</span>
          <span style={{ background: '#141428', border: '1px solid rgba(76,201,168,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', color: '#4cc9a8' }}>◈ {profile?.crystals ?? 0}</span>
        </div>
      </div>

      <div style={{ background: 'rgba(10,10,20,0.95)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '0 20px', display: 'flex', gap: '0', overflowX: 'auto', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
            <span style={{ marginLeft: '6px', fontSize: '0.68rem', color: activeTab === tab.id ? 'rgba(201,168,76,0.6)' : 'rgba(232,224,204,0.3)' }}>({tab.count})</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>

        {activeTab === 'cards' && (
          <div>
            {playerCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎴</div>
                Aucune carte dans votre collection
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                {playerCards.map(pc => (
                  <div key={pc.id} className="card-thumb" onClick={() => setSelected({ type: 'card', data: pc })}>
                    <div style={{ width: '100%', aspectRatio: '0.72', borderRadius: '8px', overflow: 'hidden', background: '#141428', border: '1px solid ' + rarityColor(pc.cards?.rarity) + '60', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {pc.cards?.image_url ? <img src={pc.cards.image_url} alt={pc.cards.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2rem', opacity: 0.2 }}>🎴</span>}
                      {pc.quantity > 1 && <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: '#c9a84c', fontSize: '0.65rem', fontWeight: 600, padding: '2px 5px', borderRadius: '3px' }}>x{pc.quantity}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'avatars' && (
          <div>
            {avatars.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>👤</div>
                Aucune photo de profil débloquée
                <div style={{ marginTop: '1rem' }}><a href="/shop" style={{ color: '#c9a84c', fontSize: '0.82rem' }}>Visiter la boutique →</a></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {avatars.map(av => (
                  <div key={av.id} className={`cosm-item ${profile?.avatar_id === av.id ? 'equipped' : ''}`}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid ' + rarityColor(av.rarity) }}>
                      <img src={av.image_url} alt={av.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#e8e0cc', marginBottom: '2px' }}>{av.name}</div>
                    <div style={{ fontSize: '0.65rem', color: rarityColor(av.rarity) }}>{av.universe || 'Nexus'}</div>
                    <button className={`equip-btn ${profile?.avatar_id === av.id ? 'active' : ''}`} onClick={() => equipItem('avatar_id', av.id)}>
                      {profile?.avatar_id === av.id ? '✓ Équipé' : 'Équiper'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'banners' && (
          <div>
            {banners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🖼️</div>
                Aucune bannière débloquée
                <div style={{ marginTop: '1rem' }}><a href="/shop" style={{ color: '#c9a84c', fontSize: '0.82rem' }}>Visiter la boutique →</a></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {banners.map(bn => (
                  <div key={bn.id} className={`cosm-item ${profile?.banner_id === bn.id ? 'equipped' : ''}`}>
                    <div style={{ width: '100%', height: '80px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px', border: '1px solid ' + rarityColor(bn.rarity) }}>
                      <img src={bn.image_url} alt={bn.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#e8e0cc', marginBottom: '2px' }}>{bn.name}</div>
                    <div style={{ fontSize: '0.65rem', color: rarityColor(bn.rarity) }}>{bn.universe || 'Nexus'}</div>
                    <button className={`equip-btn ${profile?.banner_id === bn.id ? 'active' : ''}`} onClick={() => equipItem('banner_id', bn.id)}>
                      {profile?.banner_id === bn.id ? '✓ Équipée' : 'Équiper'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'card_backs' && (
          <div>
            {cardBacks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎴</div>
                Aucun dos de carte débloqué
                <div style={{ marginTop: '1rem' }}><a href="/shop" style={{ color: '#c9a84c', fontSize: '0.82rem' }}>Visiter la boutique →</a></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {cardBacks.map(cb => (
                  <div key={cb.id} className="cosm-item">
                    <div style={{ width: '80px', height: '112px', borderRadius: '6px', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid ' + rarityColor(cb.rarity) }}>
                      {cb.image_url ? <img src={cb.image_url} alt={cb.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.3 }}>🎴</div>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#e8e0cc', marginBottom: '2px' }}>{cb.name}</div>
                    <div style={{ fontSize: '0.65rem', color: rarityColor(cb.rarity) }}>{cb.universe || 'Nexus'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'deck_skins' && (
          <div>
            {deckSkins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🗂️</div>
                Aucune apparence de deck débloquée
                <div style={{ marginTop: '1rem' }}><a href="/shop" style={{ color: '#c9a84c', fontSize: '0.82rem' }}>Visiter la boutique →</a></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {deckSkins.map(ds => (
                  <div key={ds.id} className="cosm-item">
                    <div style={{ width: '80px', height: '112px', borderRadius: '6px', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid ' + rarityColor(ds.rarity) }}>
                      {ds.image_url ? <img src={ds.image_url} alt={ds.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.3 }}>🗂️</div>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#e8e0cc', marginBottom: '2px' }}>{ds.name}</div>
                    <div style={{ fontSize: '0.65rem', color: rarityColor(ds.rarity) }}>{ds.universe || 'Nexus'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'badges' && (
          <div>
            {badges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏅</div>
                Aucun badge débloqué
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {badges.map(bg => (
                  <div key={bg.id} className="cosm-item">
                    <div style={{ width: '64px', height: '64px', margin: '0 auto 8px', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.3)' }}>
                      <img src={bg.image_url} alt={bg.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#c9a84c', marginBottom: '4px' }}>{bg.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(232,224,204,0.5)', lineHeight: '1.4' }}>{bg.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'titles' && (
          <div>
            {titles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📜</div>
                Aucun titre débloqué
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {titles.map(tl => (
                  <div key={tl.id} className={`cosm-item ${profile?.title_id === tl.id ? 'equipped' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', padding: '14px 16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: rarityColor(tl.rarity), marginBottom: '2px' }}>{tl.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(232,224,204,0.5)' }}>{tl.description}</div>
                    </div>
                    <button className={`equip-btn ${profile?.title_id === tl.id ? 'active' : ''}`} style={{ width: 'auto', padding: '6px 14px' }} onClick={() => equipItem('title_id', tl.id)}>
                      {profile?.title_id === tl.id ? '✓ Équipé' : 'Équiper'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selected?.type === 'card' && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: `2px solid ${rarityColor(selected.data.cards?.rarity)}`, borderRadius: '12px', padding: '28px', maxWidth: '620px', width: '100%', display: 'flex', gap: '24px', alignItems: 'flex-start', boxShadow: `0 0 40px ${rarityGlow(selected.data.cards?.rarity)}` }}>
            <div style={{ width: '240px', height: '336px', borderRadius: '8px', overflow: 'hidden', background: '#141428', border: `2px solid ${rarityColor(selected.data.cards?.rarity)}`, flexShrink: 0, boxShadow: `0 0 24px ${rarityGlow(selected.data.cards?.rarity)}` }}>
              {selected.data.cards?.image_url ? <img src={selected.data.cards.image_url} alt={selected.data.cards.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.2 }}>🎴</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1.2rem', marginBottom: '8px' }}>{selected.data.cards?.name}</div>
              <div style={{ fontSize: '0.82rem', color: rarityColor(selected.data.cards?.rarity), marginBottom: '4px', letterSpacing: '0.1em' }}>{selected.data.cards?.rarity?.toUpperCase()}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(201,168,76,0.6)', marginBottom: '16px' }}>{selected.data.cards?.universe}</div>
              {selected.data.quantity > 1 && <div style={{ fontSize: '0.82rem', color: 'rgba(232,224,204,0.5)', marginBottom: '12px' }}>Quantité : <span style={{ color: '#c9a84c', fontWeight: 600 }}>x{selected.data.quantity}</span></div>}
              {selected.data.cards?.atk !== undefined && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', padding: '6px 14px', fontSize: '0.82rem' }}>
                    <span style={{ color: 'rgba(201,168,76,0.5)' }}>ATK </span><span style={{ color: '#c9a84c', fontWeight: 600, fontSize: '1rem' }}>{selected.data.cards.atk}</span>
                  </div>
                  <div style={{ background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', padding: '6px 14px', fontSize: '0.82rem' }}>
                    <span style={{ color: 'rgba(201,168,76,0.5)' }}>DEF </span><span style={{ color: '#c9a84c', fontWeight: 600, fontSize: '1rem' }}>{selected.data.cards.def}</span>
                  </div>
                </div>
              )}
              {selected.data.cards?.description && <div style={{ fontSize: '0.82rem', color: 'rgba(232,224,204,0.6)', lineHeight: '1.6', borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: '12px', marginBottom: '10px' }}>{selected.data.cards.description}</div>}
              {selected.data.cards?.effect && <div style={{ fontSize: '0.82rem', color: 'rgba(232,224,204,0.75)', lineHeight: '1.6', padding: '10px 12px', background: 'rgba(201,168,76,0.04)', borderRadius: '4px', border: '1px solid rgba(201,168,76,0.12)' }}>{selected.data.cards.effect}</div>}
              {selected.data.cards?.image_url && (
                <a href={'/card-3d?url=' + encodeURIComponent(selected.data.cards.image_url)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', padding: '10px', background: 'rgba(155,76,201,0.2)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '6px', color: '#c9a84c', fontSize: '0.82rem', textDecoration: 'none' }}>
                  🌀 Voir en 3D
                </a>
              )}
              <button onClick={() => setSelected(null)} style={{ marginTop: '10px', width: '100%', padding: '10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: 'rgba(201,168,76,0.6)', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.88rem' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )

  async function equipItem(field: string, id: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('profiles').update({ [field]: id }).eq('id', session.user.id)
    setProfile((prev: any) => ({ ...prev, [field]: id }))
  }
}
