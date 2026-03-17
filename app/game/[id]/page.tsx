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
  justPlaced: boolean
}

type GameState = {
  phase: 'DRAW' | 'STANDBY' | 'MAIN1' | 'BATTLE' | 'MAIN2' | 'END'
  turn: number
  activePlayer: 0 | 1
  lp: [number, number]
  hands: [CardData[], CardData[]]
  monsterZones: [(FieldCard | null)[], (FieldCard | null)[]]
  spellZones: [(FieldCard | null)[], (FieldCard | null)[]]
  graveyards: [CardData[], CardData[]]
  decks: [CardData[], CardData[]]
  normalSummonedThisTurn: boolean
  hasAttackedThisTurn: boolean[]
  drawnThisTurn: boolean
  winner: null | 0 | 1
  log: string[]
  selectedHandCard: number | null
  selectedFieldCard: { player: 0 | 1, zone: number } | null
  attackingCard: { zone: number } | null
  pendingTribute: { card: CardData, needed: number, collected: number[] } | null
  pendingSummonZone: number | null
  showSummonModal: { handIdx: number } | null
  showChangePositionModal: { zone: number } | null
}

const INITIAL_HAND_SIZE = 5
const MAX_FIELD_ZONES = 5
const MAX_HAND_SIZE = 6
const STARTING_LP = 8000

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function rarityColor(rarity: string) {
  const c: Record<string, string> = { common: '#aaa', rare: '#4c99c9', epic: '#9b4cc9', legendary: '#c9a84c' }
  return c[rarity] || '#c9a84c'
}

function phaseLabel(phase: GameState['phase']) {
  const l = { DRAW: 'Pioche', STANDBY: 'Veille', MAIN1: 'Principale 1', BATTLE: 'Bataille', MAIN2: 'Principale 2', END: 'Fin' }
  return l[phase]
}

function phaseColor(phase: GameState['phase']) {
  const c = { DRAW: '#4c99c9', STANDBY: '#888', MAIN1: '#c9a84c', BATTLE: '#e84c4c', MAIN2: '#c9a84c', END: '#9b4cc9' }
  return c[phase]
}

function addLog(state: GameState, msg: string): GameState {
  return { ...state, log: [msg, ...state.log.slice(0, 49)] }
}

