'use client'

import { useState } from 'react'

export default function CardMaker() {
  const [name, setName] = useState('Nom de la carte')
  const [atk, setAtk] = useState('0')
  const [def, setDef] = useState('0')
  const [effect, setEffect] = useState('Effet de la carte...')
  const [imageUrl, setImageUrl] = useState('')
  const [cardType, setCardType] = useState('monster')
  const [template, setTemplate] = useState('standard')

  function downloadSVG() {
    const svg = document.getElementById('card-svg')
    if (!svg) return
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.svg`
    a.click()
  }

  const typeColor = {
    monster: '#c9a84c', spell: '#4cc94c', trap: '#c94ca8', fusion: '#9b4cc9', ritual: '#4ca8c9'
  }[cardType] as string

  const typeBg = {
    monster: 'rgba(201,168,76,0.15)', spell: 'rgba(76,201,76,0.2)', trap: 'rgba(201,76,168,0.2)', fusion: 'rgba(155,76,201,0.2)', ritual: 'rgba(76,168,201,0.2)'
  }[cardType] as string

  const typeLabel = {
    monster: 'MONSTRE', spell: 'SORT', trap: 'PIÈGE', fusion: 'FUSION', ritual: 'RITUEL'
  }[cardType] as string

  const isMonster = cardType === 'monster' || cardType === 'fusion' || cardType === 'ritual'

  const sharedDefs = (
    <defs>
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c9a84c" stopOpacity="1" />
        <stop offset="50%" stopColor="#f0d080" stopOpacity="1" />
        <stop offset="100%" stopColor="#8a6a1e" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0a0a14" stopOpacity="1" />
        <stop offset="100%" stopColor="#0f0f1e" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1a1400" stopOpacity="1" />
        <stop offset="100%" stopColor="#2a2000" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="statGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0a0a14" stopOpacity="1" />
        <stop offset="50%" stopColor="#1a1400" stopOpacity="1" />
        <stop offset="100%" stopColor="#0a0a14" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="fadeBottom" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0a0a14" stopOpacity="0" />
        <stop offset="100%" stopColor="#0a0a14" stopOpacity="0.5" />
      </linearGradient>
      <radialGradient id="glowCenter" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.08" />
        <stop offset="60%" stopColor="#9b4cc9" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#0a0a14" stopOpacity="0" />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="textShadow">
        <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.9"/>
      </filter>
      <clipPath id="artClip">
        <rect x="18" y="70" width="244" height="200" rx="4"/>
      </clipPath>
      <clipPath id="fullArtClip">
        <rect x="2" y="2" width="276" height="396" rx="11"/>
      </clipPath>
    </defs>
  )

  const corners = (
    <>
      <line x1="8" y1="8" x2="36" y2="8" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5"/>
      <line x1="8" y1="8" x2="8" y2="36" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5"/>
      <line x1="272" y1="8" x2="244" y2="8" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5"/>
      <line x1="272" y1="8" x2="272" y2="36" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5"/>
      <line x1="8" y1="392" x2="36" y2="392" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5"/>
      <line x1="8" y1="392" x2="8" y2="366" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5"/>
      <line x1="272" y1="392" x2="244" y2="392" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5"/>
      <line x1="272" y1="392" x2="272" y2="366" stroke="rgba(201,168,76,0.5)" strokeWidth="1.5"/>
      <circle cx="8" cy="8" r="3" fill="#c9a84c" opacity="0.6"/>
      <circle cx="272" cy="8" r="3" fill="#c9a84c" opacity="0.6"/>
      <circle cx="8" cy="392" r="3" fill="#c9a84c" opacity="0.6"/>
      <circle cx="272" cy="392" r="3" fill="#c9a84c" opacity="0.6"/>
    </>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e0cc', fontFamily: 'sans-serif', padding: '20px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .input-field {
          width: 100%; padding: 8px 12px; background: #141428;
          border: 1px solid rgba(201,168,76,0.3); border-radius: 4px;
          color: #e8e0cc; font-size: 0.88rem; box-sizing: border-box; margin-bottom: 10px;
        }
        .input-field:focus { outline: none; border-color: rgba(201,168,76,0.7); }
        label { display: block; font-size: 0.72rem; color: rgba(201,168,76,0.6); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
        .template-btn {
          flex: 1; padding: 8px; background: transparent;
          border: 1px solid rgba(201,168,76,0.2); border-radius: 4px;
          color: rgba(232,224,204,0.5); font-size: 0.78rem; cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.05em;
        }
        .template-btn.active { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.6); color: #c9a84c; }
        .template-btn:hover { border-color: rgba(201,168,76,0.4); color: #e8e0cc; }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <a href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>← Retour</a>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1.2rem', letterSpacing: '0.1em' }}>Card Maker</h1>
        </div>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* FORMULAIRE */}
          <div style={{ flex: 1, minWidth: '260px', background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '20px' }}>

            <label>Template</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button className={`template-btn ${template === 'standard' ? 'active' : ''}`} onClick={() => setTemplate('standard')}>Standard</button>
              <button className={`template-btn ${template === 'fullart' ? 'active' : ''}`} onClick={() => setTemplate('fullart')}>Full Art</button>
            </div>

            <label>Type de carte</label>
            <select value={cardType} onChange={e => setCardType(e.target.value)} className="input-field">
              <option value="monster">Monstre</option>
              <option value="spell">Sort</option>
              <option value="trap">Piège</option>
              <option value="fusion">Fusion</option>
              <option value="ritual">Rituel</option>
            </select>

            <label>Nom de la carte</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Goku Ultra Instinct" />

            <label>URL illustration (Cloudinary)</label>
            <input className="input-field" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." />

            {template === 'standard' && (
              <>
                <label>Effet / Description</label>
                <textarea className="input-field" value={effect} onChange={e => setEffect(e.target.value)} rows={4} placeholder="Description ou effet de la carte..." style={{ resize: 'vertical' }} />
              </>
            )}

            {isMonster && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label>ATK</label>
                  <input className="input-field" value={atk} onChange={e => setAtk(e.target.value)} placeholder="2500" />
                </div>
                <div style={{ flex: 1 }}>
                  <label>DEF</label>
                  <input className="input-field" value={def} onChange={e => setDef(e.target.value)} placeholder="2000" />
                </div>
              </div>
            )}

            <button onClick={downloadSVG} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginTop: '8px', fontFamily: 'Cinzel, serif', letterSpacing: '0.1em' }}>
              Télécharger SVG
            </button>
          </div>

          {/* PREVIEW */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Aperçu — {template === 'standard' ? 'Standard' : 'Full Art'}
            </div>

            {/* ── TEMPLATE STANDARD ── */}
            {template === 'standard' && (
              <svg id="card-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 400" width="280" height="400">
                {sharedDefs}
                <rect width="280" height="400" rx="12" fill="url(#bgGrad)"/>
                <rect width="280" height="400" rx="12" fill="url(#glowCenter)"/>
                <rect x="2" y="2" width="276" height="396" rx="11" fill="none" stroke="url(#borderGrad)" strokeWidth="3" filter="url(#glow)"/>
                <rect x="8" y="8" width="264" height="384" rx="8" fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
                {corners}
                <rect x="14" y="14" width="252" height="32" rx="5" fill="url(#headerGrad)" stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>
                <text x="140" y="35" textAnchor="middle" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)" letterSpacing="1">
                  {name.length > 22 ? name.substring(0, 22) + '...' : name}
                </text>
                <rect x="14" y="50" width="60" height="16" rx="3" fill={typeBg} stroke={typeColor} strokeWidth="0.5" strokeOpacity="0.4"/>
                <text x="44" y="61" textAnchor="middle" fontFamily="sans-serif" fontSize="8" letterSpacing="0.5" fill={typeColor}>{typeLabel}</text>
                <rect x="18" y="70" width="244" height="200" rx="4" fill="rgba(255,255,255,0.02)" stroke="rgba(201,168,76,0.2)" strokeWidth="1"/>
                {imageUrl ? (
                  <image href={imageUrl} x="18" y="70" width="244" height="200" clipPath="url(#artClip)" preserveAspectRatio="xMidYMid slice"/>
                ) : (
                  <>
                    <circle cx="140" cy="170" r="55" fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth="1"/>
                    <circle cx="140" cy="170" r="38" fill="none" stroke="rgba(155,76,201,0.05)" strokeWidth="1"/>
                    <text x="140" y="165" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="rgba(201,168,76,0.2)">ILLUSTRATION</text>
                    <text x="140" y="180" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="rgba(201,168,76,0.15)">Colle une URL Cloudinary</text>
                  </>
                )}
                <line x1="18" y1="274" x2="262" y2="274" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
                <circle cx="140" cy="274" r="3" fill="#c9a84c" opacity="0.5"/>
                <circle cx="120" cy="274" r="1.5" fill="#c9a84c" opacity="0.25"/>
                <circle cx="160" cy="274" r="1.5" fill="#c9a84c" opacity="0.25"/>
                <rect x="14" y="280" width="252" height="70" rx="4" fill="rgba(201,168,76,0.02)" stroke="rgba(201,168,76,0.12)" strokeWidth="1"/>
                <text fontFamily="sans-serif" fontSize="8" fill="rgba(232,224,204,0.7)">
                  <tspan x="22" y="294">{effect.substring(0, 48)}</tspan>
                  <tspan x="22" dy="11">{effect.substring(48, 96)}</tspan>
                  <tspan x="22" dy="11">{effect.substring(96, 144)}</tspan>
                  <tspan x="22" dy="11">{effect.substring(144, 192)}</tspan>
                  <tspan x="22" dy="11">{effect.substring(192, 240)}</tspan>
                </text>
                <line x1="18" y1="355" x2="262" y2="355" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
                <circle cx="140" cy="355" r="3" fill="#c9a84c" opacity="0.5"/>
                {isMonster ? (
                  <>
                    <rect x="14" y="363" width="116" height="26" rx="4" fill="url(#statGrad)" stroke="rgba(201,168,76,0.35)" strokeWidth="1"/>
                    <text x="28" y="380" fontFamily="serif" fontSize="9" fill="rgba(201,168,76,0.6)" letterSpacing="1">ATK</text>
                    <text x="122" y="380" textAnchor="end" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)">{atk}</text>
                    <rect x="150" y="363" width="116" height="26" rx="4" fill="url(#statGrad)" stroke="rgba(201,168,76,0.35)" strokeWidth="1"/>
                    <text x="164" y="380" fontFamily="serif" fontSize="9" fill="rgba(201,168,76,0.6)" letterSpacing="1">DEF</text>
                    <text x="258" y="380" textAnchor="end" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)">{def}</text>
                  </>
                ) : (
                  <text x="140" y="382" textAnchor="middle" fontFamily="serif" fontSize="10" fill="rgba(201,168,76,0.4)" letterSpacing="2">
                    {cardType === 'spell' ? '✦ CARTE SORT ✦' : '✦ CARTE PIÈGE ✦'}
                  </text>
                )}
              </svg>
            )}

            {/* ── TEMPLATE FULL ART ── */}
            {template === 'fullart' && (
              <svg id="card-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 400" width="280" height="400">
                {sharedDefs}

                {/* Fond noir si pas d'image */}
                <rect width="280" height="400" rx="12" fill="url(#bgGrad)"/>

                {/* Illustration plein cadre */}
                {imageUrl && (
                  <image href={imageUrl} x="2" y="2" width="276" height="396" clipPath="url(#fullArtClip)" preserveAspectRatio="xMidYMid slice"/>
                )}

                {/* Dégradé subtil en bas pour les stats */}
                {isMonster && (
                  <rect x="2" y="300" width="276" height="98" rx="0" fill="url(#fadeBottom)"/>
                )}

                {/* Bordure dorée extérieure */}
                <rect x="2" y="2" width="276" height="396" rx="11" fill="none" stroke="url(#borderGrad)" strokeWidth="3" filter="url(#glow)"/>

                {/* Bordure intérieure fine */}
                <rect x="8" y="8" width="264" height="384" rx="8" fill="none" stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>

                {corners}

                {/* Nom — fond semi-transparent */}
                <rect x="14" y="14" width="252" height="32" rx="5" fill="rgba(10,10,20,0.45)" stroke="rgba(201,168,76,0.5)" strokeWidth="1"/>
                <text x="140" y="35" textAnchor="middle" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)" letterSpacing="1">
                  {name.length > 22 ? name.substring(0, 22) + '...' : name}
                </text>

                {/* Badge type — semi-transparent */}
                <rect x="14" y="50" width="60" height="16" rx="3" fill="rgba(10,10,20,0.45)" stroke={typeColor} strokeWidth="0.8" strokeOpacity="0.7"/>
                <text x="44" y="61" textAnchor="middle" fontFamily="sans-serif" fontSize="8" letterSpacing="0.5" fill={typeColor} filter="url(#textShadow)">{typeLabel}</text>

                {/* Stats monstres en bas — semi-transparentes */}
                {isMonster && (
                  <>
                    <line x1="18" y1="358" x2="262" y2="358" stroke="rgba(201,168,76,0.5)" strokeWidth="1"/>
                    <circle cx="140" cy="358" r="3" fill="#c9a84c" opacity="0.7"/>
                    <rect x="14" y="365" width="116" height="26" rx="4" fill="rgba(10,10,20,0.45)" stroke="rgba(201,168,76,0.5)" strokeWidth="1"/>
                    <text x="28" y="382" fontFamily="serif" fontSize="9" fill="rgba(201,168,76,0.8)" letterSpacing="1">ATK</text>
                    <text x="122" y="382" textAnchor="end" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)">{atk}</text>
                    <rect x="150" y="365" width="116" height="26" rx="4" fill="rgba(10,10,20,0.45)" stroke="rgba(201,168,76,0.5)" strokeWidth="1"/>
                    <text x="164" y="382" fontFamily="serif" fontSize="9" fill="rgba(201,168,76,0.8)" letterSpacing="1">DEF</text>
                    <text x="258" y="382" textAnchor="end" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)">{def}</text>
                  </>
                )}

                {/* Sorts et pièges — juste le type en bas */}
                {!isMonster && (
                  <text x="140" y="385" textAnchor="middle" fontFamily="serif" fontSize="10" fill="rgba(201,168,76,0.6)" letterSpacing="2" filter="url(#textShadow)">
                    {cardType === 'spell' ? '✦ CARTE SORT ✦' : '✦ CARTE PIÈGE ✦'}
                  </text>
                )}
              </svg>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
