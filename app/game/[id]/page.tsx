'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type CardData = {
  id: string
  name: string
  atk: number
  def: number
  level: number
  card_type: string
  image_url: string
  rarity: string
  effect?: string
  description?: string
}

type MonsterPosition = 'ATK' | 'DEF' | 'SET'

type FieldCard = {
  card: CardData
  position: MonsterPosition
}

type GameState = {
  phase: 'DRAW' | 'MAIN1' | 'BATTLE' | 'MAIN2' | 'END'
  turn: number
  activePlayer: 0 | 1
  lp: [number, number]
  hands: [CardData[], CardData[]]
  monsterZones: [(FieldCard | null)[], (FieldCard | null)[]]
  spellZones: [(FieldCard | null)[], (FieldCard | null)[]]
  graveyards: [CardData[], CardData[]]
  decks: [CardData[], CardData[]]
  hasDrawnThisTurn: boolean
  normalSummonedThisTurn: boolean
  hasAttackedThisTurn: boolean[]
  winner: null | 0 | 1
  log: string[]
  selectedHandCard: number | null
  attackingCard: { zone: number } | null
  showSummonModal: { handIdx: number, zone: number } | null
}

const HAND_SIZE = 5
const ZONES = 5
const STARTING_LP = 8000

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function addLog(state: GameState, msg: string): GameState {
  return { ...state, log: [msg, ...state.log.slice(0, 49)] }
}

function phaseLabel(phase: GameState['phase']) {
  return { DRAW: 'Pioche', MAIN1: 'Main Phase 1', BATTLE: 'Battle Phase', MAIN2: 'Main Phase 2', END: 'End Phase' }[phase]
}

function phaseColor(phase: GameState['phase']) {
  return { DRAW: '#4c99c9', MAIN1: '#c9a84c', BATTLE: '#e84c4c', MAIN2: '#c9a84c', END: '#9b4cc9' }[phase]
}

function rarityColor(rarity: string) {
  return ({ common: '#aaa', rare: '#4c99c9', epic: '#9b4cc9', legendary: '#c9a84c' } as Record<string, string>)[rarity] || '#c9a84c'
}

