'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ──────────────────────────────────────────────────
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

type FieldCard = {
  card: CardData
  position: 'ATK' | 'DEF'
  faceDown?: boolean
}

type GameState = {
  phase: 'DRAW' | 'STANDBY' | 'MAIN1' | 'BATTLE' | 'MAIN2' | 'END'
  turn: number
  activePlayer: 0 | 1
  lp: [number, number]
  hands: [CardData[], CardData[]]
  fields: [(FieldCard | null)[], (FieldCard | null)[]]
  graveyards: [CardData[], CardData[]]
  decks: [CardData[], CardData[]]
  normalSummonedThisTurn: boolean
  hasAttackedThisTurn: boolean[]
  winner: null | 0 | 1 | 'draw'
  log: string[]
  selectedHandCard: number | null
  selectedFieldCard: { player: 0 | 1, zone: number } | null
  attackingCard: { player: 0 | 1, zone: number } | null
  pendingTribute: { card: CardData, needed: number, collected: number[] } | null
}

const INITIAL_HAND_SIZE = 5
const MAX_FIELD_ZONES = 5
const MAX_HAND_SIZE = 6
const STARTING_LP = 8000

// ── Helpers ────────────────────────────────────────────────
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

export default function GamePage({ params }: { params: { id: string } }) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [room, setRoom] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showGraveyard, setShowGraveyard] = useState<{ player: 0 | 1 } | null>(null)
  const [hoveredCard, setHoveredCard] = useState<CardData | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setMyId(session.user.id)

      // Mode test
      if (params.id === 'test') {
        const testCards = await loadTestCards()
        startGame(testCards, testCards, null)
        setLoading(false)
        return
      }

      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!roomData) { window.location.href = '/play'; return }
      setRoom(roomData)

      // Charger les decks des joueurs
      const hostCards = await loadDeckCards(roomData.host_deck_id)
      const guestCards = await loadDeckCards(roomData.guest_deck_id)

      startGame(hostCards, guestCards, roomData)
      setLoading(false)
    }
    init()
  }, [])

  async function loadTestCards(): Promise<CardData[]> {
    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('card_type', 'Monstre')
      .limit(30)
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      atk: c.atk || 1000,
      def: c.def || 1000,
      level: c.level || 4,
      card_type: c.card_type || 'Monstre',
      image_url: c.image_url || '',
      rarity: c.rarity || 'common',
      effect: c.effect,
      description: c.description
    }))
  }

  async function loadDeckCards(deckId: string | null): Promise<CardData[]> {
    if (!deckId) return loadTestCards()
    const { data: deck } = await supabase
      .from('player_decks')
      .select('cards')
      .eq('id', deckId)
      .single()

    if (!deck?.cards || deck.cards.length === 0) return loadTestCards()

    const cardIds = deck.cards.map((c: any) => c.card_id)
    const { data: cards } = await supabase.from('cards').select('*').in('id', cardIds)

    const result: CardData[] = []
    for (const entry of deck.cards) {
      const card = cards?.find(c => c.id === entry.card_id)
      if (card) {
        for (let i = 0; i < entry.quantity; i++) {
          result.push({
            id: card.id + '_' + i,
            name: card.name,
            atk: card.atk || 1000,
            def: card.def || 1000,
            level: card.level || 4,
            card_type: card.card_type || 'Monstre',
            image_url: card.image_url || '',
            rarity: card.rarity || 'common',
            effect: card.effect,
            description: card.description
          })
        }
      }
    }
    return result
  }

  function startGame(deck1: CardData[], deck2: CardData[], roomData: any) {
    const shuffled1 = shuffle(deck1)
    const shuffled2 = shuffle(deck2)
    const hand1 = shuffled1.splice(0, INITIAL_HAND_SIZE)
    const hand2 = shuffled2.splice(0, INITIAL_HAND_SIZE)

    const state: GameState = {
      phase: 'DRAW',
      turn: 1,
      activePlayer: 0,
      lp: [STARTING_LP, STARTING_LP],
      hands: [hand1, hand2],
      fields: [Array(MAX_FIELD_ZONES).fill(null), Array(MAX_FIELD_ZONES).fill(null)],
      graveyards: [[], []],
      decks: [shuffled1, shuffled2],
      normalSummonedThisTurn: false,
      hasAttackedThisTurn: Array(MAX_FIELD_ZONES).fill(false),
      winner: null,
      log: ['La partie commence !', 'Tour 1 — Joueur 1', 'Phase Pioche — Joueur 1 ne pioche pas au premier tour'],
      selectedHandCard: null,
      selectedFieldCard: null,
      attackingCard: null,
      pendingTribute: null
    }
    setGameState(state)
  }

  function addLog(state: GameState, msg: string): GameState {
    return { ...state, log: [msg, ...state.log.slice(0, 49)] }
  }

  function showMsg(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2500)
  }

  // ── PHASES ────────────────────────────────────────────────
  function nextPhase(state: GameState): GameState {
    const phases: GameState['phase'][] = ['DRAW', 'STANDBY', 'MAIN1', 'BATTLE', 'MAIN2', 'END']
    const idx = phases.indexOf(state.phase)

    if (idx === phases.length - 1) {
      return endTurn(state)
    }

    const nextP = phases[idx + 1]
    let newState = { ...state, phase: nextP, selectedHandCard: null, selectedFieldCard: null, attackingCard: null }

    if (nextP === 'DRAW') {
      newState = drawPhase(newState)
    } else if (nextP === 'END') {
      newState = endPhaseCheck(newState)
    }

    return addLog(newState, `Phase : ${phaseLabel(nextP)}`)
  }

  function drawPhase(state: GameState): GameState {
    const p = state.activePlayer
    if (state.decks[p].length === 0) {
      return { ...state, winner: p === 0 ? 1 : 0, log: [`Joueur ${p + 1} ne peut plus piocher — Défaite !`, ...state.log] }
    }
    const newDecks = state.decks.map(d => [...d]) as [CardData[], CardData[]]
    const newHands = state.hands.map(h => [...h]) as [CardData[], CardData[]]
    const drawn = newDecks[p].shift()!
    newHands[p].push(drawn)
    return addLog({ ...state, decks: newDecks, hands: newHands }, `Joueur ${p + 1} pioche une carte`)
  }

  function endPhaseCheck(state: GameState): GameState {
    const p = state.activePlayer
    let newState = { ...state }
    while (newState.hands[p].length > MAX_HAND_SIZE) {
      const newHands = newState.hands.map(h => [...h]) as [CardData[], CardData[]]
      const newGy = newState.graveyards.map(g => [...g]) as [CardData[], CardData[]]
      const discarded = newHands[p].pop()!
      newGy[p].push(discarded)
      newState = addLog({ ...newState, hands: newHands, graveyards: newGy }, `Joueur ${p + 1} défausse ${discarded.name}`)
    }
    return newState
  }

  function endTurn(state: GameState): GameState {
    const nextPlayer = state.activePlayer === 0 ? 1 : 0 as 0 | 1
    const newTurn = nextPlayer === 0 ? state.turn + 1 : state.turn
    let newState: GameState = {
      ...state,
      activePlayer: nextPlayer,
      phase: 'DRAW',
      turn: newTurn,
      normalSummonedThisTurn: false,
      hasAttackedThisTurn: Array(MAX_FIELD_ZONES).fill(false),
      selectedHandCard: null,
      selectedFieldCard: null,
      attackingCard: null,
      pendingTribute: null
    }
    newState = addLog(newState, `--- Tour ${newTurn} — Joueur ${nextPlayer + 1} ---`)
    newState = drawPhase(newState)
    return addLog(newState, `Phase : ${phaseLabel('DRAW')}`)
  }

  // ── INVOCATION ────────────────────────────────────────────
  function summonMonster(state: GameState, handIdx: number, fieldZone: number, position: 'ATK' | 'DEF'): GameState {
    const p = state.activePlayer
    const card = state.hands[p][handIdx]

    if (!card) return state
    if (state.normalSummonedThisTurn) { showMsg('Vous avez déjà invoqué normalement ce tour !'); return state }
    if (state.fields[p][fieldZone]) { showMsg('Cette zone est occupée !'); return state }
    if (state.phase !== 'MAIN1' && state.phase !== 'MAIN2') { showMsg('Vous ne pouvez invoquer qu\'en Main Phase !'); return state }

    // Tributs nécessaires
    const tributesNeeded = card.level >= 7 ? 2 : card.level >= 5 ? 1 : 0
    if (tributesNeeded > 0) {
      const monstersOnField = state.fields[p].filter(f => f !== null).length
      if (monstersOnField < tributesNeeded) {
        showMsg(`Vous avez besoin de ${tributesNeeded} tribut(s) !`)
        return state
      }
      return { ...state, pendingTribute: { card, needed: tributesNeeded, collected: [], }, selectedHandCard: handIdx }
    }

    return doSummon(state, handIdx, fieldZone, position, [])
  }

  function doSummon(state: GameState, handIdx: number, fieldZone: number, position: 'ATK' | 'DEF', tributeZones: number[]): GameState {
    const p = state.activePlayer
    const newHands = state.hands.map(h => [...h]) as [CardData[], CardData[]]
    const newFields = state.fields.map(f => [...f]) as [(FieldCard | null)[], (FieldCard | null)[]]
    const newGy = state.graveyards.map(g => [...g]) as [CardData[], CardData[]]

    // Envoyer tributs au cimetière
    for (const tz of tributeZones) {
      const tributed = newFields[p][tz]
      if (tributed) newGy[p].push(tributed.card)
      newFields[p][tz] = null
    }

    const card = newHands[p][handIdx]
    newHands[p].splice(handIdx, 1)
    newFields[p][fieldZone] = { card, position }

    return addLog({
      ...state,
      hands: newHands,
      fields: newFields,
      graveyards: newGy,
      normalSummonedThisTurn: true,
      pendingTribute: null,
      selectedHandCard: null,
      selectedFieldCard: null
    }, `Joueur ${p + 1} invoque ${card.name} (${position}) [${card.atk}/${card.def}]`)
  }

  // ── CHANGEMENT DE POSITION ────────────────────────────────
  function changePosition(state: GameState, zone: number): GameState {
    const p = state.activePlayer
    const fc = state.fields[p][zone]
    if (!fc) return state
    if (state.phase !== 'MAIN1' && state.phase !== 'MAIN2') { showMsg('Changement de position en Main Phase seulement !'); return state }
    const newFields = state.fields.map(f => [...f]) as [(FieldCard | null)[], (FieldCard | null)[]]
    newFields[p][zone] = { ...fc, position: fc.position === 'ATK' ? 'DEF' : 'ATK' }
    return addLog({ ...state, fields: newFields, selectedFieldCard: null }, `Joueur ${p + 1} change ${fc.card.name} en position ${fc.position === 'ATK' ? 'DEF' : 'ATK'}`)
  }

  // ── COMBAT ────────────────────────────────────────────────
  function declareAttack(state: GameState, attackerZone: number, targetZone: number | 'direct'): GameState {
    const p = state.activePlayer
    const opp = p === 0 ? 1 : 0 as 0 | 1

    if (state.phase !== 'BATTLE') { showMsg('Vous ne pouvez attaquer qu\'en Battle Phase !'); return state }
    if (state.turn === 1 && p === 0) { showMsg('Le premier joueur ne peut pas attaquer au premier tour !'); return state }
    if (state.hasAttackedThisTurn[attackerZone]) { showMsg('Ce monstre a déjà attaqué ce tour !'); return state }

    const attacker = state.fields[p][attackerZone]
    if (!attacker || attacker.position !== 'ATK') { showMsg('Ce monstre ne peut pas attaquer !'); return state }

    const newHasAttacked = [...state.hasAttackedThisTurn]
    newHasAttacked[attackerZone] = true
    let newState = { ...state, hasAttackedThisTurn: newHasAttacked, attackingCard: null, selectedFieldCard: null }

    // Direct attack
    if (targetZone === 'direct') {
      const oppHasMonsters = state.fields[opp].some(f => f !== null)
      if (oppHasMonsters) { showMsg('Vous ne pouvez pas attaquer directement !'); return state }
      const dmg = attacker.card.atk
      const newLp = [...state.lp] as [number, number]
      newLp[opp] -= dmg
      newState = { ...newState, lp: newLp }
      newState = addLog(newState, `Joueur ${p + 1} attaque directement ! ${attacker.card.name} inflige ${dmg} dommages`)
      if (newLp[opp] <= 0) return { ...newState, winner: p }
      return newState
    }

    // Attaque monstre
    const defender = state.fields[opp][targetZone]
    if (!defender) return state

    const newFields = state.fields.map(f => [...f]) as [(FieldCard | null)[], (FieldCard | null)[]]
    const newGy = state.graveyards.map(g => [...g]) as [CardData[], CardData[]]
    const newLp = [...state.lp] as [number, number]

    if (defender.position === 'ATK') {
      const atkA = attacker.card.atk
      const atkD = defender.card.atk
      if (atkA > atkD) {
        newGy[opp].push(defender.card)
        newFields[opp][targetZone] = null
        newLp[opp] -= (atkA - atkD)
        newState = addLog({ ...newState, fields: newFields, graveyards: newGy, lp: newLp }, `${attacker.card.name} détruit ${defender.card.name} ! Joueur ${opp + 1} perd ${atkA - atkD} LP`)
      } else if (atkA < atkD) {
        newGy[p].push(attacker.card)
        newFields[p][attackerZone] = null
        newLp[p] -= (atkD - atkA)
        newState = addLog({ ...newState, fields: newFields, graveyards: newGy, lp: newLp }, `${attacker.card.name} est détruit ! Joueur ${p + 1} perd ${atkD - atkA} LP`)
      } else {
        newGy[p].push(attacker.card)
        newGy[opp].push(defender.card)
        newFields[p][attackerZone] = null
        newFields[opp][targetZone] = null
        newState = addLog({ ...newState, fields: newFields, graveyards: newGy }, `Égalité ! Les deux monstres sont détruits`)
      }
    } else {
      // DEF
      const atkA = attacker.card.atk
      const defD = defender.card.def
      if (atkA > defD) {
        newGy[opp].push(defender.card)
        newFields[opp][targetZone] = null
        newState = addLog({ ...newState, fields: newFields, graveyards: newGy }, `${defender.card.name} est détruit en position DEF`)
      } else if (atkA < defD) {
        newLp[p] -= (defD - atkA)
        newState = addLog({ ...newState, lp: newLp }, `Joueur ${p + 1} perd ${defD - atkA} LP (attaque sur DEF)`)
      } else {
        newState = addLog(newState, `Rien ne se passe (égalité ATK/DEF)`)
      }
    }

    if (newState.lp[0] <= 0) return { ...newState, winner: 1 }
    if (newState.lp[1] <= 0) return { ...newState, winner: 0 }
    return newState
  }

  // ── INTERACTIONS UI ───────────────────────────────────────
  function handleHandCardClick(handIdx: number) {
    if (!gameState) return
    const p = gameState.activePlayer
    const card = gameState.hands[p][handIdx]
    if (!card) return

    // Si en attente de tribut
    if (gameState.pendingTribute) {
      return
    }

    setGameState(prev => prev ? {
      ...prev,
      selectedHandCard: prev.selectedHandCard === handIdx ? null : handIdx,
      selectedFieldCard: null,
      attackingCard: null
    } : prev)
  }

  function handleFieldZoneClick(player: 0 | 1, zone: number) {
    if (!gameState) return
    const p = gameState.activePlayer
    const opp = p === 0 ? 1 : 0 as 0 | 1

    // Tribut
    if (gameState.pendingTribute && player === p) {
      const fc = gameState.fields[p][zone]
      if (!fc) return
      const { card, needed, collected } = gameState.pendingTribute
      if (collected.includes(zone)) return
      const newCollected = [...collected, zone]
      if (newCollected.length >= needed) {
        // Trouver une zone libre
        const freeZone = gameState.fields[p].findIndex(f => f === null && !newCollected.includes(gameState.fields[p].indexOf(f)))
        const targetZone = gameState.fields[p].findIndex((f, i) => f === null && !newCollected.includes(i))
        if (targetZone === -1) { showMsg('Aucune zone libre !'); return }
        const handIdx = gameState.selectedHandCard!
        setGameState(prev => prev ? doSummon(prev, handIdx, targetZone, 'ATK', newCollected) : prev)
      } else {
        setGameState(prev => prev ? { ...prev, pendingTribute: { ...prev.pendingTribute!, collected: newCollected } } : prev)
      }
      return
    }

    // Attaque en cours
    if (gameState.attackingCard && player === opp) {
      const attackerZone = gameState.attackingCard.zone
      setGameState(prev => prev ? declareAttack(prev, attackerZone, zone) : prev)
      return
    }

    // Attaque directe
    if (gameState.attackingCard && player === p) {
      return
    }

    // Sélection carte main → invoquer
    if (gameState.selectedHandCard !== null && player === p) {
      const fc = gameState.fields[p][zone]
      if (fc) {
        // Zone occupée → changer de position
        if (p === player) {
          setGameState(prev => prev ? changePosition(prev, zone) : prev)
        }
        return
      }
      const handIdx = gameState.selectedHandCard
      const card = gameState.hands[p][handIdx]
      // Demander position
      const pos = confirm(`Invoquer ${card.name} en position ATK ou DEF ?\nOK = ATK, Annuler = DEF`) ? 'ATK' : 'DEF'
      setGameState(prev => prev ? summonMonster(prev, handIdx, zone, pos) : prev)
      return
    }

    // Sélection monstre sur le terrain
    if (player === p) {
      const fc = gameState.fields[p][zone]
      if (!fc) return
      setGameState(prev => prev ? {
        ...prev,
        selectedFieldCard: prev.selectedFieldCard?.zone === zone ? null : { player: p, zone },
        selectedHandCard: null,
        attackingCard: null
      } : prev)
    }
  }

  function handleDeclareAttack() {
    if (!gameState) return
    if (!gameState.selectedFieldCard) return
    const { zone } = gameState.selectedFieldCard
    const fc = gameState.fields[gameState.activePlayer][zone]
    if (!fc || fc.position !== 'ATK') { showMsg('Ce monstre ne peut pas attaquer !'); return }
    if (gameState.hasAttackedThisTurn[zone]) { showMsg('Ce monstre a déjà attaqué !'); return }

    // Vérifier direct attack
    const opp = gameState.activePlayer === 0 ? 1 : 0 as 0 | 1
    const oppHasMonsters = gameState.fields[opp].some(f => f !== null)
    if (!oppHasMonsters) {
      setGameState(prev => prev ? declareAttack(prev, zone, 'direct') : prev)
      return
    }

    setGameState(prev => prev ? {
      ...prev,
      attackingCard: { player: gameState.activePlayer, zone },
      selectedFieldCard: null
    } : prev)
    showMsg('Cliquez sur le monstre adverse à attaquer')
  }

  function handleChangePosition() {
    if (!gameState?.selectedFieldCard) return
    setGameState(prev => prev ? changePosition(prev, prev.selectedFieldCard!.zone) : prev)
  }

  function phaseLabel(phase: GameState['phase']) {
    const labels = { DRAW: 'Pioche', STANDBY: 'Veille', MAIN1: 'Phase Principale 1', BATTLE: 'Bataille', MAIN2: 'Phase Principale 2', END: 'Fin' }
    return labels[phase]
  }

  function phaseColor(phase: GameState['phase']) {
    const colors = { DRAW: '#4c99c9', STANDBY: '#aaa', MAIN1: '#c9a84c', BATTLE: '#e84c4c', MAIN2: '#c9a84c', END: '#9b4cc9' }
    return colors[phase]
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
      Chargement...
    </main>
  )

  if (!gameState) return null

  const p = gameState.activePlayer
  const opp = p === 0 ? 1 : 0 as 0 | 1

  return (
    <main style={{ height: '100vh', background: '#080810', color: '#e8e0cc', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
        @keyframes glow { 0%,100%{box-shadow:0 0 8px rgba(201,168,76,0.4)} 50%{box-shadow:0 0 20px rgba(201,168,76,0.9)} }
        @keyframes attackGlow { 0%,100%{box-shadow:0 0 8px rgba(232,76,76,0.4)} 50%{box-shadow:0 0 20px rgba(232,76,76,0.9)} }
        .field-zone {
          width: 72px; height: 100px; border-radius: 6px;
          border: 1px solid rgba(201,168,76,0.15); background: rgba(201,168,76,0.03);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s; position: relative; flex-shrink: 0;
        }
        .field-zone:hover { border-color: rgba(201,168,76,0.4); background: rgba(201,168,76,0.07); }
        .field-zone.selected { animation: glow 1s ease-in-out infinite; border-color: #c9a84c; }
        .field-zone.attacking { animation: attackGlow 0.6s ease-in-out infinite; border-color: #e84c4c; }
        .field-zone.target { border-color: #e84c4c; background: rgba(232,76,76,0.1); }
        .field-zone.tribute { border-color: #ff8800; background: rgba(255,136,0,0.1); }
        .hand-card {
          width: 56px; height: 78px; border-radius: 5px; flex-shrink: 0;
          border: 1px solid rgba(201,168,76,0.2); background: #141428;
          cursor: pointer; transition: all 0.15s; overflow: hidden; position: relative;
        }
        .hand-card:hover { transform: translateY(-12px); border-color: rgba(201,168,76,0.6); }
        .hand-card.selected { transform: translateY(-16px); border-color: #c9a84c; box-shadow: 0 0 14px rgba(201,168,76,0.7); }
        .phase-btn {
          padding: 6px 14px; border-radius: 5px; cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 0.78rem;
          letter-spacing: 0.08em; border: 1px solid; transition: all 0.2s;
        }
      `}</style>

      {/* ── ÉCRAN VICTOIRE ── */}
      {gameState.winner !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '2.5rem', color: '#c9a84c', marginBottom: '12px' }}>
              {gameState.winner === 'draw' ? 'Égalité !' : `Joueur ${(gameState.winner as number) + 1} gagne !`}
            </div>
            <div style={{ fontSize: '1rem', color: 'rgba(232,224,204,0.6)', marginBottom: '28px' }}>
              LP J1: {gameState.lp[0]} · LP J2: {gameState.lp[1]}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.9rem', cursor: 'pointer' }}>Rejouer</button>
              <button onClick={() => window.location.href = '/play'} style={{ padding: '12px 28px', background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', borderRadius: '6px', fontFamily: 'Cinzel, serif', fontSize: '0.9rem', cursor: 'pointer' }}>Menu</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.82rem', letterSpacing: '0.15em' }}>NEXUS CHRONICLES</span>
        <div style={{ flex: 1 }} />
        {/* Phase actuelle */}
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '0.82rem', color: phaseColor(gameState.phase), border: `1px solid ${phaseColor(gameState.phase)}60`, borderRadius: '4px', padding: '3px 10px', letterSpacing: '0.1em' }}>
          {phaseLabel(gameState.phase)}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'rgba(201,168,76,0.5)', fontFamily: 'Rajdhani, sans-serif' }}>
          Tour {gameState.turn} · Joueur {p + 1}
        </div>
        <button
          className="phase-btn"
          onClick={() => setGameState(prev => prev ? nextPhase(prev) : prev)}
          style={{ background: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.3)', color: '#c9a84c' }}
        >
          Phase suivante →
        </button>
        <button onClick={() => window.location.href = '/play'} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid rgba(201,76,76,0.3)', borderRadius: '4px', color: 'rgba(201,76,76,0.6)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>
          Abandonner
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── PLATEAU PRINCIPAL ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px', gap: '6px', overflow: 'hidden' }}>

          {/* LP Adversaire */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(201,76,76,0.06)', borderRadius: '6px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', color: 'rgba(232,224,204,0.6)' }}>Joueur {opp + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '120px', height: '6px', background: 'rgba(232,224,204,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(0, (gameState.lp[opp] / STARTING_LP) * 100)}%`, background: gameState.lp[opp] > 3000 ? '#4cc9a8' : gameState.lp[opp] > 1000 ? '#c9a84c' : '#e84c4c', transition: 'all 0.3s', borderRadius: '3px' }} />
              </div>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: gameState.lp[opp] > 3000 ? '#4cc9a8' : '#e84c4c', minWidth: '50px', textAlign: 'right' }}>{gameState.lp[opp]}</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>
              Main: {gameState.hands[opp].length} · Deck: {gameState.decks[opp].length}
            </span>
          </div>

          {/* Main adversaire (cachée) */}
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexShrink: 0, minHeight: '40px', alignItems: 'center' }}>
            {gameState.hands[opp].map((_, i) => (
              <div key={i} style={{ width: '28px', height: '38px', borderRadius: '3px', background: 'linear-gradient(135deg, #141428, #1a1a35)', border: '1px solid rgba(201,168,76,0.15)' }} />
            ))}
          </div>

          {/* Terrain adversaire */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
            {/* Cimetière adversaire */}
            <div onClick={() => setShowGraveyard({ player: opp })} style={{ width: '56px', height: '78px', borderRadius: '5px', border: '1px solid rgba(201,76,76,0.3)', background: 'rgba(201,76,76,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              {gameState.graveyards[opp].length > 0 ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img src={gameState.graveyards[opp][gameState.graveyards[opp].length - 1].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', opacity: 0.6 }} />
                  <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '1px 4px', fontSize: '0.6rem', color: '#e88080' }}>{gameState.graveyards[opp].length}</div>
                </div>
              ) : <span style={{ fontSize: '1.2rem', opacity: 0.3 }}>💀</span>}
            </div>

            {/* Zones monstre adversaire */}
            {gameState.fields[opp].map((fc, i) => (
              <div
                key={i}
                className={`field-zone ${gameState.attackingCard ? 'target' : ''} ${gameState.pendingTribute && fc ? 'tribute' : ''}`}
                onClick={() => handleFieldZoneClick(opp, i)}
                onMouseEnter={() => fc && setHoveredCard(fc.card)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {fc ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    {fc.position === 'DEF' ? (
                      <div style={{ width: '100%', height: '100%', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                        <span style={{ fontSize: '1.8rem' }}>🛡️</span>
                      </div>
                    ) : (
                      <img src={fc.card.image_url} alt={fc.card.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' }} />
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.75)', borderRadius: '0 0 5px 5px', padding: '2px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.55rem', color: fc.position === 'ATK' ? '#e84c4c' : '#4c99c9' }}>{fc.position}</span>
                      <span style={{ fontSize: '0.55rem', color: '#e8e0cc' }}>{fc.position === 'ATK' ? fc.card.atk : fc.card.def}</span>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '1.2rem', opacity: 0.15 }}>+</span>
                )}
              </div>
            ))}

            {/* Deck adversaire */}
            <div style={{ width: '56px', height: '78px', borderRadius: '5px', border: '1px solid rgba(201,168,76,0.2)', background: 'linear-gradient(135deg, #141428, #1a1a35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(201,168,76,0.5)' }}>{gameState.decks[opp].length}</span>
            </div>
          </div>

          {/* Séparateur central */}
          <div style={{ height: '1px', background: 'rgba(201,168,76,0.1)', flexShrink: 0, margin: '2px 0' }} />

          {/* Terrain joueur actif */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
            {/* Deck */}
            <div style={{ width: '56px', height: '78px', borderRadius: '5px', border: '1px solid rgba(201,168,76,0.2)', background: 'linear-gradient(135deg, #141428, #1a1a35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: 'rgba(201,168,76,0.5)' }}>{gameState.decks[p].length}</span>
            </div>

            {/* Zones monstre joueur */}
            {gameState.fields[p].map((fc, i) => (
              <div
                key={i}
                className={`field-zone
                  ${gameState.selectedFieldCard?.zone === i && gameState.selectedFieldCard?.player === p ? 'selected' : ''}
                  ${gameState.attackingCard?.zone === i && gameState.attackingCard?.player === p ? 'attacking' : ''}
                  ${gameState.pendingTribute?.collected.includes(i) ? 'tribute' : ''}
                `}
                onClick={() => handleFieldZoneClick(p, i)}
                onMouseEnter={() => fc && setHoveredCard(fc.card)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {fc ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <img src={fc.card.image_url} alt={fc.card.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px', opacity: gameState.hasAttackedThisTurn[i] ? 0.5 : 1 }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.75)', borderRadius: '0 0 5px 5px', padding: '2px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.55rem', color: fc.position === 'ATK' ? '#e84c4c' : '#4c99c9' }}>{fc.position}</span>
                      <span style={{ fontSize: '0.55rem', color: '#e8e0cc' }}>{fc.position === 'ATK' ? fc.card.atk : fc.card.def}</span>
                    </div>
                    {gameState.hasAttackedThisTurn[i] && <div style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '1px 3px', fontSize: '0.5rem', color: 'rgba(232,224,204,0.4)' }}>ATQ</div>}
                  </div>
                ) : (
                  <span style={{ fontSize: '1.2rem', opacity: 0.15 }}>+</span>
                )}
              </div>
            ))}

            {/* Cimetière */}
            <div onClick={() => setShowGraveyard({ player: p })} style={{ width: '56px', height: '78px', borderRadius: '5px', border: '1px solid rgba(201,76,76,0.3)', background: 'rgba(201,76,76,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              {gameState.graveyards[p].length > 0 ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img src={gameState.graveyards[p][gameState.graveyards[p].length - 1].image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', opacity: 0.6 }} />
                  <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,0,0,0.7)', borderRadius: '3px', padding: '1px 4px', fontSize: '0.6rem', color: '#e88080' }}>{gameState.graveyards[p].length}</div>
                </div>
              ) : <span style={{ fontSize: '1.2rem', opacity: 0.3 }}>💀</span>}
            </div>
          </div>

          {/* Boutons d'action */}
          {(gameState.selectedFieldCard || gameState.attackingCard) && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexShrink: 0 }}>
              {gameState.selectedFieldCard && gameState.phase === 'BATTLE' && (
                <button onClick={handleDeclareAttack} className="phase-btn" style={{ background: 'rgba(232,76,76,0.1)', borderColor: 'rgba(232,76,76,0.4)', color: '#e84c4c' }}>
                  ⚔️ Attaquer
                </button>
              )}
              {gameState.selectedFieldCard && (gameState.phase === 'MAIN1' || gameState.phase === 'MAIN2') && (
                <button onClick={handleChangePosition} className="phase-btn" style={{ background: 'rgba(76,153,201,0.1)', borderColor: 'rgba(76,153,201,0.4)', color: '#4c99c9' }}>
                  🔄 Changer position
                </button>
              )}
              <button onClick={() => setGameState(prev => prev ? { ...prev, selectedFieldCard: null, attackingCard: null } : prev)} className="phase-btn" style={{ background: 'transparent', borderColor: 'rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.5)' }}>
                Annuler
              </button>
            </div>
          )}

          {gameState.pendingTribute && (
            <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#ff8800', fontFamily: 'Rajdhani, sans-serif', flexShrink: 0, animation: 'pulse 1s ease-in-out infinite' }}>
              Sélectionnez {gameState.pendingTribute.needed - gameState.pendingTribute.collected.length} monstre(s) à sacrifier
            </div>
          )}

          {/* LP Joueur actif */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(76,201,168,0.06)', borderRadius: '6px', flexShrink: 0 }}>
            <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', color: 'rgba(232,224,204,0.6)' }}>Joueur {p + 1} (vous)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '120px', height: '6px', background: 'rgba(232,224,204,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(0, (gameState.lp[p] / STARTING_LP) * 100)}%`, background: gameState.lp[p] > 3000 ? '#4cc9a8' : gameState.lp[p] > 1000 ? '#c9a84c' : '#e84c4c', transition: 'all 0.3s', borderRadius: '3px' }} />
              </div>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: gameState.lp[p] > 3000 ? '#4cc9a8' : '#e84c4c', minWidth: '50px', textAlign: 'right' }}>{gameState.lp[p]}</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>
              Main: {gameState.hands[p].length} · Deck: {gameState.decks[p].length}
            </span>
          </div>

          {/* Main du joueur actif */}
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'flex-end', flexShrink: 0, minHeight: '90px', paddingBottom: '4px' }}>
            {gameState.hands[p].map((card, i) => (
              <div
                key={i}
                className={`hand-card ${gameState.selectedHandCard === i ? 'selected' : ''}`}
                onClick={() => handleHandCardClick(i)}
                onMouseEnter={() => setHoveredCard(card)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {card.image_url ? (
                  <img src={card.image_url} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: 0.3 }}>🎴</div>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.8)', padding: '1px 2px' }}>
                  <div style={{ fontSize: '0.45rem', color: '#e8e0cc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PANNEAU DROIT ── */}
        <div style={{ width: '220px', flexShrink: 0, borderLeft: '1px solid rgba(201,168,76,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Preview carte survolée */}
          <div style={{ padding: '8px', borderBottom: '1px solid rgba(201,168,76,0.1)', flexShrink: 0 }}>
            {hoveredCard ? (
              <div>
                <div style={{ width: '100%', aspectRatio: '0.72', borderRadius: '6px', overflow: 'hidden', background: '#141428', marginBottom: '6px', border: `1px solid ${rarityColor(hoveredCard.rarity)}50` }}>
                  {hoveredCard.image_url ? <img src={hoveredCard.image_url} alt={hoveredCard.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', opacity: 0.3 }}>🎴</div>}
                </div>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.78rem', color: '#c9a84c', marginBottom: '3px' }}>{hoveredCard.name}</div>
                <div style={{ fontSize: '0.65rem', color: rarityColor(hoveredCard.rarity), marginBottom: '4px' }}>Niv.{hoveredCard.level} · {hoveredCard.rarity}</div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#e84c4c', background: 'rgba(232,76,76,0.1)', padding: '2px 6px', borderRadius: '3px' }}>ATK {hoveredCard.atk}</span>
                  <span style={{ fontSize: '0.68rem', color: '#4c99c9', background: 'rgba(76,153,201,0.1)', padding: '2px 6px', borderRadius: '3px' }}>DEF {hoveredCard.def}</span>
                </div>
                {hoveredCard.effect && <div style={{ fontSize: '0.6rem', color: 'rgba(232,224,204,0.5)', lineHeight: '1.4', maxHeight: '60px', overflow: 'hidden' }}>{hoveredCard.effect}</div>}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', color: 'rgba(201,168,76,0.2)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🎴</div>
                <div style={{ fontSize: '0.65rem', fontFamily: 'Rajdhani, sans-serif' }}>Survolez une carte</div>
              </div>
            )}
          </div>

          {/* Log */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', color: 'rgba(201,168,76,0.4)', letterSpacing: '0.1em', marginBottom: '6px' }}>JOURNAL</div>
            {gameState.log.map((entry, i) => (
              <div key={i} style={{ fontSize: '0.65rem', color: i === 0 ? '#e8e0cc' : 'rgba(232,224,204,0.4)', marginBottom: '3px', lineHeight: '1.4', borderLeft: i === 0 ? '2px solid #c9a84c' : '2px solid transparent', paddingLeft: '6px' }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal cimetière */}
      {showGraveyard && (
        <div onClick={() => setShowGraveyard(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '20px', maxWidth: '600px', width: '100%', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.9rem', marginBottom: '14px' }}>
              Cimetière — Joueur {showGraveyard.player + 1} ({gameState.graveyards[showGraveyard.player].length} cartes)
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                {gameState.graveyards[showGraveyard.player].map((card, i) => (
                  <div key={i} onMouseEnter={() => setHoveredCard(card)} onMouseLeave={() => setHoveredCard(null)} style={{ borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.2)' }}>
                    {card.image_url ? <img src={card.image_url} alt={card.name} style={{ width: '100%', aspectRatio: '0.72', objectFit: 'cover' }} /> : <div style={{ width: '100%', aspectRatio: '0.72', background: '#141428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: 0.3 }}>🎴</div>}
                    <div style={{ padding: '2px 4px', background: '#0f0f1e', fontSize: '0.55rem', color: 'rgba(232,224,204,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</div>
                  </div>
                ))}
                {gameState.graveyards[showGraveyard.player].length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'rgba(201,168,76,0.3)', fontFamily: 'Cinzel, serif', fontSize: '0.82rem' }}>Cimetière vide</div>
                )}
              </div>
            </div>
            <button onClick={() => setShowGraveyard(null)} style={{ marginTop: '12px', padding: '8px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: 'rgba(201,168,76,0.6)', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif' }}>Fermer</button>
          </div>
        </div>
      )}

      {/* Message flash */}
      {message && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '8px', padding: '12px 24px', color: '#c9a84c', fontFamily: 'Cinzel, serif', fontSize: '0.88rem', zIndex: 150, pointerEvents: 'none', textAlign: 'center' }}>
          {message}
        </div>
      )}
    </main>
  )
}
