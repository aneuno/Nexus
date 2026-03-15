'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function CataloguePage() {
  const [cards, setCards] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterRarity, setFilterRarity] = useState('all')
  const [filterUniverse, setFilterUniverse] = useState('all')
  const [universes, setUniverses] = useState<string[]>([])
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('cards').select('*').order('name')
      if (data) {
        setCards(data)
        setFiltered(data)
        const univs = Array.from(new Set(data.map((c: any) => c.universe))) as string[]
        setUniverses(univs)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let result = cards
    if (search) result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    if (filterType !== 'all') result = result.filter(c => c.card_type === filterType)
    if (filterRarity !== 'all') result = result.filter(c => c.rarity === filterRarity)
    if (filterUniverse !== 'all') result = result.filter(c => c.universe === filterUniverse)
    setFiltered(result)
  }, [search, filterType, filterRarity, filterUniverse, cards])

  const rarityColor: any = {
    common: 'rgba(180,180,180,0.7)',
    rare: '#4c99c9',
    epic: '#9b4cc9',
    legendary: '#c9a84c'
  }

  const rarityLabel: any = {
    common: 'Commune',
    rare: 'Rare',
    epic: 'Épique',
    legendary: 'Légendaire'
  }

  const typeLabel: any = {
    monster: 'Monstre',
    spell: 'Sort',
    trap: 'Piège',
    fusion: 'Fusion',
    ritual: 'Rituel'
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e0cc', fontFamily: 'sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Rajdhani:wght@400;500;600&display=swap');
        .filter-select {
          padding: 7px 12px; background: #141428;
          border: 1px solid rgba(201,168,76,0.3); border-radius: 4px;
          color: #e8e0cc; font-family: 'Rajdhani', sans-serif;
          font-size: 0.82rem; outline: none; cursor: pointer;
        }
        .filter-select:focus { border-color: rgba(201,168,76,0.7); }
        .card-thumb {
          background: transparent; border-radius: 8px; padding: 0;
          cursor: pointer; transition: all 0.2s; overflow: hidden;
        }
        .card-thumb:hover {
          transform: translateY(-4px) scale(1.03);
          filter: brightness(1.15);
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; padding: 20px;
        }
        .modal-card {
          background: #0f0f1e; border: 1px solid rgba(201,168,76,0.4);
          border-radius: 12px; padding: 28px; max-width: 560px; width: 100%;
          position: relative;
        }
        .btn-3d {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 12px;
          background: linear-gradient(135deg, rgba(155,76,201,0.2), rgba(201,168,76,0.2));
          border: 1px solid rgba(201,168,76,0.5);
          border-radius: 6px; color: #c9a84c;
          font-family: 'Cinzel', serif; font-size: 0.85rem;
          letter-spacing: 0.1em; cursor: pointer;
          transition: all 0.2s; text-decoration: none;
          margin-top: 16px;
        }
        .btn-3d:hover {
          background: linear-gradient(135deg, rgba(155,76,201,0.35), rgba(201,168,76,0.35));
          box-shadow: 0 0 20px rgba(201,168,76,0.3);
          transform: translateY(-1px);
        }
      `}</style>

      {/* Topbar */}
      <div style={{ background: '#0a0a14', borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontFamily: 'Rajdhani, sans-serif' }}>← Menu</a>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1rem', letterSpacing: '0.15em' }}>Catalogue</span>
        <span style={{ fontSize: '0.75rem', color: 'rgba(201,168,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>
          {filtered.length} carte{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Filtres */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(201,168,76,0.1)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(10,10,20,0.8)' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une carte..."
          style={{ flex: 1, minWidth: '160px', padding: '7px 12px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontFamily: 'Rajdhani, sans-serif', fontSize: '0.88rem', outline: 'none' }}
        />
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Tous types</option>
          <option value="monster">Monstre</option>
          <option value="spell">Sort</option>
          <option value="trap">Piège</option>
          <option value="fusion">Fusion</option>
          <option value="ritual">Rituel</option>
        </select>
        <select className="filter-select" value={filterRarity} onChange={e => setFilterRarity(e.target.value)}>
          <option value="all">Toutes raretés</option>
          <option value="common">Commune</option>
          <option value="rare">Rare</option>
          <option value="epic">Épique</option>
          <option value="legendary">Légendaire</option>
        </select>
        <select className="filter-select" value={filterUniverse} onChange={e => setFilterUniverse(e.target.value)}>
          <option value="all">Tous univers</option>
          {universes.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Grille de cartes */}
      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.5)', fontFamily: 'Cinzel, sans-serif' }}>
            Chargement du catalogue...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(201,168,76,0.4)', fontFamily: 'Cinzel, sans-serif' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎴</div>
            Aucune carte trouvée
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
            {filtered.map(card => (
              <div key={card.id} className="card-thumb" onClick={() => setSelected(card)}>
                <div style={{
                  width: '100%', aspectRatio: '0.72', borderRadius: '8px', overflow: 'hidden',
                  background: '#141428',
                  border: `1px solid ${rarityColor[card.rarity] || 'rgba(201,168,76,0.2)'}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 8px ${rarityColor[card.rarity] || 'rgba(201,168,76,0.2)'}30`
                }}>
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: '2.5rem', opacity: 0.2 }}>🎴</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal détail carte */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: 'rgba(201,168,76,0.5)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

              {/* Image grande */}
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '180px', height: '252px', borderRadius: '8px', overflow: 'hidden',
                  background: '#141428',
                  border: `2px solid ${rarityColor[selected.rarity] || 'rgba(201,168,76,0.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 20px ${rarityColor[selected.rarity] || 'rgba(201,168,76,0.2)'}40`
                }}>
                  {selected.image_url ? (
                    <img src={selected.image_url} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: '4rem', opacity: 0.2 }}>🎴</div>
                  )}
                </div>

                {/* Bouton Visu 3D */}
                {selected.image_url && (
                  
                    href={`/card-3d?url=${encodeURIComponent(selected.image_url)}`}
                    className="btn-3d"
                  >
                    🌀 Voir en 3D
                  </a>
                )}
              </div>

              {/* Infos */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.1rem', color: '#c9a84c', marginBottom: '6px' }}>{selected.name}</div>
                <div style={{ fontSize: '0.78rem', color: rarityColor[selected.rarity], marginBottom: '12px', letterSpacing: '0.05em' }}>{rarityLabel[selected.rarity]}</div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c' }}>
                    {typeLabel[selected.card_type] || selected.card_type}
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '10px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', color: 'rgba(201,168,76,0.7)' }}>
                    {selected.universe}
                  </span>
                </div>

                {(selected.card_type === 'monster' || selected.card_type === 'fusion' || selected.card_type === 'ritual') && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', padding: '6px 14px', fontSize: '0.82rem' }}>
                      <span style={{ color: 'rgba(201,168,76,0.5)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>ATK </span>
                      <span style={{ color: '#c9a84c', fontWeight: 600, fontSize: '1rem' }}>{selected.atk}</span>
                    </div>
                    <div style={{ background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', padding: '6px 14px', fontSize: '0.82rem' }}>
                      <span style={{ color: 'rgba(201,168,76,0.5)', letterSpacing: '0.1em', fontSize: '0.7rem' }}>DEF </span>
                      <span style={{ color: '#c9a84c', fontWeight: 600, fontSize: '1rem' }}>{selected.def}</span>
                    </div>
                  </div>
                )}

                {selected.description && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(232,224,204,0.6)', lineHeight: '1.6', borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: '12px', marginBottom: '10px' }}>
                    {selected.description}
                  </div>
                )}

                {selected.effect && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(232,224,204,0.75)', lineHeight: '1.6', padding: '10px 12px', background: 'rgba(201,168,76,0.04)', borderRadius: '4px', border: '1px solid rgba(201,168,76,0.12)' }}>
                    {selected.effect}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
