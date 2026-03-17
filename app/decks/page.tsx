'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DecksPage() {
  const [profile, setProfile] = useState<any>(null)
  const [decks, setDecks] = useState<any[]>([])
  const [playerCards, setPlayerCards] = useState<any[]>([])
  const [cardBacks, setCardBacks] = useState<any[]>([])
  const [deckSkins, setDeckSkins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [showCardPicker, setShowCardPicker] = useState(false)
  const [message, setMessage] = useState<any>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      await loadDecks(session.user.id)

      const { data: pc } = await supabase
        .from('player_cards')
        .select('*, cards(*)')
        .eq('player_id', session.user.id)
      setPlayerCards(pc || [])

      // Card backs possédés
      const { data: invCB } = await supabase
        .from('player_inventory')
        .select('item_id')
        .eq('player_id', session.user.id)
        .eq('item_type', 'card_back')
      if (invCB && invCB.length > 0) {
        const { data: cbs } = await supabase.from('card_backs').select('*').in('id', invCB.map(i => i.item_id))
        setCardBacks(cbs || [])
      }

      // Deck skins possédés
      const { data: invDS } = await supabase
        .from('player_inventory')
        .select('item_id')
        .eq('player_id', session.user.id)
        .eq('item_type', 'deck_skin')
      if (invDS && invDS.length > 0) {
        const { data: dss } = await supabase.from('deck_skins').select('*').in('id', invDS.map(i => i.item_id))
        setDeckSkins(dss || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  async function loadDecks(playerId: string) {
    const { data } = await supabase
      .from('player_decks')
      .select('*, card_backs(*), deck_skins(*)')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
    setDecks(data || [])
  }

  async function createDeck() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('player_decks').insert({
      player_id: session.user.id,
      name: 'Nouveau Deck',
      cards: [],
      is_active: false
    }).select('*, card_backs(*), deck_skins(*)').single()
    if (data) {
      setDecks(prev => [data, ...prev])
      setEditing(data)
    }
  }

  async function saveDeck() {
    if (!editing) return
    await supabase.from('player_decks').update({
      name: editing.name,
      card_back_id: editing.card_back_id || null,
      deck_skin_id: editing.deck_skin_id || null,
      cards: editing.cards || []
    }).eq('id', editing.id)

    await loadDecks(profile.id)
    setMessage({ type: 'success', text: 'Deck sauvegardé !' })
    setTimeout(() => setMessage(null), 3000)
    setEditing(null)
  }

  async function deleteDeck(deckId: string) {
    await supabase.from('player_decks').delete().eq('id', deckId)
    setDecks(prev => prev.filter(d => d.id !== deckId))
    if (editing?.id === deckId) setEditing(null)
    setMessage({ type: 'success', text: 'Deck supprimé.' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function setActiveDeck(deckId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('player_decks').update({ is_active: false }).eq('player_id', session.user.id)
    await supabase.from('player_decks').update({ is_active: true }).eq('id', deckId)
    await loadDecks(session.user.id)
    setMessage({ type: 'success', text: 'Deck actif mis à jour !' })
    setTimeout(() => setMessage(null), 3000)
  }

  function addCardToDeck(pc: any) {
    if (!editing) return
    const cards = editing.cards || []
    const existing = cards.find((c: any) => c.card_id === pc.card_id)
    if (existing) {
      if (existing.quantity >= 3) {
        setMessage({ type: 'error', text: 'Maximum 3 exemplaires par carte !' })
        setTimeout(() => setMessage(null), 3000)
        return
      }
      setEditing((prev: any) => ({
        ...prev,
        cards: prev.cards.map((c: any) =>
          c.card_id === pc.card_id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }))
    } else {
      setEditing((prev: any) => ({
        ...prev,
        cards: [...prev.cards, { card_id: pc.card_id, quantity: 1, card: pc.cards }]
      }))
    }
  }

  function removeCardFromDeck(cardId: string) {
    if (!editing) return
    setEditing((prev: any) => ({
      ...prev,
      cards: prev.cards
        .map((c: any) => c.card_id === cardId ? { ...c, quantity: c.quantity - 1 } : c)
        .filter((c: any) => c.quantity > 0)
    }))
  }

  const totalCards = editing?.cards?.reduce((sum: number, c: any) => sum + c.quantity, 0) || 0

  const rarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: 'rgba(180,180,180,0.7)',
      rare: '#4c99c9',
      epic: '#9b4cc9',
      legendary: '#c9a84c'
    }
    return colors[rarity] || 'rgba(201,168,76,0.3)'
  }

  const filteredCards = playerCards.filter(pc =>
    pc.cards?.name?.toLowerCase().includes(search.toLowerCase()) ||
    pc.cards?.universe?.toLowerCase().includes(search.toLowerCase())
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
        .deck-card {
          background: #0f0f1e; border: 1px solid rgba(201,168,76,0.2);
          border-radius: 10px; padding: 16px; cursor: pointer;
          transition: all 0.2s;
        }
        .deck-card:hover { border-color: rgba(201,168,76,0.5); transform: translateY(-2px); }
        .deck-card.active { border-color: #c9a84c; background: rgba(201,168,76,0.06); }
        .card-pick {
          cursor: pointer; border-radius: 6px; overflow: hidden;
          border: 1px solid rgba(201,168,76,0.2); transition: all 0.2s;
        }
        .card-pick:hover { border-color: rgba(201,168,76,0.6); transform: translateY(-2px); }
        .skin-pick {
          border-radius: 6px; overflow: hidden; cursor: pointer;
          border: 2px solid transparent; transition: all 0.2s;
        }
        .skin-pick.selected { border-color: #c9a84c; box-shadow: 0 0 10px rgba(201,168,76,0.4); }
        .skin-pick:hover { border-color: rgba(201,168,76,0.5); }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <button onClick={() => window.history.back()} style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>← Retour</button>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Mes Decks</span>
        <div style={{ flex: 1 }} />
        <button onClick={createDeck} style={{ padding: '7px 16px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.78rem', cursor: 'pointer', letterSpacing: '0.1em' }}>
          + Nouveau Deck
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Liste des decks */}
        <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid rgba(201,168,76,0.15)', padding: '16px', overflowY: 'auto', background: 'rgba(10,10,20,0.8)' }}>
          {decks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(201,168,76,0.4)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗂️</div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem' }}>Aucun deck</div>
              <div style={{ fontSize: '0.72rem', marginTop: '0.5rem', color: 'rgba(201,168,76,0.3)' }}>Créez votre premier deck</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {decks.map(deck => (
                <div key={deck.id} className={`deck-card ${deck.is_active ? 'active' : ''}`} onClick={() => setEditing({ ...deck })}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '48px', height: '64px', borderRadius: '4px', overflow: 'hidden', background: '#141428', border: '1px solid rgba(201,168,76,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {deck.deck_skins?.image_url ? (
                        <img src={deck.deck_skins.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : <span style={{ fontSize: '1.4rem', opacity: 0.4 }}>🗂️</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: deck.is_active ? '#c9a84c' : '#e8e0cc', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deck.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(201,168,76,0.4)' }}>{deck.cards?.reduce((s: number, c: any) => s + c.quantity, 0) || 0} cartes</div>
                      {deck.is_active && <div style={{ fontSize: '0.62rem', color: '#4cc9a8', marginTop: '2px' }}>✓ Deck actif</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!deck.is_active && (
                      <button onClick={e => { e.stopPropagation(); setActiveDeck(deck.id) }} style={{ flex: 1, padding: '5px', background: 'rgba(76,201,168,0.1)', border: '1px solid rgba(76,201,168,0.3)', borderRadius: '4px', color: '#4cc9a8', fontSize: '0.68rem', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>
                        Activer
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteDeck(deck.id) }} style={{ padding: '5px 8px', background: 'transparent', border: '1px solid rgba(201,76,76,0.2)', borderRadius: '4px', color: 'rgba(201,76,76,0.5)', fontSize: '0.68rem', cursor: 'pointer' }}>
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Éditeur de deck */}
        {editing ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header éditeur */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <input
                value={editing.name}
                onChange={e => setEditing((prev: any) => ({ ...prev, name: e.target.value }))}
                style={{ flex: 1, padding: '8px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontFamily: 'Cinzel, serif', fontSize: '0.9rem', outline: 'none' }}
              />
              <span style={{ fontSize: '0.78rem', color: totalCards >= 20 ? '#4cc9a8' : 'rgba(201,168,76,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>
                {totalCards} cartes
              </span>
              <button onClick={saveDeck} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '5px', fontFamily: 'Cinzel, serif', fontSize: '0.78rem', cursor: 'pointer', letterSpacing: '0.1em' }}>
                Sauvegarder
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

              {/* Cartes du deck */}
              <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.15em' }}>CARTES DU DECK</div>
                  <button onClick={() => setShowCardPicker(true)} style={{ padding: '6px 14px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '5px', color: '#c9a84c', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>
                    + Ajouter des cartes
                  </button>
                </div>

                {editing.cards?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(201,168,76,0.3)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎴</div>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem' }}>Aucune carte dans ce deck</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                    {editing.cards.map((c: any) => (
                      <div key={c.card_id} style={{ position: 'relative' }}>
                        <div style={{ width: '100%', aspectRatio: '0.72', borderRadius: '6px', overflow: 'hidden', background: '#141428', border: `1px solid ${rarityColor(c.card?.rarity)}50` }}>
                          {c.card?.image_url ? (
                            <img src={c.card.image_url} alt={c.card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.3 }}>🎴</div>}
                        </div>
                        <div style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(0,0,0,0.8)', borderRadius: '3px', padding: '1px 5px', fontSize: '0.65rem', color: '#c9a84c', fontWeight: 600 }}>x{c.quantity}</div>
                        <button onClick={() => removeCardFromDeck(c.card_id)} style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(201,76,76,0.8)', border: 'none', color: 'white', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Apparences */}
              <div style={{ width: '220px', flexShrink: 0, borderLeft: '1px solid rgba(201,168,76,0.15)', padding: '16px', overflowY: 'auto' }}>
                {/* Dos de carte */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.15em', marginBottom: '10px' }}>DOS DE CARTE</div>
                  {cardBacks.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.3)', textAlign: 'center', padding: '10px' }}>
                      Aucun dos de carte<br />
                      <a href="/shop" style={{ color: '#c9a84c', fontSize: '0.68rem' }}>Boutique →</a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {cardBacks.map(cb => (
                        <div key={cb.id} className={`skin-pick ${editing.card_back_id === cb.id ? 'selected' : ''}`} onClick={() => setEditing((prev: any) => ({ ...prev, card_back_id: cb.id }))} style={{ width: '52px', height: '72px' }}>
                          {cb.image_url ? <img src={cb.image_url} alt={cb.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: 0.3 }}>🎴</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Skin de deck */}
                <div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.15em', marginBottom: '10px' }}>APPARENCE DU DECK</div>
                  {deckSkins.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.3)', textAlign: 'center', padding: '10px' }}>
                      Aucune apparence<br />
                      <a href="/shop" style={{ color: '#c9a84c', fontSize: '0.68rem' }}>Boutique →</a>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {deckSkins.map(ds => (
                        <div key={ds.id} className={`skin-pick ${editing.deck_skin_id === ds.id ? 'selected' : ''}`} onClick={() => setEditing((prev: any) => ({ ...prev, deck_skin_id: ds.id }))} style={{ width: '52px', height: '72px' }}>
                          {ds.image_url ? <img src={ds.image_url} alt={ds.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: 0.3 }}>🗂️</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(201,168,76,0.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗂️</div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem' }}>Sélectionnez un deck pour l'éditer</div>
            </div>
          </div>
        )}
      </div>

      {/* Modal sélection de cartes */}
      {showCardPicker && (
        <div onClick={() => setShowCardPicker(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '20px', maxWidth: '700px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.9rem' }}>Ajouter des cartes</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setShowCardPicker(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(201,168,76,0.5)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ padding: '8px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.85rem', outline: 'none', marginBottom: '14px' }}
            />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '10px' }}>
                {filteredCards.map(pc => {
                  const inDeck = editing?.cards?.find((c: any) => c.card_id === pc.card_id)
                  return (
                    <div key={pc.id} className="card-pick" onClick={() => addCardToDeck(pc)}>
                      <div style={{ width: '100%', aspectRatio: '0.72', background: '#141428', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pc.cards?.image_url ? (
                          <img src={pc.cards.image_url} alt={pc.cards.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>🎴</span>}
                      </div>
                      <div style={{ padding: '4px', background: '#0f0f1e' }}>
                        <div style={{ fontSize: '0.6rem', color: '#e8e0cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pc.cards?.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.58rem', color: 'rgba(201,168,76,0.4)' }}>x{pc.quantity}</span>
                          {inDeck && <span style={{ fontSize: '0.58rem', color: '#4cc9a8' }}>+{inDeck.quantity}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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