export default function GamePage({ params }: { params: { id: string } }) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<0 | 1>(0)
  const [cardBackUrl, setCardBackUrl] = useState('')
  const [hoveredCard, setHoveredCard] = useState<CardData | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [showGY, setShowGY] = useState<0 | 1 | null>(null)

  function msg(text: string) {
    setFlash(text)
    setTimeout(() => setFlash(null), 2500)
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      if (params.id !== 'test') {
        const { data: roomCheck } = await supabase.from('game_rooms').select('host_id').eq('id', params.id).single()
        if (roomCheck) setMyRole(roomCheck.host_id === session.user.id ? 0 : 1)
      }

      const { data: deckData } = await supabase.from('player_decks').select('*, card_backs(*)').eq('player_id', session.user.id).eq('is_active', true).single()
      if (deckData?.card_backs?.image_url) setCardBackUrl(deckData.card_backs.image_url)

      if (params.id === 'test') {
        const { data: cards } = await supabase.from('cards').select('*').limit(40)
        const deck = (cards || []).map(c => ({ id: c.id, name: c.name, atk: c.atk || 1000, def: c.def || 800, level: c.level || 4, card_type: c.card_type || 'Monstre', image_url: c.image_url || '', rarity: c.rarity || 'common', effect: c.effect, description: c.description }))
        initGame(deck, [...deck])
        setLoading(false)
        return
      }

      const { data: room } = await supabase.from('game_rooms').select('*').eq('id', params.id).single()
      if (!room) { window.location.href = '/play'; return }

      if (room.game_state) {
        setGameState(room.game_state)
        setLoading(false)
      } else if (room.host_id === session.user.id) {
        const d1 = await loadDeck(room.host_deck_id)
        const d2 = await loadDeck(room.guest_deck_id)
        const gs = buildGame(d1, d2)
        await supabase.from('game_rooms').update({ game_state: gs }).eq('id', params.id)
        setGameState(gs)
        setLoading(false)
      } else {
        setLoading(false)
      }
    }
    init()

    if (params.id !== 'test') {
      const ch = supabase.channel(`game_${params.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${params.id}` }, (payload: any) => {
          if (payload.new.game_state) { setGameState(payload.new.game_state); setLoading(false) }
        }).subscribe()
      return () => { supabase.removeChannel(ch) }
    }
  }, [])

  async function loadDeck(deckId: string | null): Promise<CardData[]> {
    if (!deckId) {
      const { data: fallback } = await supabase.from('cards').select('*').limit(40)
      return (fallback || []).map((c: any) => ({ id: c.id, name: c.name, atk: c.atk || 1000, def: c.def || 800, level: c.level || 4, card_type: c.card_type || 'Monstre', image_url: c.image_url || '', rarity: c.rarity || 'common', effect: c.effect, description: c.description }))
    }
    const { data: deck } = await supabase.from('player_decks').select('cards').eq('id', deckId).single()
    if (!deck?.cards?.length) {
      const { data: fallback } = await supabase.from('cards').select('*').limit(40)
      return (fallback || []).map((c: any) => ({ id: c.id, name: c.name, atk: c.atk || 1000, def: c.def || 800, level: c.level || 4, card_type: c.card_type || 'Monstre', image_url: c.image_url || '', rarity: c.rarity || 'common', effect: c.effect, description: c.description }))
    }
    const cardIds = deck.cards.map((c: any) => c.card_id)
    const { data: cards } = await supabase.from('cards').select('*').in('id', cardIds)
    const result: CardData[] = []
    for (const entry of deck.cards) {
      const card = cards?.find((c: any) => c.id === entry.card_id)
      if (card) for (let i = 0; i < entry.quantity; i++)
        result.push({ id: card.id + '_' + i, name: card.name, atk: card.atk || 1000, def: card.def || 800, level: card.level || 4, card_type: card.card_type || 'Monstre', image_url: card.image_url || '', rarity: card.rarity || 'common', effect: card.effect, description: card.description })
    }
    return result
  }

  function buildGame(deck1: CardData[], deck2: CardData[]): GameState {
    const s1 = shuffle(deck1), s2 = shuffle(deck2)
    const h1 = s1.splice(0, HAND_SIZE), h2 = s2.splice(0, HAND_SIZE)
    return {
      phase: 'MAIN1', turn: 1, activePlayer: 0,
      lp: [STARTING_LP, STARTING_LP],
      hands: [h1, h2],
      monsterZones: [Array(ZONES).fill(null), Array(ZONES).fill(null)],
      spellZones: [Array(ZONES).fill(null), Array(ZONES).fill(null)],
      graveyards: [[], []], decks: [s1, s2],
      hasDrawnThisTurn: false,
      normalSummonedThisTurn: false,
      hasAttackedThisTurn: Array(ZONES).fill(false),
      winner: null,
      log: ['⚔️ La partie commence !', 'Tour 1 — Joueur 1 — Main Phase 1'],
      selectedHandCard: null, attackingCard: null, showSummonModal: null
    }
  }

  function initGame(d1: CardData[], d2: CardData[]) {
    setGameState(buildGame(d1, d2))
  }

  async function sync(gs: GameState) {
    if (params.id === 'test') return
    await supabase.from('game_rooms').update({ game_state: gs }).eq('id', params.id)
  }

  function update(fn: (s: GameState) => GameState) {
    setGameState(prev => {
      if (!prev) return prev
      const next = fn(prev)
      sync(next)
      return next
    })
  }

  // PIOCHE
  function doDraw() {
    if (!gameState) return
    const p = gameState.activePlayer
    if (gameState.phase !== 'DRAW') { msg('Vous pouvez seulement piocher en phase Pioche !'); return }
    if (gameState.activePlayer !== myRole) { msg("Ce n'est pas votre tour !"); return }
    if (gameState.hasDrawnThisTurn) { msg('Vous avez déjà pioché ce tour !'); return }
    if (gameState.decks[p].length === 0) { msg('Votre deck est vide — défaite par deck-out !'); update(s => ({ ...s, winner: p === 0 ? 1 : 0 })); return }
    update(s => {
      const decks = s.decks.map(d => [...d]) as [CardData[], CardData[]]
      const hands = s.hands.map(h => [...h]) as [CardData[], CardData[]]
      const drawn = decks[p].shift()!
      hands[p].push(drawn)
      return addLog({ ...s, decks, hands, hasDrawnThisTurn: true }, `J${p + 1} pioche ${drawn.name}`)
    })
  }

  // PHASES
  function nextPhase() {
    if (!gameState) return
    if (gameState.activePlayer !== myRole) { msg("Ce n'est pas votre tour !"); return }
    const order: GameState['phase'][] = ['DRAW', 'MAIN1', 'BATTLE', 'MAIN2', 'END']
    const idx = order.indexOf(gameState.phase)

    if (gameState.phase === 'DRAW' && !gameState.hasDrawnThisTurn) { msg('Vous devez piocher avant de continuer !'); return }

    if (idx === order.length - 1) {
      // End Phase → passer au joueur suivant
      update(s => {
        const next = (s.activePlayer === 0 ? 1 : 0) as 0 | 1
        const newTurn = next === 0 ? s.turn + 1 : s.turn
        const monsterZones = s.monsterZones.map(row => row.map(fc => fc ? { ...fc } : null)) as [(FieldCard | null)[], (FieldCard | null)[]]
        const ns: GameState = {
          ...s, monsterZones, activePlayer: next, phase: 'DRAW', turn: newTurn,
          hasDrawnThisTurn: false, normalSummonedThisTurn: false,
          hasAttackedThisTurn: Array(ZONES).fill(false),
          selectedHandCard: null, attackingCard: null, showSummonModal: null
        }
        return addLog(ns, `--- Tour ${newTurn} — Joueur ${next + 1} — Pioche ---`)
      })
      return
    }

    const nextP = order[idx + 1]
    update(s => addLog({ ...s, phase: nextP, selectedHandCard: null, attackingCard: null, showSummonModal: null }, `⏭ ${phaseLabel(nextP)}`))
  }

  // INVOQUER
  function summonCard(handIdx: number, zone: number, position: MonsterPosition) {
    if (!gameState) return
    const p = gameState.activePlayer
    if (gameState.activePlayer !== myRole) { msg("Ce n'est pas votre tour !"); return }
    if (gameState.phase !== 'MAIN1' && gameState.phase !== 'MAIN2') { msg('Invocation en Main Phase seulement !'); return }
    if (gameState.monsterZones[p][zone]) { msg('Zone occupée !'); return }
    if (position !== 'SET' && gameState.normalSummonedThisTurn) { msg('Invocation normale déjà utilisée !'); return }

    const card = gameState.hands[p][handIdx]
    if (!card) return

    update(s => {
      const hands = s.hands.map(h => [...h]) as [CardData[], CardData[]]
      const monsterZones = s.monsterZones.map(r => [...r]) as [(FieldCard | null)[], (FieldCard | null)[]]
      hands[p].splice(handIdx, 1)
      monsterZones[p][zone] = { card, position }
      const label = position === 'SET' ? 'posé face cachée' : position === 'ATK' ? 'invoqué en ATK' : 'invoqué en DEF'
      return addLog({ ...s, hands, monsterZones, normalSummonedThisTurn: position !== 'SET', selectedHandCard: null, showSummonModal: null }, `J${p + 1} : ${card.name} ${label}`)
    })
  }

  // ATTAQUE
  function declareAttack(attackerZone: number, targetZone: number | 'direct') {
    if (!gameState) return
    const p = gameState.activePlayer
    const opp = (p === 0 ? 1 : 0) as 0 | 1
    if (gameState.activePlayer !== myRole) return
    if (gameState.phase !== 'BATTLE') { msg('Attaque en Battle Phase seulement !'); return }
    if (gameState.hasAttackedThisTurn[attackerZone]) { msg('Ce monstre a déjà attaqué !'); return }

    const attacker = gameState.monsterZones[p][attackerZone]
    if (!attacker || attacker.position !== 'ATK') { msg('Seuls les monstres en ATK peuvent attaquer !'); return }

    update(s => {
      const hasAttackedThisTurn = [...s.hasAttackedThisTurn]; hasAttackedThisTurn[attackerZone] = true
      let ns = { ...s, hasAttackedThisTurn, attackingCard: null }

      if (targetZone === 'direct') {
        const lp = [...s.lp] as [number, number]
        lp[opp] -= attacker.card.atk
        ns = addLog({ ...ns, lp }, `⚔️ Attaque directe ! ${attacker.card.name} → J${opp + 1} -${attacker.card.atk} LP`)
        if (lp[opp] <= 0) return { ...ns, winner: p }
        return ns
      }

      const defender = s.monsterZones[opp][targetZone as number]
      if (!defender) return s

      const monsterZones = s.monsterZones.map(r => [...r]) as [(FieldCard | null)[], (FieldCard | null)[]]
      const graveyards = s.graveyards.map(g => [...g]) as [CardData[], CardData[]]
      const lp = [...s.lp] as [number, number]

      if (defender.position === 'ATK') {
        const diff = attacker.card.atk - defender.card.atk
        if (diff > 0) { graveyards[opp].push(defender.card); monsterZones[opp][targetZone as number] = null; lp[opp] -= diff; ns = addLog({ ...ns, monsterZones, graveyards, lp }, `⚔️ ${attacker.card.name} détruit ${defender.card.name} ! J${opp + 1} -${diff} LP`) }
        else if (diff < 0) { graveyards[p].push(attacker.card); monsterZones[p][attackerZone] = null; lp[p] += diff; ns = addLog({ ...ns, monsterZones, graveyards, lp }, `⚔️ ${attacker.card.name} détruit ! J${p + 1} ${diff} LP`) }
        else { graveyards[p].push(attacker.card); graveyards[opp].push(defender.card); monsterZones[p][attackerZone] = null; monsterZones[opp][targetZone as number] = null; ns = addLog({ ...ns, monsterZones, graveyards }, `⚔️ Égalité !`) }
      } else {
        const diff = attacker.card.atk - defender.card.def
        if (diff > 0) { graveyards[opp].push(defender.card); monsterZones[opp][targetZone as number] = null; ns = addLog({ ...ns, monsterZones, graveyards }, `⚔️ ${defender.card.name} détruit en DEF`) }
        else if (diff < 0) { lp[p] += diff; ns = addLog({ ...ns, lp }, `⚔️ J${p + 1} -${Math.abs(diff)} LP`) }
        else { ns = addLog(ns, `⚔️ Égalité DEF`) }
      }

      if (ns.lp[0] <= 0) return { ...ns, winner: 1 }
      if (ns.lp[1] <= 0) return { ...ns, winner: 0 }
      return ns
    })
  }

  if (loading || !gameState) return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', fontFamily: 'sans-serif' }}>
      Chargement...
    </main>
  )

  const me = myRole
  const opp = (myRole === 0 ? 1 : 0) as 0 | 1
  const p = gameState.activePlayer
  const isMyTurn = me === p
  const canDraw = isMyTurn && gameState.phase === 'DRAW' && !gameState.hasDrawnThisTurn

  return (
    <main style={{ height: '100vh', background: '#06060f', color: '#e8e0cc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes glow { 0%,100%{box-shadow:0 0 6px rgba(201,168,76,0.4)} 50%{box-shadow:0 0 18px rgba(201,168,76,0.9)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* WINNER OVERLAY */}
      {gameState.winner !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '3rem', color: '#c9a84c', marginBottom: '12px' }}>Joueur {gameState.winner + 1} gagne !</div>
            <div style={{ fontSize: '1rem', color: 'rgba(232,224,204,0.5)', marginBottom: '28px' }}>J1: {gameState.lp[0]} LP · J2: {gameState.lp[1]} LP</div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.9rem', cursor: 'pointer' }}>Rejouer</button>
              <button onClick={() => window.location.href = '/play'} style={{ padding: '12px 28px', background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.9rem', cursor: 'pointer' }}>Menu</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INVOCATION */}
      {gameState.showSummonModal && (
        <div onClick={() => update(s => ({ ...s, showSummonModal: null, selectedHandCard: null }))} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '24px', maxWidth: '300px', width: '100%', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.9rem', marginBottom: '4px' }}>
              {gameState.hands[me][gameState.showSummonModal.handIdx]?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(232,224,204,0.4)', marginBottom: '18px' }}>
              ATK {gameState.hands[me][gameState.showSummonModal.handIdx]?.atk} / DEF {gameState.hands[me][gameState.showSummonModal.handIdx]?.def}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => summonCard(gameState.showSummonModal!.handIdx, gameState.showSummonModal!.zone, 'ATK')} style={{ padding: '11px', background: 'rgba(232,76,76,0.1)', border: '1px solid rgba(232,76,76,0.4)', borderRadius: '6px', color: '#e84c4c', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>⚔️ Invoquer en ATK</button>
              <button onClick={() => summonCard(gameState.showSummonModal!.handIdx, gameState.showSummonModal!.zone, 'DEF')} style={{ padding: '11px', background: 'rgba(76,153,201,0.1)', border: '1px solid rgba(76,153,201,0.4)', borderRadius: '6px', color: '#4c99c9', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>🛡️ Invoquer en DEF</button>
              <button onClick={() => summonCard(gameState.showSummonModal!.handIdx, gameState.showSummonModal!.zone, 'SET')} style={{ padding: '11px', background: 'rgba(155,76,201,0.1)', border: '1px solid rgba(155,76,201,0.4)', borderRadius: '6px', color: '#9b4cc9', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>🃏 Poser face cachée</button>
              <button onClick={() => update(s => ({ ...s, showSummonModal: null, selectedHandCard: null }))} style={{ padding: '8px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', color: 'rgba(201,168,76,0.5)', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.82rem', cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CIMETIERE */}
      {showGY !== null && (
        <div onClick={() => setShowGY(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '20px', maxWidth: '560px', width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.85rem', marginBottom: '12px' }}>Cimetière J{showGY + 1} — {gameState.graveyards[showGY].length} cartes</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '8px' }}>
                {gameState.graveyards[showGY].map((card, i) => (
                  <div key={i} style={{ borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)' }}>
                    {card.image_url ? <img src={card.image_url} alt={card.name} style={{ width: '100%', aspectRatio: '0.72', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', aspectRatio: '0.72', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>🎴</div>}
                    <div style={{ padding: '2px 4px', fontSize: '0.5rem', color: 'rgba(232,224,204,0.5)', background: '#0f0f1e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  </div>
                ))}
                {gameState.graveyards[showGY].length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'rgba(201,168,76,0.3)', fontSize: '0.82rem' }}>Vide</div>}
              </div>
            </div>
            <button onClick={() => setShowGY(null)} style={{ marginTop: '12px', padding: '8px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', color: 'rgba(201,168,76,0.5)', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>Fermer</button>
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.78rem', letterSpacing: '0.15em' }}>NEXUS CHRONICLES</span>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>Tour {gameState.turn} · J{p + 1}</div>
        <div style={{ padding: '3px 12px', borderRadius: '4px', border: `1px solid ${phaseColor(gameState.phase)}60`, color: phaseColor(gameState.phase), fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem' }}>{phaseLabel(gameState.phase)}</div>
        {isMyTurn && gameState.phase === 'DRAW' && (
          <button onClick={doDraw} disabled={!canDraw} style={{ padding: '5px 14px', background: canDraw ? 'rgba(76,153,201,0.2)' : 'transparent', border: `1px solid ${canDraw ? '#4c99c9' : 'rgba(76,153,201,0.2)'}`, borderRadius: '4px', color: canDraw ? '#4c99c9' : 'rgba(76,153,201,0.3)', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem', cursor: canDraw ? 'pointer' : 'default', animation: canDraw ? 'pulse 1s ease-in-out infinite' : 'none' }}>
            🃏 Piocher
          </button>
        )}
        {isMyTurn && gameState.phase !== 'DRAW' && (
          <button onClick={nextPhase} style={{ padding: '5px 14px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#c9a84c', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem', cursor: 'pointer' }}>
            {gameState.phase === 'END' ? 'Fin du tour →' : 'Phase suiv. →'}
          </button>
        )}
        {!isMyTurn && (
          <div style={{ padding: '5px 14px', background: 'transparent', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '4px', color: 'rgba(201,168,76,0.3)', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem' }}>
            Tour adversaire...
          </div>
        )}
        <button onClick={() => window.location.href = '/play'} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid rgba(201,76,76,0.25)', borderRadius: '4px', color: 'rgba(201,76,76,0.5)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>Quitter</button>
      </div>

      {/* TERRAIN */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'radial-gradient(ellipse at center, #0a0a18 0%, #06060f 100%)' }}>

          {/* LP ADVERSAIRE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', flexShrink: 0, background: 'rgba(232,76,76,0.04)' }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(232,224,204,0.5)', minWidth: '55px' }}>J{opp + 1}{opp === p ? ' ⚡' : ''}</span>
            <div style={{ flex: 1, height: '4px', background: 'rgba(232,224,204,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, gameState.lp[opp] / STARTING_LP * 100)}%`, background: gameState.lp[opp] > 3000 ? '#4cc9a8' : gameState.lp[opp] > 1000 ? '#c9a84c' : '#e84c4c', transition: 'width 0.4s', borderRadius: '2px' }} />
            </div>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: gameState.lp[opp] > 2000 ? '#4cc9a8' : '#e84c4c', minWidth: '48px', textAlign: 'right' }}>{gameState.lp[opp]}</span>
            <span style={{ fontSize: '0.62rem', color: 'rgba(201,168,76,0.3)', fontFamily: 'Rajdhani, sans-serif' }}>✋{gameState.hands[opp].length}</span>
          </div>

          {/* MAIN ADVERSAIRE (dos) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', padding: '4px 0', flexShrink: 0 }}>
            {gameState.hands[opp].map((_, i) => (
              <div key={i} style={{ width: '28px', height: '40px', borderRadius: '3px', background: 'linear-gradient(135deg, #141428, #1a1a35)', border: '1px solid rgba(201,168,76,0.15)' }} />
            ))}
          </div>

          {/* TERRAIN ADVERSAIRE */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px', padding: '0 8px' }}>

            {/* Zones magie/piège adversaire */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
              {/* Cimetière adversaire */}
              <div onClick={() => setShowGY(opp)} style={{ width: '72px', height: '100px', borderRadius: '6px', border: '1px solid rgba(201,76,76,0.3)', background: 'rgba(201,76,76,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                {gameState.graveyards[opp].length > 0 ? (<>
                  <img src={gameState.graveyards[opp][gameState.graveyards[opp].length - 1].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                  <div style={{ position: 'absolute', bottom: '2px', right: '3px', fontSize: '0.6rem', color: '#e88080', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '0 3px' }}>{gameState.graveyards[opp].length}</div>
                  <div style={{ position: 'absolute', top: '2px', left: '3px', fontSize: '0.48rem', color: 'rgba(232,224,204,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>GY</div>
                </>) : <span style={{ fontSize: '0.48rem', color: 'rgba(232,76,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>GY</span>}
              </div>
              {/* 5 zones sort/piège adversaire */}
              {gameState.spellZones[opp].map((fc, i) => (
                <div key={i} style={{ width: '72px', height: '100px', borderRadius: '6px', border: '1px solid rgba(76,153,201,0.2)', background: 'rgba(76,153,201,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {fc ? <img src={fc.card.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.7rem', opacity: 0.12, color: '#4c99c9' }}>S</span>}
                </div>
              ))}
              {/* Extra deck adversaire */}
              <div style={{ width: '72px', height: '100px', borderRadius: '6px', border: '1px solid rgba(155,76,201,0.2)', background: 'rgba(155,76,201,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.48rem', color: 'rgba(155,76,201,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>EXTRA</span>
                <span style={{ fontSize: '0.7rem', color: '#9b4cc9', fontFamily: 'Cinzel, serif' }}>0</span>
              </div>
            </div>

            {/* Zones monstres adversaire */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
              {/* Deck adversaire */}
              <div style={{ width: '72px', height: '100px', borderRadius: '6px', border: '1px solid rgba(201,168,76,0.2)', background: 'linear-gradient(135deg, #141428, #1a1a35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.5rem', color: 'rgba(201,168,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>DECK</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: '#c9a84c' }}>{gameState.decks[opp].length}</span>
              </div>
              {/* 5 zones monstres adversaire */}
              {gameState.monsterZones[opp].map((fc, i) => {
                const isTarget = gameState.attackingCard && isMyTurn && gameState.phase === 'BATTLE'
                return (
                  <div key={i}
                    onClick={() => {
                      if (!gameState.attackingCard || !isMyTurn || gameState.phase !== 'BATTLE') return
                      declareAttack(gameState.attackingCard.zone, i)
                    }}
                    onMouseEnter={() => fc && fc.position !== 'SET' && setHoveredCard(fc.card)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{ width: '72px', height: '100px', borderRadius: '6px', border: isTarget && fc ? '2px solid #e84c4c' : '1px solid rgba(201,168,76,0.15)', background: isTarget && fc ? 'rgba(232,76,76,0.08)' : 'rgba(201,168,76,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isTarget && fc ? 'crosshair' : 'default', position: 'relative', overflow: fc?.position === 'ATK' || !fc ? 'hidden' : 'visible', flexShrink: 0, transition: 'all 0.15s' }}>
                    {fc ? (
                      fc.position === 'SET' ? (
                        <div style={{ width: '100px', height: '72px', position: 'absolute', borderRadius: '4px', overflow: 'hidden' }}>
                          {cardBackUrl ? <img src={cardBackUrl} alt="dos" style={{ width: '72px', height: '100px', objectFit: 'cover', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(90deg)' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a35,#0f0f20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: 0.4 }}>🎴</div>}
                        </div>
                      ) : fc.position === 'DEF' ? (
                        <div style={{ width: '100px', height: '72px', position: 'absolute', borderRadius: '4px', overflow: 'hidden' }}>
                          <img src={fc.card.image_url} alt="" style={{ width: '72px', height: '100px', objectFit: 'cover', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(90deg)', borderRadius: '4px' }} />
                        </div>
                      ) : (
                        <img src={fc.card.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                      )
                    ) : <span style={{ fontSize: '0.9rem', opacity: 0.1, color: '#c9a84c' }}>M</span>}
                  </div>
                )
              })}
              <div style={{ width: '72px', flexShrink: 0 }} />
            </div>

          </div>

          {/* SÉPARATEUR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 12px', flexShrink: 0 }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.08)' }} />
            <span style={{ fontSize: '0.58rem', color: 'rgba(201,168,76,0.18)', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.2em' }}>— NEXUS FIELD —</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.08)' }} />
          </div>

          {/* TERRAIN JOUEUR */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px', padding: '0 8px' }}>

            {/* Zones monstres joueur */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
              <div style={{ width: '72px', flexShrink: 0 }} />
              {gameState.monsterZones[me].map((fc, i) => {
                const canPlace = isMyTurn && (gameState.phase === 'MAIN1' || gameState.phase === 'MAIN2') && gameState.selectedHandCard !== null && !fc
                const isSelected = fc && gameState.attackingCard?.zone === i && isMyTurn
                return (
                  <div key={i}
                    onClick={() => {
                      if (canPlace && gameState.selectedHandCard !== null) {
                        update(s => ({ ...s, showSummonModal: { handIdx: s.selectedHandCard!, zone: i } }))
                      } else if (fc && isMyTurn && gameState.phase === 'BATTLE' && !gameState.attackingCard && fc.position === 'ATK' && !gameState.hasAttackedThisTurn[i]) {
                        update(s => ({ ...s, attackingCard: { zone: i } }))
                      } else if (fc && gameState.attackingCard?.zone === i) {
                        update(s => ({ ...s, attackingCard: null }))
                      }
                    }}
                    onMouseEnter={() => fc && fc.position !== 'SET' && setHoveredCard(fc.card)}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{ width: '72px', height: '100px', borderRadius: '6px', border: canPlace ? '2px solid #c9a84c' : isSelected ? '2px solid #e84c4c' : '1px solid rgba(201,168,76,0.15)', background: canPlace ? 'rgba(201,168,76,0.08)' : isSelected ? 'rgba(232,76,76,0.08)' : 'rgba(201,168,76,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: canPlace || (fc && isMyTurn) ? 'pointer' : 'default', position: 'relative', overflow: fc?.position === 'ATK' || !fc ? 'hidden' : 'visible', flexShrink: 0, transition: 'all 0.15s', animation: canPlace ? 'glow 1s ease-in-out infinite' : 'none', boxShadow: isSelected ? '0 0 12px rgba(232,76,76,0.5)' : 'none' }}>
                    {fc ? (
                      fc.position === 'SET' ? (
                        <div style={{ width: '100px', height: '72px', position: 'absolute', borderRadius: '4px', overflow: 'hidden' }}>
                          {cardBackUrl ? <img src={cardBackUrl} alt="dos" style={{ width: '72px', height: '100px', objectFit: 'cover', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(90deg)' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a35,#0f0f20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: 0.4 }}>🎴</div>}
                        </div>
                      ) : fc.position === 'DEF' ? (
                        <div style={{ width: '100px', height: '72px', position: 'absolute', borderRadius: '4px', overflow: 'hidden' }}>
                          <img src={fc.card.image_url} alt="" style={{ width: '72px', height: '100px', objectFit: 'cover', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(90deg)', borderRadius: '4px' }} />
                        </div>
                      ) : (
                        <img src={fc.card.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', opacity: gameState.hasAttackedThisTurn[i] ? 0.5 : 1 }} />
                      )
                    ) : <span style={{ fontSize: '0.9rem', opacity: 0.1, color: '#c9a84c' }}>M</span>}
                  </div>
                )
              })}
              {/* Deck joueur */}
              <div style={{ width: '72px', height: '100px', borderRadius: '6px', border: '1px solid rgba(201,168,76,0.2)', background: 'linear-gradient(135deg, #141428, #1a1a35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.5rem', color: 'rgba(201,168,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>DECK</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: '#c9a84c' }}>{gameState.decks[me].length}</span>
              </div>
            </div>

            {/* Zones magie/piège joueur */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' }}>
              {/* Extra deck joueur */}
              <div style={{ width: '72px', height: '100px', borderRadius: '6px', border: '1px solid rgba(155,76,201,0.2)', background: 'rgba(155,76,201,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.48rem', color: 'rgba(155,76,201,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>EXTRA</span>
                <span style={{ fontSize: '0.7rem', color: '#9b4cc9', fontFamily: 'Cinzel, serif' }}>0</span>
              </div>
              {/* 5 zones sort/piège joueur */}
              {gameState.spellZones[me].map((fc, i) => (
                <div key={i} style={{ width: '72px', height: '100px', borderRadius: '6px', border: '1px solid rgba(76,153,201,0.2)', background: 'rgba(76,153,201,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {fc ? <img src={fc.card.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.7rem', opacity: 0.12, color: '#4c99c9' }}>S</span>}
                </div>
              ))}
              {/* Cimetière joueur */}
              <div onClick={() => setShowGY(me)} style={{ width: '72px', height: '100px', borderRadius: '6px', border: '1px solid rgba(201,76,76,0.3)', background: 'rgba(201,76,76,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                {gameState.graveyards[me].length > 0 ? (<>
                  <img src={gameState.graveyards[me][gameState.graveyards[me].length - 1].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                  <div style={{ position: 'absolute', bottom: '2px', right: '3px', fontSize: '0.6rem', color: '#e88080', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '0 3px' }}>{gameState.graveyards[me].length}</div>
                  <div style={{ position: 'absolute', top: '2px', left: '3px', fontSize: '0.48rem', color: 'rgba(232,224,204,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>GY</div>
                </>) : <span style={{ fontSize: '0.48rem', color: 'rgba(232,76,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>GY</span>}
              </div>
            </div>

          </div>

          {/* MESSAGE ATTAQUE */}
          {gameState.attackingCard && isMyTurn && (
            <div style={{ textAlign: 'center', padding: '4px', fontSize: '0.72rem', color: '#e84c4c', fontFamily: 'Rajdhani, sans-serif', animation: 'pulse 0.8s ease-in-out infinite', flexShrink: 0 }}>
              Cliquez sur un monstre adverse ou&nbsp;
              <span onClick={() => {
                const oppHas = gameState.monsterZones[opp].some(f => f !== null)
                if (oppHas) { msg("L'adversaire a des monstres !"); return }
                declareAttack(gameState.attackingCard!.zone, 'direct')
              }} style={{ textDecoration: 'underline', cursor: 'pointer' }}>attaque directe</span>
              &nbsp;·&nbsp;
              <span onClick={() => update(s => ({ ...s, attackingCard: null }))} style={{ textDecoration: 'underline', cursor: 'pointer', color: 'rgba(232,76,76,0.6)' }}>annuler</span>
            </div>
          )}

          {/* LP JOUEUR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', flexShrink: 0, background: 'rgba(76,201,168,0.04)' }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(232,224,204,0.5)', minWidth: '55px' }}>J{me + 1} (vous){me === p ? ' ⚡' : ''}</span>
            <div style={{ flex: 1, height: '4px', background: 'rgba(232,224,204,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, gameState.lp[me] / STARTING_LP * 100)}%`, background: gameState.lp[me] > 3000 ? '#4cc9a8' : gameState.lp[me] > 1000 ? '#c9a84c' : '#e84c4c', transition: 'width 0.4s', borderRadius: '2px' }} />
            </div>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.82rem', color: gameState.lp[me] > 2000 ? '#4cc9a8' : '#e84c4c', minWidth: '48px', textAlign: 'right' }}>{gameState.lp[me]}</span>
            <span style={{ fontSize: '0.62rem', color: 'rgba(201,168,76,0.3)', fontFamily: 'Rajdhani, sans-serif' }}>✋{gameState.hands[me].length}</span>
          </div>

          {/* MAIN JOUEUR */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', padding: '6px 8px', flexShrink: 0, minHeight: '90px', alignItems: 'flex-end' }}>
            {gameState.hands[me].map((card, i) => {
              const sel = gameState.selectedHandCard === i
              const canSelect = isMyTurn && (gameState.phase === 'MAIN1' || gameState.phase === 'MAIN2')
              return (
                <div key={i}
                  onClick={() => {
                    if (!canSelect) return
                    update(s => ({ ...s, selectedHandCard: s.selectedHandCard === i ? null : i, attackingCard: null }))
                  }}
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{ width: '56px', height: '78px', borderRadius: '5px', border: sel ? '2px solid #c9a84c' : '1px solid rgba(201,168,76,0.2)', background: '#141428', cursor: canSelect ? 'pointer' : 'default', overflow: 'hidden', position: 'relative', flexShrink: 0, transform: sel ? 'translateY(-12px)' : 'translateY(0)', boxShadow: sel ? '0 0 14px rgba(201,168,76,0.6)' : 'none', transition: 'all 0.15s' }}>
                  {card.image_url ? <img src={card.image_url} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>🎴</div>}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', padding: '1px 3px' }}>
                    <div style={{ fontSize: '0.4rem', color: '#e8e0cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  </div>
                </div>
              )
            })}
          </div>

        </div>

        {/* PANNEAU LATERAL */}
        <div style={{ width: '150px', flexShrink: 0, borderLeft: '1px solid rgba(201,168,76,0.08)', display: 'flex', flexDirection: 'column', background: '#08080f', overflow: 'hidden' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid rgba(201,168,76,0.08)', flexShrink: 0 }}>
            {hoveredCard ? (
              <div style={{ animation: 'fadeIn 0.15s ease' }}>
                <div style={{ width: '100%', aspectRatio: '0.72', borderRadius: '4px', overflow: 'hidden', background: '#141428', marginBottom: '6px', border: `1px solid ${rarityColor(hoveredCard.rarity)}40` }}>
                  {hoveredCard.image_url ? <img src={hoveredCard.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', opacity: 0.3 }}>🎴</div>}
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.68rem', color: '#c9a84c', marginBottom: '2px' }}>{hoveredCard.name}</div>
                <div style={{ fontSize: '0.58rem', color: rarityColor(hoveredCard.rarity), marginBottom: '4px' }}>Niv.{hoveredCard.level}</div>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.58rem', color: '#e84c4c', background: 'rgba(232,76,76,0.1)', padding: '1px 4px', borderRadius: '3px' }}>ATK {hoveredCard.atk}</span>
                  <span style={{ fontSize: '0.58rem', color: '#4c99c9', background: 'rgba(76,153,201,0.1)', padding: '1px 4px', borderRadius: '3px' }}>DEF {hoveredCard.def}</span>
                </div>
                {hoveredCard.effect && <div style={{ fontSize: '0.52rem', color: 'rgba(232,224,204,0.4)', lineHeight: '1.4', maxHeight: '60px', overflow: 'hidden' }}>{hoveredCard.effect}</div>}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0', color: 'rgba(201,168,76,0.15)' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>🎴</div>
                <div style={{ fontSize: '0.58rem', fontFamily: 'Rajdhani, sans-serif' }}>Survolez une carte</div>
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: 'rgba(201,168,76,0.3)', letterSpacing: '0.1em', marginBottom: '5px' }}>JOURNAL</div>
            {gameState.log.map((entry, i) => (
              <div key={i} style={{ fontSize: '0.58rem', color: i === 0 ? '#e8e0cc' : `rgba(232,224,204,${Math.max(0.18, 0.6 - i * 0.05)})`, marginBottom: '3px', lineHeight: '1.4', borderLeft: i === 0 ? '2px solid #c9a84c' : '2px solid transparent', paddingLeft: '4px' }}>{entry}</div>
            ))}
          </div>
        </div>
      </div>

      {/* FLASH MESSAGE */}
      {flash && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(6,6,15,0.96)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '8px', padding: '12px 24px', color: '#c9a84c', fontFamily: 'Cinzel, serif', fontSize: '0.85rem', zIndex: 200, pointerEvents: 'none', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
          {flash}
        </div>
      )}
    </main>
  )
}