export default function GamePage({ params }: { params: { id: string } }) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGraveyard, setShowGraveyard] = useState<{ player: 0 | 1 } | null>(null)
  const [hoveredCard, setHoveredCard] = useState<CardData | null>(null)
  const [flashMsg, setFlashMsg] = useState<string | null>(null)
  const [cardBackUrl, setCardBackUrl] = useState<string>('')
  const [dragOver, setDragOver] = useState<{ player: 0 | 1 } | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: deck } = await supabase
        .from('player_decks')
        .select('*, card_backs(*)')
        .eq('player_id', session.user.id)
        .eq('is_active', true)
        .single()
      if (deck?.card_backs?.image_url) setCardBackUrl(deck.card_backs.image_url)

      if (params.id === 'test') {
        const cards = await loadTestCards()
        startGame([...cards], [...cards])
        setLoading(false)
        return
      }

      const { data: roomData } = await supabase.from('game_rooms').select('*').eq('id', params.id).single()
      if (!roomData) { window.location.href = '/play'; return }
      const deck1 = await loadDeckCards(roomData.host_deck_id)
      const deck2 = await loadDeckCards(roomData.guest_deck_id)
      startGame(deck1, deck2)
      setLoading(false)
    }
    init()
  }, [])

  async function loadTestCards(): Promise<CardData[]> {
    const { data } = await supabase.from('cards').select('*').limit(40)
    return (data || []).map(c => ({
      id: c.id, name: c.name, atk: c.atk || 1000, def: c.def || 800,
      level: c.level || 4, card_type: c.card_type || 'Monstre',
      image_url: c.image_url || '', rarity: c.rarity || 'common',
      effect: c.effect, description: c.description
    }))
  }

  async function loadDeckCards(deckId: string | null): Promise<CardData[]> {
    if (!deckId) return loadTestCards()
    const { data: deck } = await supabase.from('player_decks').select('cards').eq('id', deckId).single()
    if (!deck?.cards?.length) return loadTestCards()
    const cardIds = deck.cards.map((c: any) => c.card_id)
    const { data: cards } = await supabase.from('cards').select('*').in('id', cardIds)
    const result: CardData[] = []
    for (const entry of deck.cards) {
      const card = cards?.find(c => c.id === entry.card_id)
      if (card) {
        for (let i = 0; i < entry.quantity; i++) {
          result.push({ id: card.id + '_' + i, name: card.name, atk: card.atk || 1000, def: card.def || 800, level: card.level || 4, card_type: card.card_type || 'Monstre', image_url: card.image_url || '', rarity: card.rarity || 'common', effect: card.effect, description: card.description })
        }
      }
    }
    return result
  }

  function startGame(deck1: CardData[], deck2: CardData[]) {
    const s1 = shuffle(deck1), s2 = shuffle(deck2)
    const h1 = s1.splice(0, INITIAL_HAND_SIZE), h2 = s2.splice(0, INITIAL_HAND_SIZE)
    setGameState({
      phase: 'DRAW', turn: 1, activePlayer: 0,
      lp: [STARTING_LP, STARTING_LP],
      hands: [h1, h2],
      monsterZones: [Array(MAX_FIELD_ZONES).fill(null), Array(MAX_FIELD_ZONES).fill(null)],
      spellZones: [Array(MAX_FIELD_ZONES).fill(null), Array(MAX_FIELD_ZONES).fill(null)],
      graveyards: [[], []], decks: [s1, s2],
      normalSummonedThisTurn: false,
      hasAttackedThisTurn: Array(MAX_FIELD_ZONES).fill(false),
      drawnThisTurn: true,
      winner: null,
      log: ['La partie commence !', 'Tour 1 — Joueur 1', 'J1 ne pioche pas au 1er tour'],
      selectedHandCard: null, selectedFieldCard: null, attackingCard: null,
      pendingTribute: null, pendingSummonZone: null,
      showSummonModal: null, showChangePositionModal: null
    })
  }

  function showMsg(msg: string) {
    setFlashMsg(msg)
    setTimeout(() => setFlashMsg(null), 2500)
  }

  // ── PHASES ────────────────────────────────────────────────
  function doNextPhase(state: GameState): GameState {
    const phases: GameState['phase'][] = ['DRAW', 'STANDBY', 'MAIN1', 'BATTLE', 'MAIN2', 'END']
    const idx = phases.indexOf(state.phase)
    if (idx === phases.length - 1) return doEndTurn(state)
    const nextP = phases[idx + 1]
    let s = { ...state, phase: nextP, selectedHandCard: null, selectedFieldCard: null, attackingCard: null, showSummonModal: null, showChangePositionModal: null }
    if (nextP === 'END') s = doEndPhase(s)
    return addLog(s, `⏭ ${phaseLabel(nextP)}`)
  }

  function doManualDraw(state: GameState): GameState {
    const p = state.activePlayer
    if (state.phase !== 'DRAW') { showMsg('Pioche en Draw Phase seulement !'); return state }
    if (state.drawnThisTurn) { showMsg('Vous avez déjà pioché ce tour !'); return state }
    if (state.decks[p].length === 0) return { ...state, winner: p === 0 ? 1 : 0 }
    const decks = state.decks.map(d => [...d]) as [CardData[], CardData[]]
    const hands = state.hands.map(h => [...h]) as [CardData[], CardData[]]
    const drawn = decks[p].shift()!
    hands[p].push(drawn)
    return addLog({ ...state, decks, hands, drawnThisTurn: true }, `J${p + 1} pioche ${drawn.name}`)
  }

  function doEndPhase(state: GameState): GameState {
    const p = state.activePlayer
    let s = { ...state }
    while (s.hands[p].length > MAX_HAND_SIZE) {
      const hands = s.hands.map(h => [...h]) as [CardData[], CardData[]]
      const gy = s.graveyards.map(g => [...g]) as [CardData[], CardData[]]
      const disc = hands[p].pop()!
      gy[p].push(disc)
      s = addLog({ ...s, hands, graveyards: gy }, `J${p + 1} défausse ${disc.name}`)
    }
    return s
  }

  function doEndTurn(state: GameState): GameState {
    const next = state.activePlayer === 0 ? 1 : 0 as 0 | 1
    const newTurn = next === 0 ? state.turn + 1 : state.turn
    const monsterZones = state.monsterZones.map(row =>
      row.map(fc => fc ? { ...fc, justPlaced: false } : null)
    ) as [(FieldCard | null)[], (FieldCard | null)[]]
    let s: GameState = {
      ...state, monsterZones, activePlayer: next, phase: 'DRAW', turn: newTurn,
      normalSummonedThisTurn: false, hasAttackedThisTurn: Array(MAX_FIELD_ZONES).fill(false),
      drawnThisTurn: false,
      selectedHandCard: null, selectedFieldCard: null, attackingCard: null,
      pendingTribute: null, pendingSummonZone: null, showSummonModal: null, showChangePositionModal: null
    }
    return addLog(s, `--- Tour ${newTurn} — J${next + 1} ---`)
  }

  // ── INVOCATION ────────────────────────────────────────────
  function tryPlaceCard(state: GameState, handIdx: number, zone: number, position: 'ATK' | 'SET'): GameState {
    const p = state.activePlayer
    const card = state.hands[p][handIdx]
    if (!card) return state
    if (state.phase !== 'MAIN1' && state.phase !== 'MAIN2') { showMsg('Invocation en Phase Principale !'); return state }
    if (state.monsterZones[p][zone]) { showMsg('Zone occupée !'); return state }
    if (state.normalSummonedThisTurn) { showMsg('Invocation normale déjà utilisée !'); return state }

    const tributesNeeded = card.level >= 7 ? 2 : card.level >= 5 ? 1 : 0
    if (position !== 'SET' && tributesNeeded > 0) {
      const monstersOnField = state.monsterZones[p].filter(f => f !== null).length
      if (monstersOnField < tributesNeeded) { showMsg(`Besoin de ${tributesNeeded} tribut(s) !`); return state }
      return { ...state, pendingTribute: { card, needed: tributesNeeded, collected: [] }, selectedHandCard: handIdx, pendingSummonZone: zone, showSummonModal: null }
    }

    return doSummon(state, handIdx, zone, position === 'SET' ? 'SET' : 'ATK', [])
  }

  function doSummon(state: GameState, handIdx: number, zone: number, position: MonsterPosition, tributeZones: number[]): GameState {
    const p = state.activePlayer
    const hands = state.hands.map(h => [...h]) as [CardData[], CardData[]]
    const monsterZones = state.monsterZones.map(r => [...r]) as [(FieldCard | null)[], (FieldCard | null)[]]
    const gy = state.graveyards.map(g => [...g]) as [CardData[], CardData[]]
    for (const tz of tributeZones) {
      const t = monsterZones[p][tz]
      if (t) gy[p].push(t.card)
      monsterZones[p][tz] = null
    }
    const card = hands[p][handIdx]
    hands[p].splice(handIdx, 1)
    monsterZones[p][zone] = { card, position, justPlaced: true }
    const label = position === 'SET' ? 'posé face cachée' : 'invoqué en ATK'
    return addLog({ ...state, hands, monsterZones, graveyards: gy, normalSummonedThisTurn: true, pendingTribute: null, pendingSummonZone: null, showSummonModal: null, selectedHandCard: null, selectedFieldCard: null }, `J${p + 1} : ${card.name} ${label} [${card.atk}/${card.def}]`)
  }

  // ── CHANGEMENT POSITION ───────────────────────────────────
  function doChangePosition(state: GameState, zone: number, newPos: 'ATK' | 'DEF'): GameState {
    const p = state.activePlayer
    const fc = state.monsterZones[p][zone]
    if (!fc) return state
    if (fc.justPlaced) { showMsg('Impossible ce tour !'); return state }
    if (state.phase !== 'MAIN1' && state.phase !== 'MAIN2') { showMsg('Phase Principale seulement !'); return state }
    const monsterZones = state.monsterZones.map(r => [...r]) as [(FieldCard | null)[], (FieldCard | null)[]]
    monsterZones[p][zone] = { ...fc, position: newPos, justPlaced: true }
    return addLog({ ...state, monsterZones, selectedFieldCard: null, showChangePositionModal: null }, `J${p + 1} : ${fc.card.name} → ${newPos}`)
  }

  // ── COMBAT ────────────────────────────────────────────────
  function doAttack(state: GameState, attackerZone: number, targetZone: number | 'direct'): GameState {
    const p = state.activePlayer
    const opp = p === 0 ? 1 : 0 as 0 | 1
    if (state.phase !== 'BATTLE') { showMsg('Battle Phase seulement !'); return state }
    if (state.turn === 1 && p === 0) { showMsg('Pas d\'attaque au tour 1 !'); return state }
    if (state.hasAttackedThisTurn[attackerZone]) { showMsg('Déjà attaqué ce tour !'); return state }
    const attacker = state.monsterZones[p][attackerZone]
    if (!attacker || attacker.position !== 'ATK') { showMsg('Seulement en position ATK !'); return state }
    const newHasAttacked = [...state.hasAttackedThisTurn]
    newHasAttacked[attackerZone] = true
    let s = { ...state, hasAttackedThisTurn: newHasAttacked, attackingCard: null, selectedFieldCard: null }

    if (targetZone === 'direct') {
      const oppHas = state.monsterZones[opp].some(f => f !== null)
      if (oppHas) { showMsg('L\'adversaire a des monstres !'); return state }
      const lp = [...state.lp] as [number, number]
      lp[opp] -= attacker.card.atk
      s = addLog({ ...s, lp }, `⚔️ Attaque directe ! ${attacker.card.name} → ${attacker.card.atk} dégâts`)
      if (lp[opp] <= 0) return { ...s, winner: p }
      return s
    }

    const defender = state.monsterZones[opp][targetZone]
    if (!defender) return state
    const monsterZones = state.monsterZones.map(r => [...r]) as [(FieldCard | null)[], (FieldCard | null)[]]
    const gy = state.graveyards.map(g => [...g]) as [CardData[], CardData[]]
    const lp = [...state.lp] as [number, number]

    // Révéler SET si attaqué
    if (defender.position === 'SET') {
      monsterZones[opp][targetZone] = { ...defender, position: 'DEF' }
    }

    const defPos = defender.position === 'SET' ? 'DEF' : defender.position

    if (defPos === 'ATK') {
      const diff = attacker.card.atk - defender.card.atk
      if (diff > 0) { gy[opp].push(defender.card); monsterZones[opp][targetZone] = null; lp[opp] -= diff; s = addLog({ ...s, monsterZones, graveyards: gy, lp }, `⚔️ ${attacker.card.name} détruit ${defender.card.name} ! J${opp + 1} -${diff} LP`) }
      else if (diff < 0) { gy[p].push(attacker.card); monsterZones[p][attackerZone] = null; lp[p] += diff; s = addLog({ ...s, monsterZones, graveyards: gy, lp }, `⚔️ ${attacker.card.name} détruit ! J${p + 1} ${diff} LP`) }
      else { gy[p].push(attacker.card); gy[opp].push(defender.card); monsterZones[p][attackerZone] = null; monsterZones[opp][targetZone] = null; s = addLog({ ...s, monsterZones, graveyards: gy }, `⚔️ Égalité !`) }
    } else {
      const diff = attacker.card.atk - defender.card.def
      if (diff > 0) { gy[opp].push(defender.card); monsterZones[opp][targetZone] = null; s = addLog({ ...s, monsterZones, graveyards: gy }, `⚔️ ${defender.card.name} détruit en DEF`) }
      else if (diff < 0) { lp[p] += diff; s = addLog({ ...s, lp }, `⚔️ J${p + 1} -${Math.abs(diff)} LP`) }
      else { s = addLog(s, `⚔️ Rien (ATK = DEF)`) }
    }

    if (s.lp[0] <= 0) return { ...s, winner: 1 }
    if (s.lp[1] <= 0) return { ...s, winner: 0 }
    return s
  }

  // ── HANDLERS ──────────────────────────────────────────────
  function handleHandCardClick(handIdx: number) {
    if (!gameState || gameState.pendingTribute) return
    setGameState(prev => prev ? { ...prev, selectedHandCard: prev.selectedHandCard === handIdx ? null : handIdx, selectedFieldCard: null, attackingCard: null, showSummonModal: null, showChangePositionModal: null } : prev)
  }

  function handleMonsterZoneClick(player: 0 | 1, zone: number) {
    if (!gameState) return
    const p = gameState.activePlayer
    const opp = p === 0 ? 1 : 0 as 0 | 1

    if (gameState.pendingTribute && player === p) {
      const fc = gameState.monsterZones[p][zone]
      if (!fc) return
      const { needed, collected } = gameState.pendingTribute
      if (collected.includes(zone)) return
      const newCollected = [...collected, zone]
      if (newCollected.length >= needed) {
        const targetZone = gameState.pendingSummonZone!
        setGameState(prev => prev ? doSummon(prev, prev.selectedHandCard!, targetZone, 'ATK', newCollected) : prev)
      } else {
        setGameState(prev => prev ? { ...prev, pendingTribute: { ...prev.pendingTribute!, collected: newCollected } } : prev)
      }
      return
    }

    if (gameState.attackingCard && player === opp) {
      setGameState(prev => prev ? doAttack(prev, prev.attackingCard!.zone, zone) : prev)
      return
    }

    if (gameState.selectedHandCard !== null && player === p) {
      if (gameState.monsterZones[p][zone]) { showMsg('Zone occupée !'); return }
      setGameState(prev => prev ? { ...prev, pendingSummonZone: zone, showSummonModal: { handIdx: prev.selectedHandCard! } } : prev)
      return
    }

    if (player === p) {
      const fc = gameState.monsterZones[p][zone]
      if (!fc) return
      setGameState(prev => prev ? {
        ...prev,
        selectedFieldCard: prev.selectedFieldCard?.zone === zone ? null : { player: p, zone },
        selectedHandCard: null, attackingCard: null, showSummonModal: null, showChangePositionModal: null
      } : prev)
    }
  }

  function handleDeclareAttack() {
    if (!gameState?.selectedFieldCard) return
    const { zone } = gameState.selectedFieldCard
    const p = gameState.activePlayer
    const opp = p === 0 ? 1 : 0 as 0 | 1
    const oppHas = gameState.monsterZones[opp].some(f => f !== null)
    if (!oppHas) { setGameState(prev => prev ? doAttack(prev, zone, 'direct') : prev); return }
    setGameState(prev => prev ? { ...prev, attackingCard: { zone }, selectedFieldCard: null } : prev)
    showMsg('Cliquez sur le monstre adverse')
  }

  function handleDeckDraw(player: 0 | 1) {
    if (!gameState) return
    if (player !== gameState.activePlayer) return
    setGameState(prev => prev ? doManualDraw(prev) : prev)
  }

  if (loading) return <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>Chargement...</main>
  if (!gameState) return null

  const p = gameState.activePlayer
  const opp = p === 0 ? 1 : 0 as 0 | 1

  // ── COMPOSANTS ────────────────────────────────────────────
  const CardBack = ({ small = false }: { small?: boolean }) => (
    <div style={{ width: '100%', height: '100%', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {cardBackUrl ? (
        <img src={cardBackUrl} alt="dos" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a45, #0f0f28)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(201,168,76,0.2)' }}>
          <span style={{ fontSize: small ? '0.8rem' : '1.2rem', opacity: 0.4 }}>🎴</span>
        </div>
      )}
    </div>
  )

  const MonsterCard = ({ fc, zone, player }: { fc: FieldCard, zone: number, player: 0 | 1 }) => {
    const isOwner = player === p
    const attacked = isOwner && gameState.hasAttackedThisTurn[zone]

    if (fc.position === 'SET') {
      return (
        <div style={{ width: '100px', height: '72px', borderRadius: '4px', overflow: 'hidden', opacity: attacked ? 0.5 : 1, flexShrink: 0 }}>
          <CardBack />
        </div>
      )
    }
    if (fc.position === 'DEF') {
      return (
        <div style={{ width: '100px', height: '72px', borderRadius: '4px', overflow: 'hidden', opacity: attacked ? 0.5 : 1, flexShrink: 0, position: 'relative' }}>
          {fc.card.image_url ? <img src={fc.card.image_url} alt={fc.card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.3 }}>🎴</div>}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', padding: '1px 3px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.48rem', color: '#4c99c9' }}>DEF</span>
            <span style={{ fontSize: '0.48rem', color: '#e8e0cc' }}>{fc.card.def}</span>
          </div>
        </div>
      )
    }
    return (
      <div style={{ width: '72px', height: '100px', borderRadius: '4px', overflow: 'hidden', opacity: attacked ? 0.5 : 1, flexShrink: 0, position: 'relative' }}>
        {fc.card.image_url ? <img src={fc.card.image_url} alt={fc.card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.3 }}>🎴</div>}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', padding: '2px 3px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.48rem', color: '#e84c4c' }}>ATK</span>
          <span style={{ fontSize: '0.48rem', color: '#e8e0cc' }}>{fc.card.atk}</span>
        </div>
        {attacked && <div style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', borderRadius: '2px', padding: '1px 3px', fontSize: '0.42rem', color: 'rgba(232,224,204,0.5)' }}>ATQ✓</div>}
      </div>
    )
  }

  const MonsterZone = ({ player, zone }: { player: 0 | 1, zone: number }) => {
    const fc = gameState.monsterZones[player][zone]
    const isActive = player === p
    const isOpp = player === opp
    const isSelected = gameState.selectedFieldCard?.zone === zone && gameState.selectedFieldCard?.player === player
    const isAttacking = gameState.attackingCard?.zone === zone && isActive
    const isTarget = !!gameState.attackingCard && isOpp && !!fc
    const isTribute = gameState.pendingTribute?.collected.includes(zone) && isActive
    const isHorizontal = fc && (fc.position === 'DEF' || fc.position === 'SET')

    return (
      <div
        onClick={() => handleMonsterZoneClick(player, zone)}
        onMouseEnter={() => fc && fc.position !== 'SET' && setHoveredCard(fc.card)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          width: '80px', height: '110px',
          borderRadius: '6px', flexShrink: 0,
          border: isSelected ? '2px solid #c9a84c' : isAttacking ? '2px solid #e84c4c' : isTarget ? '2px solid #e84c4c' : isTribute ? '2px solid #ff8800' : '1px solid rgba(201,168,76,0.12)',
          background: isSelected ? 'rgba(201,168,76,0.08)' : isTarget ? 'rgba(232,76,76,0.06)' : 'rgba(201,168,76,0.02)',
          boxShadow: isSelected ? '0 0 14px rgba(201,168,76,0.4)' : isAttacking ? '0 0 14px rgba(232,76,76,0.5)' : 'none',
          cursor: 'pointer', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          overflow: 'visible'
        }}
      >
        {fc ? (
          <div style={{
            position: 'absolute',
            transform: isHorizontal ? 'rotate(90deg)' : 'none',
            zIndex: isHorizontal ? 10 : 1,
            transformOrigin: 'center center'
          }}>
            <MonsterCard fc={fc} zone={zone} player={player} />
          </div>
        ) : (
          <span style={{ fontSize: '0.65rem', opacity: 0.1, color: '#c9a84c', fontFamily: 'Rajdhani, sans-serif' }}>M</span>
        )}
      </div>
    )
  }

  const SpellZone = ({ player, zone }: { player: 0 | 1, zone: number }) => {
    const fc = gameState.spellZones[player][zone]
    return (
      <div style={{ width: '80px', height: '110px', borderRadius: '6px', flexShrink: 0, border: '1px solid rgba(76,153,201,0.12)', background: 'rgba(76,153,201,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
        {fc ? <img src={fc.card.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '0.65rem', opacity: 0.1, color: '#4c99c9', fontFamily: 'Rajdhani, sans-serif' }}>S/P</span>}
      </div>
    )
  }

  const FieldSpellZone = () => (
    <div style={{ width: '80px', height: '110px', borderRadius: '6px', flexShrink: 0, border: '1px dashed rgba(201,168,76,0.08)', background: 'rgba(201,168,76,0.01)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: '0.52rem', opacity: 0.18, color: '#c9a84c', fontFamily: 'Rajdhani, sans-serif', textAlign: 'center', lineHeight: 1.3 }}>TERRAIN</span>
    </div>
  )

  const GraveyardZone = ({ player }: { player: 0 | 1 }) => (
    <div onClick={() => setShowGraveyard({ player })} style={{ width: '80px', height: '110px', borderRadius: '6px', flexShrink: 0, border: '1px solid rgba(201,76,76,0.2)', background: 'rgba(201,76,76,0.03)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s' }}>
      {gameState.graveyards[player].length > 0 ? (
        <>
          <img src={gameState.graveyards[player][gameState.graveyards[player].length - 1].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />
          <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '1px 5px', fontSize: '0.58rem', color: '#e88080' }}>{gameState.graveyards[player].length}</div>
          <div style={{ position: 'absolute', top: '3px', left: '3px', fontSize: '0.5rem', color: 'rgba(232,224,204,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>GY</div>
        </>
      ) : (
        <span style={{ fontSize: '0.52rem', opacity: 0.25, color: '#e88080', fontFamily: 'Rajdhani, sans-serif' }}>GY</span>
      )}
    </div>
  )

  const DeckZone = ({ player }: { player: 0 | 1 }) => {
    const isActive = player === gameState.activePlayer
    const canDraw = isActive && gameState.phase === 'DRAW' && !gameState.drawnThisTurn
    return (
      <div
        onClick={() => handleDeckDraw(player)}
        style={{
          width: '80px', height: '110px', borderRadius: '6px', flexShrink: 0,
          border: canDraw ? '2px solid #4c99c9' : '1px solid rgba(201,168,76,0.15)',
          background: canDraw ? 'rgba(76,153,201,0.08)' : 'transparent',
          cursor: canDraw ? 'pointer' : 'default',
          overflow: 'hidden', position: 'relative',
          boxShadow: canDraw ? '0 0 12px rgba(76,153,201,0.4)' : 'none',
          transition: 'all 0.2s'
        }}
      >
        {gameState.decks[player].length > 0 ? (
          <>
            <CardBack />
            <div style={{ position: 'absolute', bottom: '3px', right: '3px', background: 'rgba(0,0,0,0.75)', borderRadius: '3px', padding: '1px 5px', fontSize: '0.58rem', color: '#c9a84c', fontFamily: 'Cinzel, serif' }}>
              {gameState.decks[player].length}
            </div>
            {canDraw && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(76,153,201,0.15)' }}>
                <span style={{ fontSize: '0.62rem', color: '#4c99c9', fontFamily: 'Rajdhani, sans-serif', textAlign: 'center', letterSpacing: '0.05em' }}>PIOCHER</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.52rem', opacity: 0.25, color: '#e88080', fontFamily: 'Rajdhani, sans-serif' }}>VIDE</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <main style={{ height: '100vh', background: '#06060f', color: '#e8e0cc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 8px rgba(76,153,201,0.4)} 50%{box-shadow:0 0 20px rgba(76,153,201,0.8)} }
        .field-row { display:flex; gap:10px; align-items:center; justify-content:center; }
        .action-btn { padding:6px 14px; border-radius:5px; cursor:pointer; font-family:'Rajdhani',sans-serif; font-size:0.78rem; letter-spacing:0.08em; border:1px solid; transition:all 0.2s; }
      `}</style>

      {/* VICTOIRE */}
      {gameState.winner !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '2.8rem', color: '#c9a84c', marginBottom: '10px', textShadow: '0 0 30px rgba(201,168,76,0.6)' }}>
              Joueur {gameState.winner + 1} gagne !
            </div>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '24px', maxWidth: '300px', width: '100%', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.9rem', marginBottom: '4px' }}>
              {gameState.hands[p][gameState.showSummonModal.handIdx]?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(232,224,204,0.5)', marginBottom: '18px' }}>
              Niv.{gameState.hands[p][gameState.showSummonModal.handIdx]?.level} · ATK {gameState.hands[p][gameState.showSummonModal.handIdx]?.atk} / DEF {gameState.hands[p][gameState.showSummonModal.handIdx]?.def}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => { const { handIdx } = gameState.showSummonModal!; const zone = gameState.pendingSummonZone!; setGameState(prev => prev ? tryPlaceCard(prev, handIdx, zone, 'ATK') : prev) }} style={{ padding: '12px', background: 'rgba(232,76,76,0.1)', border: '1px solid rgba(232,76,76,0.4)', borderRadius: '6px', color: '#e84c4c', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>
                ⚔️ Invoquer (face visible)
              </button>
              <button onClick={() => { const { handIdx } = gameState.showSummonModal!; const zone = gameState.pendingSummonZone!; setGameState(prev => prev ? tryPlaceCard(prev, handIdx, zone, 'SET') : prev) }} style={{ padding: '12px', background: 'rgba(155,76,201,0.1)', border: '1px solid rgba(155,76,201,0.4)', borderRadius: '6px', color: '#9b4cc9', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>
                🃏 Poser (face cachée)
              </button>
              <button onClick={() => setGameState(prev => prev ? { ...prev, showSummonModal: null, pendingSummonZone: null, selectedHandCard: null } : prev)} style={{ padding: '8px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', color: 'rgba(201,168,76,0.5)', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.82rem', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHANGEMENT POSITION */}
      {gameState.showChangePositionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '24px', maxWidth: '280px', width: '100%', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.88rem', marginBottom: '16px' }}>Changer la position</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => { const { zone } = gameState.showChangePositionModal!; setGameState(prev => prev ? doChangePosition(prev, zone, 'ATK') : prev) }} style={{ padding: '11px', background: 'rgba(232,76,76,0.1)', border: '1px solid rgba(232,76,76,0.4)', borderRadius: '6px', color: '#e84c4c', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>
                ⚔️ Position ATK
              </button>
              <button onClick={() => { const { zone } = gameState.showChangePositionModal!; setGameState(prev => prev ? doChangePosition(prev, zone, 'DEF') : prev) }} style={{ padding: '11px', background: 'rgba(76,153,201,0.1)', border: '1px solid rgba(76,153,201,0.4)', borderRadius: '6px', color: '#4c99c9', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>
                🛡️ Position DEF
              </button>
              <button onClick={() => setGameState(prev => prev ? { ...prev, showChangePositionModal: null, selectedFieldCard: null } : prev)} style={{ padding: '8px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', color: 'rgba(201,168,76,0.5)', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.82rem', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.75rem', letterSpacing: '0.15em' }}>NEXUS CHRONICLES</span>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', color: phaseColor(gameState.phase), border: `1px solid ${phaseColor(gameState.phase)}50`, borderRadius: '4px', padding: '2px 10px' }}>
          {phaseLabel(gameState.phase)}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.45)', fontFamily: 'Rajdhani, sans-serif' }}>Tour {gameState.turn} · J{p + 1}</div>
        <button onClick={() => setGameState(prev => prev ? doNextPhase(prev) : prev)} style={{ padding: '5px 14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '4px', color: '#c9a84c', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.75rem', cursor: 'pointer' }}>
          Phase suivante →
        </button>
        <button onClick={() => window.location.href = '/play'} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid rgba(201,76,76,0.2)', borderRadius: '4px', color: 'rgba(201,76,76,0.5)', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>
          Abandonner
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* PLATEAU */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 12px', gap: '5px', overflow: 'hidden', background: 'radial-gradient(ellipse at center, #0a0a1a 0%, #06060f 100%)' }}>

          {/* LP Adversaire */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '3px 8px', background: 'rgba(232,76,76,0.04)', borderRadius: '5px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(232,224,204,0.45)', minWidth: '55px' }}>J{opp + 1}</span>
            <div style={{ flex: 1, height: '5px', background: 'rgba(232,224,204,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, (gameState.lp[opp] / STARTING_LP) * 100)}%`, background: gameState.lp[opp] > 3000 ? '#4cc9a8' : gameState.lp[opp] > 1000 ? '#c9a84c' : '#e84c4c', transition: 'all 0.4s', borderRadius: '3px' }} />
            </div>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: gameState.lp[opp] > 2000 ? '#4cc9a8' : '#e84c4c', minWidth: '48px', textAlign: 'right' }}>{gameState.lp[opp]}</span>
            <span style={{ fontSize: '0.62rem', color: 'rgba(201,168,76,0.3)', fontFamily: 'Rajdhani, sans-serif' }}>✋{gameState.hands[opp].length}</span>
          </div>

          {/* Main adversaire cachée */}
          <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexShrink: 0, height: '30px', alignItems: 'center' }}>
            {gameState.hands[opp].map((_, i) => (
              <div key={i} style={{ width: '20px', height: '28px', borderRadius: '2px', background: 'linear-gradient(135deg, #141428, #1a1a35)', border: '1px solid rgba(201,168,76,0.08)' }} />
            ))}
          </div>

          {/* TERRAIN ADVERSAIRE — Magie/Piège */}
          <div className="field-row" style={{ flexShrink: 0 }}>
            <GraveyardZone player={opp} />
            {gameState.spellZones[opp].map((_, i) => <SpellZone key={i} player={opp} zone={i} />)}
            <FieldSpellZone />
            <DeckZone player={opp} />
          </div>

          {/* TERRAIN ADVERSAIRE — Monstres */}
          <div className="field-row" style={{ flexShrink: 0 }}>
            <div style={{ width: '80px', flexShrink: 0 }} />
            {gameState.monsterZones[opp].map((_, i) => <MonsterZone key={i} player={opp} zone={i} />)}
            <div style={{ width: '80px', flexShrink: 0 }} />
          </div>

          {/* Séparateur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.07)' }} />
            <div style={{ fontSize: '0.55rem', color: 'rgba(201,168,76,0.18)', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.2em' }}>— NEXUS FIELD —</div>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.07)' }} />
          </div>

          {/* TERRAIN JOUEUR — Monstres */}
          <div className="field-row" style={{ flexShrink: 0 }}>
            <div style={{ width: '80px', flexShrink: 0 }} />
            {gameState.monsterZones[p].map((_, i) => <MonsterZone key={i} player={p} zone={i} />)}
            <div style={{ width: '80px', flexShrink: 0 }} />
          </div>

          {/* TERRAIN JOUEUR — Magie/Piège */}
          <div className="field-row" style={{ flexShrink: 0 }}>
            <DeckZone player={p} />
            <FieldSpellZone />
            {gameState.spellZones[p].map((_, i) => <SpellZone key={i} player={p} zone={i} />)}
            <GraveyardZone player={p} />
          </div>

          {/* Boutons d'action */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexShrink: 0, minHeight: '30px', alignItems: 'center' }}>
            {gameState.pendingTribute && (
              <div style={{ fontSize: '0.72rem', color: '#ff8800', fontFamily: 'Rajdhani, sans-serif', animation: 'pulse 1s ease-in-out infinite' }}>
                Sacrifiez {gameState.pendingTribute.needed - gameState.pendingTribute.collected.length} monstre(s)
              </div>
            )}
            {gameState.selectedFieldCard && !gameState.pendingTribute && (
              <>
                {gameState.phase === 'BATTLE' && (
                  <button onClick={handleDeclareAttack} className="action-btn" style={{ background: 'rgba(232,76,76,0.1)', borderColor: 'rgba(232,76,76,0.4)', color: '#e84c4c' }}>⚔️ Attaquer</button>
                )}
                {(gameState.phase === 'MAIN1' || gameState.phase === 'MAIN2') && (() => {
                  const fc = gameState.monsterZones[p][gameState.selectedFieldCard.zone]
                  if (fc && !fc.justPlaced) {
                    return (
                      <button
                        onClick={() => setGameState(prev => prev ? { ...prev, showChangePositionModal: { zone: prev.selectedFieldCard!.zone } } : prev)}
                        className="action-btn"
                        style={{ background: 'rgba(76,153,201,0.1)', borderColor: 'rgba(76,153,201,0.4)', color: '#4c99c9' }}
                      >
                        🔄 Position
                      </button>
                    )
                  }
                  return null
                })()}
                <button onClick={() => setGameState(prev => prev ? { ...prev, selectedFieldCard: null, attackingCard: null } : prev)} className="action-btn" style={{ background: 'transparent', borderColor: 'rgba(201,168,76,0.15)', color: 'rgba(201,168,76,0.4)' }}>
                  Annuler
                </button>
              </>
            )}
            {gameState.attackingCard && (
              <div style={{ fontSize: '0.7rem', color: '#e84c4c', fontFamily: 'Rajdhani, sans-serif', animation: 'pulse 0.8s ease-in-out infinite' }}>
                Cliquez sur un monstre adverse ·&nbsp;
                <span onClick={() => setGameState(prev => prev ? doAttack(prev, prev.attackingCard!.zone, 'direct') : prev)} style={{ textDecoration: 'underline', cursor: 'pointer' }}>attaque directe</span>
              </div>
            )}
          </div>

          {/* LP Joueur */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '3px 8px', background: 'rgba(76,201,168,0.04)', borderRadius: '5px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(232,224,204,0.45)', minWidth: '55px' }}>J{p + 1} (vous)</span>
            <div style={{ flex: 1, height: '5px', background: 'rgba(232,224,204,0.07)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, (gameState.lp[p] / STARTING_LP) * 100)}%`, background: gameState.lp[p] > 3000 ? '#4cc9a8' : gameState.lp[p] > 1000 ? '#c9a84c' : '#e84c4c', transition: 'all 0.4s', borderRadius: '3px' }} />
            </div>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: gameState.lp[p] > 2000 ? '#4cc9a8' : '#e84c4c', minWidth: '48px', textAlign: 'right' }}>{gameState.lp[p]}</span>
            <span style={{ fontSize: '0.62rem', color: 'rgba(201,168,76,0.3)', fontFamily: 'Rajdhani, sans-serif' }}>✋{gameState.hands[p].length}</span>
          </div>

          {/* Main du joueur */}
          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'flex-end', flexShrink: 0, minHeight: '90px', paddingBottom: '2px' }}>
            {gameState.hands[p].map((card, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleHandCardClick(i)}
                style={{
                  width: '60px', height: '84px', borderRadius: '5px', flexShrink: 0,
                  border: gameState.selectedHandCard === i ? '2px solid #c9a84c' : '1px solid rgba(201,168,76,0.18)',
                  background: '#141428', cursor: 'pointer', overflow: 'hidden', position: 'relative',
                  transform: gameState.selectedHandCard === i ? 'translateY(-14px)' : 'translateY(0)',
                  boxShadow: gameState.selectedHandCard === i ? '0 0 14px rgba(201,168,76,0.55)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                {card.image_url ? <img src={card.image_url} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>🎴</div>}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.82)', padding: '1px 2px' }}>
                  <div style={{ fontSize: '0.4rem', color: '#e8e0cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANNEAU DROIT */}
        <div style={{ width: '195px', flexShrink: 0, borderLeft: '1px solid rgba(201,168,76,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#07070e' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid rgba(201,168,76,0.07)', flexShrink: 0 }}>
            {hoveredCard ? (
              <div style={{ animation: 'fadeIn 0.15s ease' }}>
                <div style={{ width: '100%', aspectRatio: '0.72', borderRadius: '5px', overflow: 'hidden', background: '#141428', marginBottom: '5px', border: `1px solid ${rarityColor(hoveredCard.rarity)}35` }}>
                  {hoveredCard.image_url ? <img src={hoveredCard.image_url} alt={hoveredCard.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', opacity: 0.3 }}>🎴</div>}
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: '#c9a84c', marginBottom: '2px' }}>{hoveredCard.name}</div>
                <div style={{ fontSize: '0.58rem', color: rarityColor(hoveredCard.rarity), marginBottom: '4px' }}>Niv.{hoveredCard.level} · {hoveredCard.card_type}</div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.6rem', color: '#e84c4c', background: 'rgba(232,76,76,0.08)', padding: '1px 5px', borderRadius: '3px' }}>ATK {hoveredCard.atk}</span>
                  <span style={{ fontSize: '0.6rem', color: '#4c99c9', background: 'rgba(76,153,201,0.08)', padding: '1px 5px', borderRadius: '3px' }}>DEF {hoveredCard.def}</span>
                </div>
                {hoveredCard.effect && <div style={{ fontSize: '0.52rem', color: 'rgba(232,224,204,0.4)', lineHeight: '1.4', maxHeight: '52px', overflow: 'hidden' }}>{hoveredCard.effect}</div>}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px', color: 'rgba(201,168,76,0.12)' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '3px' }}>🎴</div>
                <div style={{ fontSize: '0.58rem', fontFamily: 'Rajdhani, sans-serif' }}>Survolez une carte</div>
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '5px 7px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.55rem', color: 'rgba(201,168,76,0.3)', letterSpacing: '0.1em', marginBottom: '5px' }}>JOURNAL</div>
            {gameState.log.map((entry, i) => (
              <div key={i} style={{ fontSize: '0.57rem', color: i === 0 ? '#e8e0cc' : `rgba(232,224,204,${Math.max(0.18, 0.55 - i * 0.04)})`, marginBottom: '3px', lineHeight: '1.4', borderLeft: i === 0 ? '2px solid #c9a84c' : '2px solid transparent', paddingLeft: '5px' }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal cimetière */}
      {showGraveyard && (
        <div onClick={() => setShowGraveyard(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '20px', maxWidth: '580px', width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.85rem', marginBottom: '12px' }}>
              Cimetière J{showGraveyard.player + 1} — {gameState.graveyards[showGraveyard.player].length} cartes
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '7px' }}>
                {gameState.graveyards[showGraveyard.player].map((card, i) => (
                  <div key={i} onMouseEnter={() => setHoveredCard(card)} onMouseLeave={() => setHoveredCard(null)} style={{ borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.12)' }}>
                    {card.image_url ? <img src={card.image_url} alt={card.name} style={{ width: '100%', aspectRatio: '0.72', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', aspectRatio: '0.72', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: 0.3 }}>🎴</div>}
                    <div style={{ padding: '2px 3px', background: '#0f0f1e', fontSize: '0.48rem', color: 'rgba(232,224,204,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  </div>
                ))}
                {gameState.graveyards[showGraveyard.player].length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'rgba(201,168,76,0.25)', fontFamily: 'Cinzel, serif', fontSize: '0.75rem' }}>Cimetière vide</div>
                )}
              </div>
            </div>
            <button onClick={() => setShowGraveyard(null)} style={{ marginTop: '10px', padding: '7px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', color: 'rgba(201,168,76,0.45)', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.8rem' }}>Fermer</button>
          </div>
        </div>
      )}

      {/* Flash */}
      {flashMsg && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(6,6,15,0.96)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '8px', padding: '11px 22px', color: '#c9a84c', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', zIndex: 150, pointerEvents: 'none', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
          {flashMsg}
        </div>
      )}
    </main>
  )
}
