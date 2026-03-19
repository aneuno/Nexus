'use client'

import { useState } from 'react'

export default function CardMaker() {
  const [name, setName] = useState('Nom de la carte')
  const [atk, setAtk] = useState('0')
  const [def, setDef] = useState('0')
  const [level, setLevel] = useState('4')
  const [rarity, setRarity] = useState('common')
  const [effectDisplay, setEffectDisplay] = useState('Effet affiché sur la carte...')
  const [effectDetail, setEffectDetail] = useState('Description détaillée de l\'effet pour le gameplay. Expliquez ici les mécaniques précises, les conditions d\'activation, les effets en chaîne, etc.')
  const [imageUrl, setImageUrl] = useState('')
  const [cardType, setCardType] = useState('monster')
  const [template, setTemplate] = useState('standard')

  async function downloadPNG() {
    const svg = document.getElementById('card-svg') as unknown as SVGSVGElement
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 560
    canvas.height = 800
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 560, 800)
      const a = document.createElement('a')
      a.download = `${name}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  function downloadJSON() {
    const data = {
      name,
      card_type: cardType,
      level: parseInt(level),
      atk: parseInt(atk),
      def: parseInt(def),
      rarity,
      effect: effectDisplay,
      description: effectDetail,
      image_url: imageUrl,
      template
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name}.json`
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

  const rarityColor = {
    common: '#aaa', rare: '#4c99c9', epic: '#9b4cc9', legendary: '#c9a84c'
  }[rarity] as string

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
        .section-title {
          font-size: 0.65rem; color: rgba(201,168,76,0.35); letter-spacing: 0.15em;
          text-transform: uppercase; margin: 14px 0 10px; padding-bottom: 6px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
        }
      `}</style>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <a href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>← Retour</a>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1.2rem', letterSpacing: '0.1em' }}>Card Maker</h1>
        </div>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* FORMULAIRE */}
          <div style={{ flex: 1, minWidth: '280px', background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '20px' }}>

            <div className="section-title">Visuel</div>

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

            <label>Rareté</label>
            <select value={rarity} onChange={e => setRarity(e.target.value)} className="input-field">
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>

            <label>Nom de la carte</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Goku Ultra Instinct" />

            <label>URL illustration (Cloudinary)</label>
            <input className="input-field" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." />

            {isMonster && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label>Niveau</label>
                  <input className="input-field" value={level} onChange={e => setLevel(e.target.value)} placeholder="4" type="number" min="1" max="12" />
                </div>
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

            <div className="section-title">Effets</div>

            <label>Effet affiché sur la carte</label>
            <div style={{ fontSize: '0.68rem', color: 'rgba(232,224,204,0.3)', marginBottom: '6px' }}>Texte court visible directement sur la carte (max ~240 caractères)</div>
            <textarea
              className="input-field"
              value={effectDisplay}
              onChange={e => setEffectDisplay(e.target.value)}
              rows={3}
              placeholder="Ex: Inflige 500 dégâts à l'adversaire..."
              style={{ resize: 'vertical' }}
            />
            <div style={{ fontSize: '0.65rem', color: effectDisplay.length > 240 ? '#e84c4c' : 'rgba(201,168,76,0.3)', marginTop: '-8px', marginBottom: '10px', textAlign: 'right' }}>
              {effectDisplay.length}/240
            </div>

            <label>Effet détaillé (gameplay)</label>
            <div style={{ fontSize: '0.68rem', color: 'rgba(232,224,204,0.3)', marginBottom: '6px' }}>Description complète des mécaniques — visible en cliquant sur la carte en jeu</div>
            <textarea
              className="input-field"
              value={effectDetail}
              onChange={e => setEffectDetail(e.target.value)}
              rows={5}
              placeholder="Ex: Une fois par tour, durant votre Main Phase : vous pouvez cibler 1 monstre que contrôle votre adversaire ; détruisez-le. Si cette carte détruit un monstre au combat et l'envoie au Cimetière : vous pouvez piocher 1 carte."
              style={{ resize: 'vertical' }}
            />

            <div className="section-title">Export</div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={downloadPNG}
                style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}
              >
                🖼 PNG
              </button>
              <button
                onClick={downloadJSON}
                style={{ flex: 1, padding: '11px', background: 'rgba(76,153,201,0.1)', color: '#4c99c9', border: '1px solid rgba(76,153,201,0.4)', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Cinzel, serif', letterSpacing: '0.08em' }}
              >
                {'{ }'} JSON
              </button>
            </div>

            {rarity !== 'common' && (
              <div style={{ marginTop: '10px', padding: '8px 12px', background: `rgba(${rarity === 'rare' ? '76,153,201' : rarity === 'epic' ? '155,76,201' : '201,168,76'},0.08)`, border: `1px solid ${rarityColor}40`, borderRadius: '4px', fontSize: '0.68rem', color: rarityColor }}>
                ✦ {rarity.charAt(0).toUpperCase() + rarity.slice(1)} — cette rareté sera incluse dans le JSON
              </div>
            )}
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
                  <tspan x="22" y="294">{effectDisplay.substring(0, 48)}</tspan>
                  <tspan x="22" dy="11">{effectDisplay.substring(48, 96)}</tspan>
                  <tspan x="22" dy="11">{effectDisplay.substring(96, 144)}</tspan>
                  <tspan x="22" dy="11">{effectDisplay.substring(144, 192)}</tspan>
                  <tspan x="22" dy="11">{effectDisplay.substring(192, 240)}</tspan>
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
                <rect width="280" height="400" rx="12" fill="url(#bgGrad)"/>
                {imageUrl && (
                  <image href={imageUrl} x="2" y="2" width="276" height="396" clipPath="url(#fullArtClip)" preserveAspectRatio="xMidYMid slice"/>
                )}
                {isMonster && (
                  <rect x="2" y="300" width="276" height="98" rx="0" fill="url(#fadeBottom)"/>
                )}
                <rect x="2" y="2" width="276" height="396" rx="11" fill="none" stroke="url(#borderGrad)" strokeWidth="3" filter="url(#glow)"/>
                <rect x="8" y="8" width="264" height="384" rx="8" fill="none" stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>
                {corners}
                <rect x="14" y="14" width="252" height="32" rx="5" fill="rgba(10,10,20,0.45)" stroke="rgba(201,168,76,0.5)" strokeWidth="1"/>
                <text x="140" y="35" textAnchor="middle" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)" letterSpacing="1">
                  {name.length > 22 ? name.substring(0, 22) + '...' : name}
                </text>
                <rect x="14" y="50" width="60" height="16" rx="3" fill="rgba(10,10,20,0.45)" stroke={typeColor} strokeWidth="0.8" strokeOpacity="0.7"/>
                <text x="44" y="61" textAnchor="middle" fontFamily="sans-serif" fontSize="8" letterSpacing="0.5" fill={typeColor} filter="url(#textShadow)">{typeLabel}</text>
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
                {!isMonster && (
                  <text x="140" y="385" textAnchor="middle" fontFamily="serif" fontSize="10" fill="rgba(201,168,76,0.6)" letterSpacing="2" filter="url(#textShadow)">
                    {cardType === 'spell' ? '✦ CARTE SORT ✦' : '✦ CARTE PIÈGE ✦'}
                  </text>
                )}
              </svg>
            )}

            {/* APERÇU EFFET DÉTAILLÉ */}
            <div style={{ width: '280px', background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '0.62rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Effet détaillé (popup en jeu)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(232,224,204,0.7)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {effectDetail || <span style={{ color: 'rgba(201,168,76,0.2)', fontStyle: 'italic' }}>Aucun effet détaillé...</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
