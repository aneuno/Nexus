'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function MarketPage() {
  const [profile, setProfile] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [myListings, setMyListings] = useState<any[]>([])
  const [myCards, setMyCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('browse')
  const [sellCard, setSellCard] = useState<any>(null)
  const [sellPrice, setSellPrice] = useState('')
  const [sellQty, setSellQty] = useState('1')
  const [message, setMessage] = useState<any>(null)
  const [confirm, setConfirm] = useState<any>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      await loadListings()
      await loadMyListings(session.user.id)
      await loadMyCards(session.user.id)

      setLoading(false)
    }
    load()
  }, [])

  async function loadListings() {
    const { data } = await supabase
      .from('market_listings')
      .select('*, cards(*), profiles(username, avatar)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setListings(data || [])
  }

  async function loadMyListings(playerId: string) {
    const { data } = await supabase
      .from('market_listings')
      .select('*, cards(*)')
      .eq('seller_id', playerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setMyListings(data || [])
  }

  async function loadMyCards(playerId: string) {
    const { data } = await supabase
      .from('player_cards')
      .select('*, cards(*)')
      .eq('player_id', playerId)
    setMyCards(data || [])
  }

  async function createListing() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !sellCard) return

    const price = parseInt(sellPrice)
    const qty = parseInt(sellQty)

    if (!price || price < 1) {
      setMessage({ type: 'error', text: 'Prix invalide !' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const playerCard = myCards.find(c => c.card_id === sellCard.card_id)
    if (!playerCard || playerCard.quantity < qty) {
      setMessage({ type: 'error', text: 'Quantité insuffisante !' })
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const { error } = await supabase.from('market_listings').insert({
      seller_id: session.user.id,
      card_id: sellCard.card_id,
      price_coins: price,
      quantity: qty,
      status: 'active'
    })

    if (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise en vente.' })
    } else {
      setMessage({ type: 'success', text: 'Carte mise en vente !' })
      setSellCard(null)
      setSellPrice('')
      setSellQty('1')
      await loadMyListings(session.user.id)
      await loadListings()
    }
    setTimeout(() => setMessage(null), 3000)
  }

  async function buyListing(listing: any) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    if (listing.seller_id === session.user.id) {
      setMessage({ type: 'error', text: 'Vous ne pouvez pas acheter votre propre carte !' })
      setTimeout(() => setMessage(null), 3000)
      setConfirm(null)
      return
    }

    if (profile.nexus_coins < listing.price_coins) {
      setMessage({ type: 'error', text: 'Nexus Coins insuffisants !' })
      setTimeout(() => setMessage(null), 3000)
      setConfirm(null)
      return
    }

    // Débiter l'acheteur
    await supabase.from('profiles').update({
      nexus_coins: profile.nexus_coins - listing.price_coins
    }).eq('id', session.user.id)

    // Créditer le vendeur
    const { data: seller } = await supabase.from('profiles').select('nexus_coins').eq('id', listing.seller_id).single()
    if (seller) {
      await supabase.from('profiles').update({
        nexus_coins: seller.nexus_coins + listing.price_coins
      }).eq('id', listing.seller_id)
    }

    // Ajouter la carte à l'acheteur
    const { data: existing } = await supabase
      .from('player_cards')
      .select('*')
      .eq('player_id', session.user.id)
      .eq('card_id', listing.card_id)
      .single()

    if (existing) {
      await supabase.from('player_cards').update({
        quantity: existing.quantity + listing.quantity
      }).eq('id', existing.id)
    } else {
      await supabase.from('player_cards').insert({
        player_id: session.user.id,
        card_id: listing.card_id,
        quantity: listing.quantity
      })
    }

    // Retirer la carte du vendeur
    const vendorCard = await supabase
      .from('player_cards')
      .select('*')
      .eq('player_id', listing.seller_id)
      .eq('card_id', listing.card_id)
      .single()

    if (vendorCard.data) {
      if (vendorCard.data.quantity <= listing.quantity) {
        await supabase.from('player_cards').delete().eq('id', vendorCard.data.id)
      } else {
        await supabase.from('player_cards').update({
          quantity: vendorCard.data.quantity - listing.quantity
        }).eq('id', vendorCard.data.id)
      }
    }

    // Marquer le listing comme vendu
    await supabase.from('market_listings').update({
      status: 'sold',
      sold_at: new Date().toISOString()
    }).eq('id', listing.id)

    setProfile((prev: any) => ({ ...prev, nexus_coins: prev.nexus_coins - listing.price_coins }))
    setMessage({ type: 'success', text: `"${listing.cards?.name}" acheté pour ✦ ${listing.price_coins} !` })
    setTimeout(() => setMessage(null), 3000)
    setConfirm(null)
    await loadListings()
  }

  async function cancelListing(listing: any) {
    await supabase.from('market_listings').update({ status: 'cancelled' }).eq('id', listing.id)
    setMessage({ type: 'success', text: 'Annonce annulée.' })
    setTimeout(() => setMessage(null), 3000)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await loadMyListings(session.user.id)
    await loadListings()
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

  const filteredListings = listings.filter(l =>
    l.cards?.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.cards?.universe?.toLowerCase().includes(search.toLowerCase())
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
          padding: 10px 18px; background: transparent;
          border: none; border-bottom: 2px solid transparent;
          color: rgba(232,224,204,0.5); cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 0.85rem;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: all 0.2s; white-space: nowrap;
        }
        .tab-btn.active { color: #c9a84c; border-bottom-color: #c9a84c; }
        .tab-btn:hover { color: #e8e0cc; }
        .listing-card {
          background: #0f0f1e; border: 1px solid rgba(201,168,76,0.2);
          border-radius: 8px; padding: 12px; display: flex;
          gap: 12px; align-items: center; transition: all 0.2s;
        }
        .listing-card:hover { border-color: rgba(201,168,76,0.5); }
        .card-sell-item {
          background: #0f0f1e; border: 1px solid rgba(201,168,76,0.2);
          border-radius: 6px; padding: 8px; cursor: pointer;
          transition: all 0.2s; text-align: center;
        }
        .card-sell-item:hover { border-color: rgba(201,168,76,0.5); transform: translateY(-2px); }
        .card-sell-item.selected { border-color: #c9a84c; background: rgba(201,168,76,0.08); }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <a href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontFamily: 'Rajdhani, sans-serif' }}>← Menu</a>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Market</span>
        <div style={{ flex: 1 }} />
        <span style={{ background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', color: '#c9a84c' }}>✦ {profile?.nexus_coins ?? 0}</span>
      </div>

      {/* Tabs */}
      <div style={{ background: 'rgba(10,10,20,0.95)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '0 20px', display: 'flex', flexShrink: 0 }}>
        <button className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>🔍 Parcourir</button>
        <button className={`tab-btn ${activeTab === 'sell' ? 'active' : ''}`} onClick={() => setActiveTab('sell')}>💰 Vendre</button>
        <button className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>📋 Mes annonces</button>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>

        {/* ── PARCOURIR ── */}
        {activeTab === 'browse' && (
          <div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une carte..."
              style={{ width: '100%', padding: '10px 14px', background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: '#e8e0cc', fontSize: '0.88rem', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
            />
            {filteredListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏪</div>
                <div style={{ fontFamily: 'Cinzel, serif' }}>Aucune carte en vente</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredListings.map(listing => (
                  <div key={listing.id} className="listing-card">
                    <div style={{ width: '50px', height: '70px', borderRadius: '4px', overflow: 'hidden', background: '#141428', border: `1px solid ${rarityColor(listing.cards?.rarity)}40`, flexShrink: 0 }}>
                      {listing.cards?.image_url ? (
                        <img src={listing.cards.image_url} alt={listing.cards.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.3 }}>🎴</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>{listing.cards?.name}</div>
                      <div style={{ fontSize: '0.72rem', color: rarityColor(listing.cards?.rarity), marginBottom: '4px' }}>{listing.cards?.rarity} · {listing.cards?.universe}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)' }}>Par {listing.profiles?.username} · Qté: {listing.quantity}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#c9a84c', marginBottom: '6px' }}>✦ {listing.price_coins}</div>
                      <button
                        onClick={() => setConfirm(listing)}
                        style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '4px', fontFamily: 'Cinzel, serif', fontSize: '0.72rem', cursor: 'pointer' }}
                      >
                        Acheter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VENDRE ── */}
        {activeTab === 'sell' && (
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: 'rgba(201,168,76,0.6)', marginBottom: '14px', letterSpacing: '0.1em' }}>SÉLECTIONNER UNE CARTE</div>
            {myCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(201,168,76,0.4)' }}>Aucune carte dans votre collection</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                  {myCards.map(pc => (
                    <div key={pc.id} className={`card-sell-item ${sellCard?.card_id === pc.card_id ? 'selected' : ''}`} onClick={() => setSellCard(pc)}>
                      <div style={{ width: '100%', aspectRatio: '0.72', borderRadius: '4px', overflow: 'hidden', background: '#141428', border: `1px solid ${rarityColor(pc.cards?.rarity)}50`, marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pc.cards?.image_url ? (
                          <img src={pc.cards.image_url} alt={pc.cards.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>🎴</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#e8e0cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pc.cards?.name}</div>
                      <div style={{ fontSize: '0.58rem', color: 'rgba(201,168,76,0.5)' }}>x{pc.quantity}</div>
                    </div>
                  ))}
                </div>

                {sellCard && (
                  <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '14px' }}>
                      Vendre : {sellCard.cards?.name}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Prix (✦ Nexus Coins)</label>
                        <input
                          type="number"
                          value={sellPrice}
                          onChange={e => setSellPrice(e.target.value)}
                          placeholder="Ex: 500"
                          style={{ width: '100%', padding: '10px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ width: '100px' }}>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(201,168,76,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Quantité</label>
                        <input
                          type="number"
                          value={sellQty}
                          onChange={e => setSellQty(e.target.value)}
                          min="1"
                          max={sellCard.quantity}
                          style={{ width: '100%', padding: '10px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={createListing}
                      style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '5px', fontFamily: 'Cinzel, serif', fontSize: '0.88rem', letterSpacing: '0.1em', cursor: 'pointer' }}
                    >
                      Mettre en vente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── MES ANNONCES ── */}
        {activeTab === 'my' && (
          <div>
            {myListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
                <div style={{ fontFamily: 'Cinzel, serif' }}>Aucune annonce active</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myListings.map(listing => (
                  <div key={listing.id} className="listing-card">
                    <div style={{ width: '50px', height: '70px', borderRadius: '4px', overflow: 'hidden', background: '#141428', border: `1px solid ${rarityColor(listing.cards?.rarity)}40`, flexShrink: 0 }}>
                      {listing.cards?.image_url ? (
                        <img src={listing.cards.image_url} alt={listing.cards.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.3 }}>🎴</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem', color: '#c9a84c', marginBottom: '2px' }}>{listing.cards?.name}</div>
                      <div style={{ fontSize: '0.72rem', color: rarityColor(listing.cards?.rarity), marginBottom: '4px' }}>{listing.cards?.rarity} · {listing.cards?.universe}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(232,224,204,0.4)' }}>Qté: {listing.quantity}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#c9a84c', marginBottom: '6px' }}>✦ {listing.price_coins}</div>
                      <button
                        onClick={() => cancelListing(listing)}
                        style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(201,76,76,0.4)', color: '#e88080', borderRadius: '4px', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.72rem', cursor: 'pointer', letterSpacing: '0.05em' }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal confirmation achat */}
      {confirm && (
        <div onClick={() => setConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '28px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', marginBottom: '8px' }}>Confirmer l'achat</div>
            <div style={{ fontSize: '0.88rem', color: 'rgba(232,224,204,0.7)', marginBottom: '6px' }}>
              <span style={{ color: '#c9a84c' }}>{confirm.cards?.name}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(232,224,204,0.5)', marginBottom: '16px' }}>
              Vendu par {confirm.profiles?.username}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '4px 12px', fontSize: '0.88rem', color: '#c9a84c' }}>
                ✦ {confirm.price_coins}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '5px', color: 'rgba(232,224,204,0.5)', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>
                Annuler
              </button>
              <button onClick={() => buyListing(confirm)} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '5px', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.82rem' }}>
                Confirmer
              </button>
            </div>
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
