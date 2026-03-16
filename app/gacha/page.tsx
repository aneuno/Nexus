'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function GachaPage() {
  const [profile, setProfile] = useState<any>(null)
  const [boosters, setBoosters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [revealedCards, setRevealedCards] = useState<any[]>([])
  const [currentReveal, setCurrentReveal] = useState(-1)
  const [showSummary, setShowSummary] = useState(false)
  const [selectedBooster, setSelectedBooster] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: items } = await supabase
        .from('shop_items')
        .select('*')
        .eq('item_type', 'booster')
        .eq('is_active', true)

      if (items && items.length > 0) {
        const templateIds = items.map((i: any) => i.item_id).filter(Boolean)
        const { data: templates } = await supabase
          .from('booster_templates')
          .select('*')
          .in('id', templateIds)

        const merged = items.map((item: any) => ({
          ...item,
          booster_templates: templates?.find((t: any) => t.id === item.item_id) || null
        }))
        setBoosters(merged)
      } else {
        setBoosters([])
      }

      setLoading(false)
    }
    load()
  }, [])

  async function openBooster(booster: any) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    if (booster.price_crystals > 0 && profile.crystals < booster.price_crystals) {
      alert('Cristaux insuffisants !')
      return
    }
    if (booster.price_coins > 0 && profile.nexus_coins < booster.price_coins) {
      alert('Nexus Coins insuffisants !')
      return
    }

    setOpening(true)
    setSelectedBooster(booster)
    setRevealedCards([])
    setCurrentReveal(-1)
    setShowSummary(false)

    const template = booster.booster_templates

    if (!template) {
      alert('Template introuvable !')
      setOpening(false)
      return
    }

    const { data: pool } = await supabase
      .from('booster_card_pool')
      .select('*, cards(*)')
      .eq('template_id', template.id)

    if (!pool || pool.length === 0) {
      alert('Ce booster ne contient aucune carte configurée !')
      setOpening(false)
      return
    }

    const totalWeight = pool.reduce((sum: number, p: any) => sum + p.weight, 0)
    const drawnCards: any[] = []

    for (let i = 0; i < template.cards_per_open; i++) {
      let rand = Math.random() * totalWeight
      for (const entry of pool) {
        rand -= entry.weight
        if (rand <= 0) {
          drawnCards.push(entry.cards)
          break
        }
      }
    }

    const updates: any = {}
    if (booster.price_crystals > 0) updates.crystals = profile.crystals - booster.price_crystals
    if (booster.price_coins > 0) updates.nexus_coins = profile.nexus_coins - booster.price_coins
    await supabase.from('profiles').update(updates).eq('id', session.user.id)
    setProfile((prev: any) => ({ ...prev, ...updates }))

    for (const card of drawnCards) {
      const { data: existing } = await supabase
        .from('player_cards')
        .select('*')
        .eq('player_id', session.user.id)
        .eq('card_id', card.id)
        .single()

      if (existing) {
        await supabase.from('player_cards').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
      } else {
        await supabase.from('player_cards').insert({ player_id: session.user.id, card_id: card.id, quantity: 1 })
      }
    }

    await supabase.from('booster_openings').insert({
      player_id: session.user.id,
      template_id: template.id,
      cards_received: drawnCards.map(c => c.id)
    })

    setRevealedCards(drawnCards)
    setCurrentReveal(0)
  }

  function reset() {
    setOpening(false)
    setRevealedCards([])
    setCurrentReveal(-1)
    setShowSummary(false)
    setSelectedBooster(null)
  }

  const rarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: 'rgba(180,180,180,0.9)',
      rare: '#4c99c9',
      epic: '#9b4cc9',
      legendary: '#c9a84c'
    }
    return colors[rarity] || 'rgba(201,168,76,0.5)'
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

        @keyframes cardReveal {
          0% { transform: scale(0.3) rotateY(180deg); opacity: 0; }
          50% { transform: scale(1.1) rotateY(90deg); opacity: 0.8; }
          100% { transform: scale(1) rotateY(0deg); opacity: 1; }
        }
        @keyframes legendaryPulse {
          0%,100% { box-shadow: 0 0 20px rgba(201,168,76,0.8), 0 0 40px rgba(201,168,76,0.4); }
          50% { box-shadow: 0 0 40px rgba(201,168,76,1), 0 0 80px rgba(201,168,76,0.6); }
        }
        @keyframes epicPulse {
          0%,100% { box-shadow: 0 0 20px rgba(155,76,201,0.7); }
          50% { box-shadow: 0 0 40px rgba(155,76,201,1); }
        }
        @keyframes rarePulse {
          0%,100% { box-shadow: 0 0 15px rgba(76,153,201,0.6); }
          50% { box-shadow: 0 0 30px rgba(76,153,201,0.9); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes bgPulse {
          0%,100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .card-reveal { animation: cardReveal 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .legendary-glow { animation: legendaryPulse 1.5s ease-in-out infinite; }
        .epic-glow { animation: epicPulse 1.5s ease-in-out infinite; }
        .rare-glow { animation: rarePulse 1.5s ease-in-out infinite; }
        .booster-card {
          background: #0f0f1e; border: 1px solid rgba(201,168,76,0.2);
          border-radius: 12px; padding: 20px; cursor: pointer;
          transition: all 0.3s; text-align: center;
        }
        .booster-card:hover {
          border-color: rgba(201,168,76,0.6); transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .summary-card { animation: fadeIn 0.4s ease forwards; border-radius: 8px; overflow: hidden; }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <a href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontFamily: 'Rajdhani, sans-serif' }}>← Menu</a>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Void — Invocation</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', color: '#c9a84c' }}>✦ {profile?.nexus_coins ?? 0}</span>
          <span style={{ background: '#141428', border: '1px solid rgba(76,201,168,0.3)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.78rem', color: '#4cc9a8' }}>◈ {profile?.crystals ?? 0}</span>
        </div>
      </div>

      {/* ── ANIMATION D'OUVERTURE ── */}
      {opening && !showSummary && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '20px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(155,76,201,0.15) 0%, rgba(201,168,76,0.08) 40%, transparent 70%)', animation: 'bgPulse 2s ease-in-out infinite', pointerEvents: 'none' }} />

          {currentReveal >= 0 && revealedCards[currentReveal] && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.75rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                {currentReveal + 1} / {revealedCards.length}
              </div>

              <div
                key={currentReveal}
                className={`card-reveal ${
                  revealedCards[currentReveal]?.rarity === 'legendary' ? 'legendary-glow' :
                  revealedCards[currentReveal]?.rarity === 'epic' ? 'epic-glow' :
                  revealedCards[currentReveal]?.rarity === 'rare' ? 'rare-glow' : ''
                }`}
                style={{
                  width: '200px', height: '280px', borderRadius: '10px', overflow: 'hidden',
                  border: `2px solid ${rarityColor(revealedCards[currentReveal]?.rarity)}`,
                  background: '#141428'
                }}
              >
                {revealedCards[currentReveal]?.image_url ? (
                  <img src={revealedCards[currentReveal].image_url} alt={revealedCards[currentReveal].name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', opacity: 0.3 }}>🎴</div>
                )}
              </div>

              <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease 0.3s forwards', opacity: 0 }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: '#e8e0cc', marginBottom: '4px' }}>
                  {revealedCards[currentReveal]?.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: rarityColor(revealedCards[currentReveal]?.rarity), letterSpacing: '0.1em' }}>
                  {revealedCards[currentReveal]?.rarity?.toUpperCase()} · {revealedCards[currentReveal]?.universe}
                </div>
              </div>

              <button
                onClick={() => {
                  if (currentReveal < revealedCards.length - 1) {
                    setCurrentReveal(prev => prev + 1)
                  } else {
                    setShowSummary(true)
                  }
                }}
                style={{ padding: '10px 28px', background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '6px', color: '#c9a84c', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', letterSpacing: '0.1em', cursor: 'pointer', marginTop: '8px' }}
              >
                {currentReveal < revealedCards.length - 1 ? 'Suivant →' : 'Voir le résumé'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── RÉSUMÉ ── */}
      {opening && showSummary && (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.2rem', color: '#c9a84c', marginBottom: '4px' }}>Invocation terminée !</div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(232,224,204,0.5)' }}>{revealedCards.length} cartes obtenues</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {revealedCards.map((card, i) => (
              <div key={i} className="summary-card" style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}>
                <div style={{
                  width: '100%', aspectRatio: '0.72', background: '#141428',
                  border: `2px solid ${rarityColor(card.rarity)}`,
                  borderRadius: '8px 8px 0 0', overflow: 'hidden',
                  boxShadow: `0 0 12px ${rarityGlow(card.rarity)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2rem', opacity: 0.3 }}>🎴</span>
                  )}
                </div>
                <div style={{ padding: '6px 4px', background: '#0f0f1e', borderRadius: '0 0 8px 8px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#e8e0cc', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  <div style={{ fontSize: '0.58rem', color: rarityColor(card.rarity), textAlign: 'center', marginTop: '2px' }}>{card.rarity}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={reset} style={{ padding: '12px 28px', background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '6px', color: '#c9a84c', fontFamily: 'Cinzel, serif', fontSize: '0.88rem', letterSpacing: '0.1em', cursor: 'pointer' }}>
              ← Retour
            </button>
            <button
              onClick={() => { reset(); setTimeout(() => openBooster(selectedBooster), 100) }}
              style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.88rem', letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              Invoquer encore
            </button>
          </div>
        </div>
      )}

      {/* ── LISTE DES BOOSTERS ── */}
      {!opening && (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: '#c9a84c', marginBottom: '6px', letterSpacing: '0.1em' }}>Portails d'invocation</div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(232,224,204,0.4)' }}>Ouvrez un portail pour invoquer des cartes du multivers</div>
          </div>

          {boosters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌀</div>
              <div style={{ fontFamily: 'Cinzel, serif' }}>Aucun portail disponible</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'rgba(201,168,76,0.3)' }}>Revenez bientôt</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', maxWidth: '900px', margin: '0 auto' }}>
              {boosters.map(booster => (
                <div key={booster.id} className="booster-card" onClick={() => openBooster(booster)}>
                  <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', background: '#141428', marginBottom: '14px', border: '1px solid rgba(155,76,201,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {booster.image_url ? (
                      <img src={booster.image_url} alt={booster.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ fontSize: '4rem', animation: 'float 3s ease-in-out infinite' }}>🌀</div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(155,76,201,0.1), transparent)', pointerEvents: 'none' }} />
                  </div>

                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#c9a84c', marginBottom: '6px' }}>{booster.name}</div>
                  {booster.description && <div style={{ fontSize: '0.75rem', color: 'rgba(232,224,204,0.5)', marginBottom: '10px', lineHeight: '1.4' }}>{booster.description}</div>}

                  {booster.booster_templates && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.7)' }}>
                        {booster.booster_templates.cards_per_open} cartes
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '14px' }}>
                    {booster.price_coins > 0 && (
                      <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '4px 10px', fontSize: '0.78rem', color: '#c9a84c' }}>✦ {booster.price_coins}</span>
                    )}
                    {booster.price_crystals > 0 && (
                      <span style={{ background: 'rgba(76,201,168,0.1)', border: '1px solid rgba(76,201,168,0.3)', borderRadius: '10px', padding: '4px 10px', fontSize: '0.78rem', color: '#4cc9a8' }}>◈ {booster.price_crystals}</span>
                    )}
                  </div>

                  <div style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, rgba(155,76,201,0.3), rgba(201,168,76,0.3))', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '6px', color: '#c9a84c', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', letterSpacing: '0.1em', textAlign: 'center' }}>
                    Ouvrir le portail
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
