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
  winner: null | 0 | 1
  log: string[]
  selectedHandCard: number | null
  selectedFieldCard: { player: 0 | 1, zone: number, area: 'monster' | 'spell' } | null
  attackingCard: { zone: number } | null
  pendingTribute: { card: CardData, needed: number, collected: number[] } | null
  pendingSummonZone: number | null
  showSummonModal: { handIdx: number } | null
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
  const labels = { DRAW: 'Pioche', STANDBY: 'Veille', MAIN1: 'Phase Principale 1', BATTLE: 'Bataille', MAIN2: 'Phase Principale 2', END: 'Fin' }
  return labels[phase]
}

function phaseColor(phase: GameState['phase']) {
  const colors = { DRAW: '#4c99c9', STANDBY: '#aaa', MAIN1: '#c9a84c', BATTLE: '#e84c4c', MAIN2: '#c9a84c', END: '#9b4cc9' }
  return colors[phase]
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
  const [myRole, setMyRole] = useState<0 | 1>(0)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (params.id !== 'test') {
        const { data: roomCheck } = await supabase.from('game_rooms').select('host_id, guest_id').eq('id', params.id).single()
        if (roomCheck) setMyRole(roomCheck.host_id === session.user.id ? 0 : 1)
      }
      if (prof) {
        const { data: deck } = await supabase
          .from('player_decks')
          .select('*, card_backs(*)')
          .eq('player_id', session.user.id)
          .eq('is_active', true)
          .single()
        if (deck?.card_backs?.image_url) setCardBackUrl(deck.card_backs.image_url)
      }

      if (params.id === 'test') {
        const cards = await loadTestCards()
        startGame(cards, [...cards])
        setLoading(false)
        return
      }

      const { data: roomData } = await supabase.from('game_rooms').select('*').eq('id', params.id).single()
      if (!roomData) { window.location.href = '/play'; return }

      // Si une partie existe déjà, la charger directement
      if (roomData.game_state) {
        setGameState(roomData.game_state)
        setLoading(false)
        return
      }

      // Seul le host génère la partie
      if (roomData.host_id === session.user.id) {
        const deck1 = await loadDeckCards(roomData.host_deck_id)
        const deck2 = await loadDeckCards(roomData.guest_deck_id)
        const newState = buildGameState(deck1, deck2)
        await supabase.from('game_rooms').update({ game_state: newState }).eq('id', params.id)
        setGameState(newState)
      }

      setLoading(false)
    }
    init()

    if (params.id !== 'test') {
      const channel = supabase
        .channel(`game_${params.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${params.id}`
        }, (payload: any) => {
          if (payload.new.game_state) {
            setGameState(payload.new.game_state)
            setLoading(false)
          }
        })
        .subscribe((status) => {
          console.log('Realtime status:', status)
        })
      return () => { supabase.removeChannel(channel) }
    }
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

  function buildGameState(deck1: CardData[], deck2: CardData[]): GameState {
    const s1 = shuffle(deck1), s2 = shuffle(deck2)
    const h1 = s1.splice(0, INITIAL_HAND_SIZE), h2 = s2.splice(0, INITIAL_HAND_SIZE)
    return {
      phase: 'DRAW', turn: 1, activePlayer: 0,
      lp: [STARTING_LP, STARTING_LP],
      hands: [h1, h2],
      monsterZones: [Array(MAX_FIELD_ZONES).fill(null), Array(MAX_FIELD_ZONES).fill(null)],
      spellZones: [Array(MAX_FIELD_ZONES).fill(null), Array(MAX_FIELD_ZONES).fill(null)],
      graveyards: [[], []], decks: [s1, s2],
      normalSummonedThisTurn: false,
      hasAttackedThisTurn: Array(MAX_FIELD_ZONES).fill(false),
      winner: null,
      log: ['La partie commence !', 'Tour 1 — Joueur 1', 'Joueur 1 ne pioche pas au 1er tour'],
      selectedHandCard: null, selectedFieldCard: null, attackingCard: null,
      pendingTribute: null, pendingSummonZone: null, showSummonModal: null
    }
  }

  function startGame(deck1: CardData[], deck2: CardData[]) {
    setGameState(buildGameState(deck1, deck2))
  }

  function showMsg(msg: string) { setFlashMsg(msg); setTimeout(() => setFlashMsg(null), 2500) }

  async function syncGameState(state: GameState) {
    if (params.id === 'test') return
    await supabase.from('game_rooms').update({ game_state: state }).eq('id', params.id)
  }

  function doNextPhase(state: GameState): GameState {
    if (state.winner !== null) return state
    const phases: GameState['phase'][] = ['DRAW', 'STANDBY', 'MAIN1', 'BATTLE', 'MAIN2', 'END']
    const idx = phases.indexOf(state.phase)
    if (idx === phases.length - 1) return doEndTurn(state)
    const nextP = phases[idx + 1]
    let s = { ...state, phase: nextP, selectedHandCard: null, selectedFieldCard: null, attackingCard: null }
    if (nextP === 'DRAW') s = doDrawPhase(s)
    if (nextP === 'END') s = doEndPhase(s)
    return addLog(s, `⏭ Phase : ${phaseLabel(nextP)}`)
  }

  function doDrawPhase(state: GameState): GameState {
    const p = state.activePlayer
    if (state.decks[p].length === 0) return { ...state, winner: p === 0 ? 1 : 0 as 0 | 1 }
    const decks = state.decks.map(d => [...d]) as [CardData[], CardData[]]
    const hands = state.hands.map(h => [...h]) as [CardData[], CardData[]]
    const drawn = decks[p].shift()!
    hands[p].push(drawn)
    return addLog({ ...state, decks, hands }, `J${p + 1} pioche ${drawn.name}`)
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
    if (state.winner !== null) return state
    const next = (state.activePlayer === 0 ? 1 : 0) as 0 | 1
    const newTurn = next === 0 ? state.turn + 1 : state.turn
    const monsterZones = state.monsterZones.map(row =>
      row.map(fc => fc ? { ...fc, justPlaced: false } : null)
    ) as [(FieldCard | null)[], (FieldCard | null)[]]
    let s: GameState = {
      ...state, monsterZones, activePlayer: next, phase: 'DRAW', turn: newTurn,
      normalSummonedThisTurn: false, hasAttackedThisTurn: Array(MAX_FIELD_ZONES).fill(false),
      selectedHandCard: null, selectedFieldCard: null, attackingCard: null,
      pendingTribute: null, pendingSummonZone: null, showSummonModal: null
    }
    s = addLog(s, `--- Tour ${newTurn} — Joueur ${next + 1} ---`)
    if (s.decks[next].length === 0) return { ...s, winner: next === 0 ? 1 : 0 as 0 | 1 }
    s = doDrawPhase(s)
    return addLog(s, `⏭ Phase : ${phaseLabel('DRAW')}`)
  }

  function tryPlaceCard(state: GameState, handIdx: number, zone: number, summonType: 'ATK' | 'DEF' | 'SET'): GameState {
    const p = state.activePlayer
    const card = state.hands[p][handIdx]
    if (!card) return state
    if (state.phase !== 'MAIN1' && state.phase !== 'MAIN2') { showMsg('Invocation en Phase Principale seulement !'); return state }
    if (state.monsterZones[p][zone]) { showMsg('Zone occupée !'); return state }
    if (card.card_type === 'Monstre' || !card.card_type) {
      if (summonType !== 'SET' && state.normalSummonedThisTurn) { showMsg('Invocation normale déjà utilisée ce tour !'); return state }
      const tributesNeeded = card.level >= 7 ? 2 : card.level >= 5 ? 1 : 0
      if (summonType !== 'SET' && tributesNeeded > 0) {
        const monstersOnField = state.monsterZones[p].filter(f => f !== null).length
        if (monstersOnField < tributesNeeded) { showMsg(`Besoin de ${tributesNeeded} tribut(s) !`); return state }
        return { ...state, pendingTribute: { card, needed: tributesNeeded, collected: [] }, selectedHandCard: handIdx, pendingSummonZone: zone, showSummonModal: null }
      }
      return doSummon(state, handIdx, zone, summonType, [])
    }
    return state
  }

  function doSummon(state: GameState, handIdx: number, zone: number, position: MonsterPosition, tributeZones: number[]): GameState {
    const p = state.activePlayer
    const hands = state.hands.map(h => [...h]) as [CardData[], CardData[]]
    const monsterZones = state.monsterZones.map(r => [...r]) as [(FieldCard | null)[], (FieldCard | null)[]]
    const gy = state.graveyards.map(g => [...g]) as [CardData[], CardData[]]
    for (const tz of tributeZones) { const t = monsterZones[p][tz]; if (t) gy[p].push(t.card); monsterZones[p][tz] = null }
    const card = hands[p][handIdx]
    hands[p].splice(handIdx, 1)
    monsterZones[p][zone] = { card, position, justPlaced: true }
    const posLabel = position === 'SET' ? 'posé face cachée' : position === 'ATK' ? 'invoqué en ATK' : 'invoqué en DEF'
    return addLog({
      ...state, hands, monsterZones, graveyards: gy, normalSummonedThisTurn: true,
      pendingTribute: null, pendingSummonZone: null, showSummonModal: null,
      selectedHandCard: null, selectedFieldCard: null
    }, `J${p + 1} : ${card.name} ${posLabel} [${card.atk}/${card.def}]`)
  }

  function doChangePosition(state: GameState, zone: number): GameState {
    const p = state.activePlayer
    const fc = state.monsterZones[p][zone]
    if (!fc) return state
    if (fc.justPlaced) { showMsg('Ce monstre vient d\'être posé/invoqué !'); return state }
    if (state.phase !== 'MAIN1' && state.phase !== 'MAIN2') { showMsg('Changement de position en Phase Principale !'); return state }
    const newPos: MonsterPosition = fc.position === 'ATK' ? 'DEF' : fc.position === 'DEF' ? 'ATK' : 'ATK'
    const monsterZones = state.monsterZones.map(r => [...r]) as [(FieldCard | null)[], (FieldCard | null)[]]
    monsterZones[p][zone] = { ...fc, position: newPos, justPlaced: true }
    return addLog({ ...state, monsterZones, selectedFieldCard: null }, `J${p + 1} : ${fc.card.name} → ${newPos}`)
  }

  function doAttack(state: GameState, attackerZone: number, targetZone: number | 'direct'): GameState {
    const p = state.activePlayer
    const opp = p === 0 ? 1 : 0 as 0 | 1
    if (state.phase !== 'BATTLE') { showMsg('Attaque en Battle Phase seulement !'); return state }
    if (state.turn === 1 && p === 0) { showMsg('Pas d\'attaque au premier tour !'); return state }
    if (state.hasAttackedThisTurn[attackerZone]) { showMsg('Ce monstre a déjà attaqué !'); return state }
    const attacker = state.monsterZones[p][attackerZone]
    if (!attacker) return state
    if (attacker.position !== 'ATK') { showMsg('Seuls les monstres en ATK peuvent attaquer !'); return state }
    const newHasAttacked = [...state.hasAttackedThisTurn]; newHasAttacked[attackerZone] = true
    let s = { ...state, hasAttackedThisTurn: newHasAttacked, attackingCard: null, selectedFieldCard: null }

    if (targetZone === 'direct') {
      const oppHas = state.monsterZones[opp].some(f => f !== null)
      if (oppHas) { showMsg('L\'adversaire a des monstres !'); return state }
      const lp = [...state.lp] as [number, number]; lp[opp] -= attacker.card.atk
      s = addLog({ ...s, lp }, `⚔️ Attaque directe ! ${attacker.card.name} inflige ${attacker.card.atk} LP`)
      if (lp[opp] <= 0) return { ...s, winner: p }
      return s
    }

    const defender = state.monsterZones[opp][targetZone]; if (!defender) return state
    const monsterZones = state.monsterZones.map(r => [...r]) as [(FieldCard | null)[], (FieldCard | null)[]]
    const gy = state.graveyards.map(g => [...g]) as [CardData[], CardData[]]
    const lp = [...state.lp] as [number, number]

    if (defender.position === 'ATK') {
      const diff = attacker.card.atk - defender.card.atk
      if (diff > 0) { gy[opp].push(defender.card); monsterZones[opp][targetZone] = null; lp[opp] -= diff; s = addLog({ ...s, monsterZones, graveyards: gy, lp }, `⚔️ ${attacker.card.name} détruit ${defender.card.name} ! J${opp + 1} -${diff} LP`) }
      else if (diff < 0) { gy[p].push(attacker.card); monsterZones[p][attackerZone] = null; lp[p] += diff; s = addLog({ ...s, monsterZones, graveyards: gy, lp }, `⚔️ ${attacker.card.name} détruit ! J${p + 1} ${diff} LP`) }
      else { gy[p].push(attacker.card); gy[opp].push(defender.card); monsterZones[p][attackerZone] = null; monsterZones[opp][targetZone] = null; s = addLog({ ...s, monsterZones, graveyards: gy }, `⚔️ Égalité ! Les deux détruits`) }
    } else {
      const defVal = defender.card.def
      const diff = attacker.card.atk - defVal
      if (diff > 0) { gy[opp].push(defender.card); monsterZones[opp][targetZone] = null; s = addLog({ ...s, monsterZones, graveyards: gy }, `⚔️ ${defender.card.name} détruit en DEF`) }
      else if (diff < 0) { lp[p] += diff; s = addLog({ ...s, lp }, `⚔️ J${p + 1} -${Math.abs(diff)} LP (perce-DEF)`) }
      else { s = addLog(s, `⚔️ Rien (ATK = DEF)`) }
    }
    if (s.lp[0] <= 0) return { ...s, winner: 1 }
    if (s.lp[1] <= 0) return { ...s, winner: 0 }
    return s
  }

  function handleHandCardClick(handIdx: number) {
    if (!gameState || gameState.pendingTribute) return
    if (me !== p) return
    setGameState(prev => prev ? { ...prev, selectedHandCard: prev.selectedHandCard === handIdx ? null : handIdx, selectedFieldCard: null, attackingCard: null, showSummonModal: null } : prev)
  }

  function handleMonsterZoneClick(player: 0 | 1, zone: number) {
    if (!gameState) return
    if (me !== p) return
    const p = gameState.activePlayer
    const opp = p === 0 ? 1 : 0 as 0 | 1

    if (gameState.pendingTribute && player === p) {
      const fc = gameState.monsterZones[p][zone]; if (!fc) return
      const { needed, collected } = gameState.pendingTribute
      if (collected.includes(zone)) return
      const newCollected = [...collected, zone]
      if (newCollected.length >= needed) {
        const targetZone = gameState.pendingSummonZone ?? gameState.monsterZones[p].findIndex((f, i) => f === null && !newCollected.includes(i))
        if (targetZone === -1) { showMsg('Aucune zone libre !'); return }
        setGameState(prev => { if (!prev) return prev; const next = doSummon(prev, prev.selectedHandCard!, targetZone, 'ATK', newCollected); syncGameState(next); return next })
      } else {
        setGameState(prev => prev ? { ...prev, pendingTribute: { ...prev.pendingTribute!, collected: newCollected } } : prev)
      }
      return
    }

    if (gameState.attackingCard && player === opp) {
      setGameState(prev => { if (!prev) return prev; const next = doAttack(prev, prev.attackingCard!.zone, zone); syncGameState(next); return next }); return
    }

    if (gameState.selectedHandCard !== null && player === p) {
      if (gameState.monsterZones[p][zone]) { setGameState(prev => { if (!prev) return prev; const next = doChangePosition(prev, zone); syncGameState(next); return next }); return }
      setGameState(prev => prev ? { ...prev, pendingSummonZone: zone, showSummonModal: { handIdx: prev.selectedHandCard! } } : prev); return
    }

    if (player === p) {
      const fc = gameState.monsterZones[p][zone]; if (!fc) return
      setGameState(prev => prev ? { ...prev, selectedFieldCard: prev.selectedFieldCard?.zone === zone ? null : { player: p, zone, area: 'monster' }, selectedHandCard: null, attackingCard: null } : prev)
    }
  }

  function handleDeclareAttack() {
    if (!gameState?.selectedFieldCard) return
    if (me !== p) return
    const { zone } = gameState.selectedFieldCard
    const p = gameState.activePlayer, opp = p === 0 ? 1 : 0 as 0 | 1
    const oppHas = gameState.monsterZones[opp].some(f => f !== null)
    if (!oppHas) { setGameState(prev => { if (!prev) return prev; const next = doAttack(prev, zone, 'direct'); syncGameState(next); return next }); return }
    setGameState(prev => prev ? { ...prev, attackingCard: { zone }, selectedFieldCard: null } : prev)
    showMsg('Cliquez sur le monstre adverse')
  }

  if (loading || !gameState) return <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>Chargement de la partie...</main>

  const me = myRole
  const opp = myRole === 0 ? 1 : 0 as 0 | 1
  const p = gameState.activePlayer

  const MonsterZone = ({ player, zone }: { player: 0 | 1, zone: number }) => {
    const fc = gameState.monsterZones[player][zone]
    const isActive = player === p
    const isOpp = player === opp
    const isSelected = gameState.selectedFieldCard?.zone === zone && gameState.selectedFieldCard?.player === player
    const isAttacking = gameState.attackingCard?.zone === zone && isActive
    const isTarget = gameState.attackingCard && isOpp
    const isTribute = gameState.pendingTribute?.collected.includes(zone) && isActive

    return (
      <div
        onClick={() => handleMonsterZoneClick(player, zone)}
        onMouseEnter={() => fc && fc.position !== 'SET' && setHoveredCard(fc.card)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          width: '100px', height: '140px', borderRadius: '6px', flexShrink: 0,
          border: isSelected ? '2px solid #c9a84c' : isAttacking ? '2px solid #e84c4c' : isTarget && fc ? '2px solid #e84c4c' : isTribute ? '2px solid #ff8800' : '1px solid rgba(201,168,76,0.15)',
          background: isSelected ? 'rgba(201,168,76,0.1)' : isTarget && fc ? 'rgba(232,76,76,0.08)' : 'rgba(201,168,76,0.03)',
          cursor: 'pointer',
          overflow: 'visible',
          boxShadow: isSelected ? '0 0 12px rgba(201,168,76,0.5)' : isAttacking ? '0 0 12px rgba(232,76,76,0.5)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          position: 'relative',
          zIndex: fc ? 10 : 1
        }}
      >
        {fc ? (
          fc.position === 'SET' ? (
            <div style={{ width: '140px', height: '100px', position: 'absolute', borderRadius: '4px', overflow: 'hidden' }}>
              {cardBackUrl
                ? <img src={cardBackUrl} alt="dos" style={{ width: '100px', height: '140px', objectFit: 'cover', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(90deg)' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a35, #0f0f20)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '1.4rem', opacity: 0.4 }}>🎴</span></div>
              }
            </div>
          ) : fc.position === 'DEF' ? (
            <div style={{ width: '140px', height: '100px', position: 'absolute', borderRadius: '4px', overflow: 'visible' }}>
              <img src={fc.card.image_url || ''} alt={fc.card.name} style={{ width: '100px', height: '140px', objectFit: 'cover', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(90deg)', borderRadius: '4px' }} />
              <div style={{ position: 'absolute', bottom: '-22px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(6,6,15,0.92)', border: '1px solid rgba(76,153,201,0.5)', borderRadius: '4px', padding: '2px 8px', display: 'flex', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '0.65rem', color: '#4c99c9', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>DEF</span>
                <span style={{ fontSize: '0.72rem', color: '#e8e0cc', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>{fc.card.def}</span>
              </div>
            </div>
          ) : (
            <div style={{ width: '100px', height: '140px', flexShrink: 0, position: 'relative', overflow: 'visible', borderRadius: '4px' }}>
              <img src={fc.card.image_url || ''} alt={fc.card.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: gameState.hasAttackedThisTurn[zone] && isActive ? 0.5 : 1, borderRadius: '4px' }} />
              <div style={{ position: 'absolute', bottom: '-22px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(6,6,15,0.92)', border: '1px solid rgba(232,76,76,0.5)', borderRadius: '4px', padding: '2px 8px', display: 'flex', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: '0.65rem', color: '#e84c4c', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>ATK</span>
                <span style={{ fontSize: '0.72rem', color: '#e8e0cc', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>{fc.card.atk}</span>
              </div>
              {gameState.hasAttackedThisTurn[zone] && isActive && (
                <div style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '1px 3px', fontSize: '0.45rem', color: 'rgba(232,224,204,0.5)' }}>ATQ✓</div>
              )}
            </div>
          )
        ) : (
          <span style={{ fontSize: '1rem', opacity: 0.12, color: '#c9a84c' }}>M</span>
        )}
      </div>
    )
  }

  const SpellZone = ({ player, zone }: { player: 0 | 1, zone: number }) => {
    const fc = gameState.spellZones[player][zone]
    return (
      <div style={{ width: '100px', height: '140px', borderRadius: '6px', flexShrink: 0, border: '1px solid rgba(76,153,201,0.15)', background: 'rgba(76,153,201,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
        {fc ? <img src={fc.card.image_url} alt={fc.card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1rem', opacity: 0.12, color: '#4c99c9' }}>S</span>}
      </div>
    )
  }

  const FieldZone = ({ label }: { label: string }) => (
    <div style={{ width: '100px', height: '140px', borderRadius: '6px', flexShrink: 0, border: '1px dashed rgba(201,168,76,0.1)', background: 'rgba(201,168,76,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: '0.5rem', color: 'rgba(201,168,76,0.2)', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif' }}>{label}</span>
    </div>
  )

  const DeckZone = ({ player }: { player: 0 | 1 }) => (
    <div style={{ width: '100px', height: '140px', borderRadius: '6px', flexShrink: 0, border: '1px solid rgba(201,168,76,0.2)', background: 'linear-gradient(135deg, #141428, #1a1a35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
      <span style={{ fontSize: '0.6rem', color: 'rgba(201,168,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>DECK</span>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: '#c9a84c' }}>{gameState.decks[player].length}</span>
    </div>
  )

  const GraveyardZone = ({ player }: { player: 0 | 1 }) => (
    <div onClick={() => setShowGraveyard({ player })} style={{ width: '100px', height: '140px', borderRadius: '6px', flexShrink: 0, border: '1px solid rgba(201,76,76,0.25)', background: 'rgba(201,76,76,0.04)', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      {gameState.graveyards[player].length > 0 ? (
        <>
          <img src={gameState.graveyards[player][gameState.graveyards[player].length - 1].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
          <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '1px 4px', fontSize: '0.6rem', color: '#e88080' }}>{gameState.graveyards[player].length}</div>
          <div style={{ position: 'absolute', top: '2px', left: '2px', fontSize: '0.5rem', color: 'rgba(232,224,204,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>GY</div>
        </>
      ) : <span style={{ fontSize: '0.5rem', opacity: 0.3, color: '#e88080', fontFamily: 'Rajdhani, sans-serif' }}>GY</span>}
    </div>
  )

  return (
    <main style={{ height: '100vh', background: '#06060f', color: '#e8e0cc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .action-btn { padding: 6px 14px; border-radius: 5px; cursor: pointer; font-family: 'Rajdhani', sans-serif; font-size: 0.78rem; letter-spacing: 0.08em; border: 1px solid; transition: all 0.2s; }
      `}</style>

      {gameState.winner !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '2.8rem', color: '#c9a84c', marginBottom: '10px', textShadow: '0 0 30px rgba(201,168,76,0.6)' }}>Joueur {gameState.winner + 1} gagne !</div>
            <div style={{ fontSize: '1rem', color: 'rgba(232,224,204,0.5)', marginBottom: '28px' }}>J1: {gameState.lp[0]} LP · J2: {gameState.lp[1]} LP</div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.9rem', cursor: 'pointer' }}>Rejouer</button>
              <button onClick={() => window.location.href = '/play'} style={{ padding: '12px 28px', background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.9rem', cursor: 'pointer' }}>Menu</button>
            </div>
          </div>
        </div>
      )}

      {gameState.showSummonModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '12px', padding: '24px', maxWidth: '320px', width: '100%', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.9rem', marginBottom: '6px' }}>{gameState.hands[me][gameState.showSummonModal.handIdx]?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(232,224,204,0.5)', marginBottom: '20px' }}>
              Niv.{gameState.hands[me][gameState.showSummonModal.handIdx]?.level} · ATK {gameState.hands[me][gameState.showSummonModal.handIdx]?.atk} / DEF {gameState.hands[me][gameState.showSummonModal.handIdx]?.def}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => { const { handIdx } = gameState.showSummonModal!; setGameState(prev => { if (!prev) return prev; const next = tryPlaceCard(prev, handIdx, prev.pendingSummonZone!, 'ATK'); syncGameState(next); return next }) }} style={{ padding: '12px', background: 'rgba(232,76,76,0.1)', border: '1px solid rgba(232,76,76,0.4)', borderRadius: '6px', color: '#e84c4c', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>⚔️ Invoquer en ATK</button>
              <button onClick={() => { const { handIdx } = gameState.showSummonModal!; setGameState(prev => { if (!prev) return prev; const next = tryPlaceCard(prev, handIdx, prev.pendingSummonZone!, 'DEF'); syncGameState(next); return next }) }} style={{ padding: '12px', background: 'rgba(76,153,201,0.1)', border: '1px solid rgba(76,153,201,0.4)', borderRadius: '6px', color: '#4c99c9', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>🛡️ Invoquer en DEF</button>
              <button onClick={() => { const { handIdx } = gameState.showSummonModal!; setGameState(prev => { if (!prev) return prev; const next = tryPlaceCard(prev, handIdx, prev.pendingSummonZone!, 'SET'); syncGameState(next); return next }) }} style={{ padding: '12px', background: 'rgba(155,76,201,0.1)', border: '1px solid rgba(155,76,201,0.4)', borderRadius: '6px', color: '#9b4cc9', fontFamily: 'Cinzel, serif', fontSize: '0.82rem', cursor: 'pointer' }}>🃏 Poser face cachée</button>
              <button onClick={() => setGameState(prev => prev ? { ...prev, showSummonModal: null, pendingSummonZone: null, selectedHandCard: null } : prev)} style={{ padding: '8px', background: 'transparent', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '6px', color: 'rgba(201,168,76,0.5)', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.82rem', cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.12)', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.78rem', letterSpacing: '0.15em' }}>NEXUS CHRONICLES</span>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem', color: phaseColor(gameState.phase), border: `1px solid ${phaseColor(gameState.phase)}50`, borderRadius: '4px', padding: '2px 10px' }}>{phaseLabel(gameState.phase)}</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>Tour {gameState.turn} · J{p + 1}</div>
        <button onClick={() => { if (me !== p) return; setGameState(prev => { if (!prev) return prev; const next = doNextPhase(prev); syncGameState(next); return next }) }} style={{ padding: '5px 14px', opacity: me !== p ? 0.3 : 1, cursor: me !== p ? 'not-allowed' : 'pointer', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#c9a84c', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.78rem', cursor: 'pointer' }}>Phase suivante →</button>
        <button onClick={() => window.location.href = '/play'} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid rgba(201,76,76,0.25)', borderRadius: '4px', color: 'rgba(201,76,76,0.5)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>Abandonner</button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '4px 6px', gap: '4px', overflow: 'hidden', background: 'radial-gradient(ellipse at center, #0a0a18 0%, #06060f 100%)' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '3px 8px', background: 'rgba(232,76,76,0.05)', borderRadius: '5px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'rgba(232,224,204,0.5)', minWidth: '60px' }}>J{opp + 1}{opp === p ? ' ⚡' : ''}</span>
            <div style={{ flex: 1, height: '5px', background: 'rgba(232,224,204,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, (gameState.lp[opp] / STARTING_LP) * 100)}%`, background: gameState.lp[opp] > 3000 ? '#4cc9a8' : gameState.lp[opp] > 1000 ? '#c9a84c' : '#e84c4c', transition: 'all 0.4s', borderRadius: '3px' }} />
            </div>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: gameState.lp[opp] > 2000 ? '#4cc9a8' : '#e84c4c', minWidth: '50px', textAlign: 'right' }}>{gameState.lp[opp]}</span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.35)', fontFamily: 'Rajdhani, sans-serif' }}>✋{gameState.hands[opp].length} 📚{gameState.decks[opp].length}</span>
          </div>

          <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexShrink: 0, height: '32px', alignItems: 'center' }}>
            {gameState.hands[opp].map((_, i) => <div key={i} style={{ width: '22px', height: '30px', borderRadius: '2px', background: 'linear-gradient(135deg, #141428, #1a1a35)', border: '1px solid rgba(201,168,76,0.1)' }} />)}
          </div>

          {/* TERRAIN OPP Magie/Piège */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GraveyardZone player={opp} />
            {gameState.spellZones[opp].map((_, i) => <SpellZone key={i} player={opp} zone={i} />)}
            <FieldZone label="TERRAIN" />
          </div>

          {/* TERRAIN OPP Monstres */}
          <div style={{ display: 'flex', gap: '50px', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DeckZone player={opp} />
            {gameState.monsterZones[opp].map((_, i) => <MonsterZone key={i} player={opp} zone={i} />)}
            <div style={{ width: '100px', flexShrink: 0 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, padding: '2px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.08)' }} />
            <div style={{ fontSize: '0.6rem', color: 'rgba(201,168,76,0.2)', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.2em' }}>— NEXUS FIELD —</div>
            <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.08)' }} />
          </div>

          {/* TERRAIN P Monstres */}
          <div style={{ display: 'flex', gap: '50px', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: '100px', flexShrink: 0 }} />
            {gameState.monsterZones[me].map((_, i) => <MonsterZone key={i} player={me} zone={i} />)}
            <DeckZone player={me} />
          </div>

          {/* TERRAIN P Magie/Piège */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FieldZone label="TERRAIN" />
            {gameState.spellZones[me].map((_, i) => <SpellZone key={i} player={me} zone={i} />)}
            <GraveyardZone player={me} />
          </div>

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexShrink: 0, minHeight: '28px', alignItems: 'center' }}>
            {gameState.pendingTribute && (
              <div style={{ fontSize: '0.72rem', color: '#ff8800', fontFamily: 'Rajdhani, sans-serif', animation: 'pulse 1s ease-in-out infinite' }}>
                Sacrifiez {gameState.pendingTribute.needed - gameState.pendingTribute.collected.length} monstre(s)
              </div>
            )}
            {gameState.selectedFieldCard && !gameState.pendingTribute && (
              <>
                {gameState.phase === 'BATTLE' && <button onClick={handleDeclareAttack} className="action-btn" style={{ background: 'rgba(232,76,76,0.1)', borderColor: 'rgba(232,76,76,0.4)', color: '#e84c4c' }}>⚔️ Attaquer</button>}
                {(gameState.phase === 'MAIN1' || gameState.phase === 'MAIN2') && <button onClick={() => setGameState(prev => { if (!prev) return prev; const next = doChangePosition(prev, prev.selectedFieldCard!.zone); syncGameState(next); return next })} className="action-btn" style={{ background: 'rgba(76,153,201,0.1)', borderColor: 'rgba(76,153,201,0.4)', color: '#4c99c9' }}>🔄 Position</button>}
                <button onClick={() => setGameState(prev => prev ? { ...prev, selectedFieldCard: null, attackingCard: null } : prev)} className="action-btn" style={{ background: 'transparent', borderColor: 'rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.4)' }}>Annuler</button>
              </>
            )}
            {gameState.attackingCard && (
              <div style={{ fontSize: '0.72rem', color: '#e84c4c', fontFamily: 'Rajdhani, sans-serif', animation: 'pulse 0.8s ease-in-out infinite' }}>
                Cliquez sur un monstre adverse ou&nbsp;
                <span onClick={() => setGameState(prev => { if (!prev) return prev; const next = doAttack(prev, prev.attackingCard!.zone, 'direct'); syncGameState(next); return next })} style={{ textDecoration: 'underline', cursor: 'pointer' }}>attaque directe</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '3px 8px', background: 'rgba(76,201,168,0.05)', borderRadius: '5px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: 'rgba(232,224,204,0.5)', minWidth: '60px' }}>J{me + 1} (vous)</span>
            <div style={{ flex: 1, height: '5px', background: 'rgba(232,224,204,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, (gameState.lp[me] / STARTING_LP) * 100)}%`, background: gameState.lp[p] > 3000 ? '#4cc9a8' : gameState.lp[p] > 1000 ? '#c9a84c' : '#e84c4c', transition: 'all 0.4s', borderRadius: '3px' }} />
            </div>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: gameState.lp[me] > 2000 ? '#4cc9a8' : '#e84c4c', minWidth: '50px', textAlign: 'right' }}>{gameState.lp[me]}</span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.35)', fontFamily: 'Rajdhani, sans-serif' }}>✋{gameState.hands[me].length} 📚{gameState.decks[me].length}</span>
          </div>

          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'flex-end', flexShrink: 0, minHeight: '88px', paddingBottom: '2px' }}>
            {gameState.hands[me].map((card, i) => (
              <div key={i} onMouseEnter={() => setHoveredCard(card)} onMouseLeave={() => setHoveredCard(null)} onClick={() => handleHandCardClick(i)}
                style={{ width: '58px', height: '80px', borderRadius: '5px', flexShrink: 0, border: gameState.selectedHandCard === i ? '2px solid #c9a84c' : '1px solid rgba(201,168,76,0.2)', background: '#141428', cursor: 'pointer', overflow: 'hidden', position: 'relative', transform: gameState.selectedHandCard === i ? 'translateY(-14px)' : 'translateY(0)', boxShadow: gameState.selectedHandCard === i ? '0 0 14px rgba(201,168,76,0.6)' : 'none', transition: 'all 0.15s' }}>
                {card.image_url ? <img src={card.image_url} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>🎴</div>}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', padding: '1px 2px' }}>
                  <div style={{ fontSize: '0.42rem', color: '#e8e0cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '160px', flexShrink: 0, borderLeft: '1px solid rgba(201,168,76,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#08080f' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid rgba(201,168,76,0.08)', flexShrink: 0 }}>
            {hoveredCard ? (
              <div style={{ animation: 'fadeIn 0.15s ease' }}>
                <div style={{ width: '100%', aspectRatio: '0.72', borderRadius: '5px', overflow: 'hidden', background: '#141428', marginBottom: '6px', border: `1px solid ${rarityColor(hoveredCard.rarity)}40` }}>
                  {hoveredCard.image_url ? <img src={hoveredCard.image_url} alt={hoveredCard.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', opacity: 0.3 }}>🎴</div>}
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.72rem', color: '#c9a84c', marginBottom: '3px' }}>{hoveredCard.name}</div>
                <div style={{ fontSize: '0.6rem', color: rarityColor(hoveredCard.rarity), marginBottom: '4px' }}>Niv.{hoveredCard.level} · {hoveredCard.card_type}</div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.62rem', color: '#e84c4c', background: 'rgba(232,76,76,0.1)', padding: '2px 5px', borderRadius: '3px' }}>ATK {hoveredCard.atk}</span>
                  <span style={{ fontSize: '0.62rem', color: '#4c99c9', background: 'rgba(76,153,201,0.1)', padding: '2px 5px', borderRadius: '3px' }}>DEF {hoveredCard.def}</span>
                </div>
                {hoveredCard.effect && <div style={{ fontSize: '0.55rem', color: 'rgba(232,224,204,0.45)', lineHeight: '1.4', maxHeight: '55px', overflow: 'hidden' }}>{hoveredCard.effect}</div>}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px', color: 'rgba(201,168,76,0.15)' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '3px' }}>🎴</div>
                <div style={{ fontSize: '0.6rem', fontFamily: 'Rajdhani, sans-serif' }}>Survolez une carte</div>
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.58rem', color: 'rgba(201,168,76,0.35)', letterSpacing: '0.1em', marginBottom: '5px' }}>JOURNAL</div>
            {gameState.log.map((entry, i) => (
              <div key={i} style={{ fontSize: '0.6rem', color: i === 0 ? '#e8e0cc' : `rgba(232,224,204,${Math.max(0.2, 0.6 - i * 0.05)})`, marginBottom: '3px', lineHeight: '1.4', borderLeft: i === 0 ? '2px solid #c9a84c' : '2px solid transparent', paddingLeft: '5px' }}>{entry}</div>
            ))}
          </div>
        </div>
      </div>

      {showGraveyard && (
        <div onClick={() => setShowGraveyard(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '20px', maxWidth: '600px', width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.88rem', marginBottom: '14px' }}>Cimetière J{showGraveyard.player + 1} — {gameState.graveyards[showGraveyard.player].length} cartes</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '8px' }}>
                {gameState.graveyards[showGraveyard.player].map((card, i) => (
                  <div key={i} onMouseEnter={() => setHoveredCard(card)} onMouseLeave={() => setHoveredCard(null)} style={{ borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)' }}>
                    {card.image_url ? <img src={card.image_url} alt={card.name} style={{ width: '100%', aspectRatio: '0.72', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', aspectRatio: '0.72', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: 0.3 }}>🎴</div>}
                    <div style={{ padding: '2px 3px', background: '#0f0f1e', fontSize: '0.5rem', color: 'rgba(232,224,204,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  </div>
                ))}
                {gameState.graveyards[showGraveyard.player].length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'rgba(201,168,76,0.3)', fontFamily: 'Cinzel, serif', fontSize: '0.78rem' }}>Cimetière vide</div>}
              </div>
            </div>
            <button onClick={() => setShowGraveyard(null)} style={{ marginTop: '12px', padding: '8px', background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '4px', color: 'rgba(201,168,76,0.5)', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.82rem' }}>Fermer</button>
          </div>
        </div>
      )}

      {flashMsg && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(6,6,15,0.96)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '8px', padding: '12px 24px', color: '#c9a84c', fontFamily: 'Cinzel, serif', fontSize: '0.85rem', zIndex: 150, pointerEvents: 'none', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
          {flashMsg}
        </div>
      )}
    </main>
  )
}
