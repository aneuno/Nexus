'use client'

import { useState } from 'react'

export default function CardMaker() {
  const [name, setName] = useState('Nom de la carte')
  const [atk, setAtk] = useState('0')
  const [def, setDef] = useState('0')
  const [effect, setEffect] = useState('Effet de la carte...')
  const [imageUrl, setImageUrl] = useState('')
  const [cardType, setCardType] = useState('monster')

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

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e0cc', fontFamily: 'sans-serif', padding: '20px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap');
        .input-field {
          width: 100%;
          padding: 8px 12px;
          background: #141428;
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 4px;
          color: #e8e0cc;
          font-size: 0.88rem;
          box-sizing: border-box;
          margin-bottom: 10px;
        }
        .input-field:focus { outline: none; border-color: rgba(201,168,76,0.7); }
        label { display: block; font-size: 0.72rem; color: rgba(201,168,76,0.6); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <a href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>← Retour</a>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '1.2rem', letterSpacing: '0.1em' }}>Card Maker</h1>
        </div>

        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* FORMULAIRE */}
          <div style={{ flex: 1, minWidth: '260px', background: '#0f0f1e', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '20px' }}>

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

            <label>URL de l'illustration (Cloudinary)</label>
            <input className="input-field" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." />

            <label>Effet / Description</label>
            <textarea className="input-field" value={effect} onChange={e => setEffect(e.target.value)} rows={4} placeholder="Description ou effet de la carte..." style={{ resize: 'vertical' }} />

            {cardType === 'monster' || cardType === 'fusion' || cardType === 'ritual' ? (
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
            ) : null}

            <button onClick={downloadSVG} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginTop: '8px', fontFamily: 'Cinzel, serif', letterSpacing: '0.1em' }}>
              Télécharger SVG
            </button>
          </div>

          {/* PREVIEW CARTE */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aperçu</div>

            <svg id="card-svg" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 280 400" width="280" height="400">
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
                <radialGradient id="glowCenter" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.08" />
                  <stop offset="60%" stopColor="#9b4cc9" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#0a0a14" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="cornerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <clipPath id="artClip">
                  <rect x="18" y="52" width="244" height="210" rx="4"/>
                </clipPath>

                {/* Badge type */}
                {cardType === 'spell' && (
                  <linearGradient id="typeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1a3a1a" stopOpacity="1" />
                    <stop offset="100%" stopColor="#0a1a0a" stopOpacity="1" />
                  </linearGradient>
                )}
                {cardType === 'trap' && (
                  <linearGradient id="typeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3a1a2a" stopOpacity="1" />
                    <stop offset="100%" stopColor="#1a0a1a" stopOpacity="1" />
                  </linearGradient>
                )}
                {cardType === 'fusion' && (
                  <linearGradient id="typeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2a1a3a" stopOpacity="1" />
                    <stop offset="100%" stopColor="#1a0a2a" stopOpacity="1" />
                  </linearGradient>
                )}
              </defs>

              {/* Fond */}
              <rect width="280" height="400" rx="12" fill="url(#bgGrad)"/>
              <rect width="280" height="400" rx="12" fill="url(#glowCenter)"/>

              {/* Bordures */}
              <rect x="2" y="2" width="276" height="396" rx="11" fill="none" stroke="url(#borderGrad)" strokeWidth="3" filter="url(#glow)"/>
              <rect x="8" y="8" width="264" height="384" rx="8" fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>

              {/* Coins */}
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

              {/* Nom */}
              <rect x="14" y="14" width="252" height="32" rx="5" fill="url(#headerGrad)" stroke="rgba(201,168,76,0.4)" strokeWidth="1"/>
              <text x="140" y="35" textAnchor="middle" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)" letterSpacing="1">
                {name.length > 22 ? name.substring(0, 22) + '...' : name}
              </text>

              {/* Badge type */}
              <rect x="14" y="50" width="60" height="16" rx="3"
                fill={cardType === 'spell' ? 'rgba(76,201,76,0.2)' : cardType === 'trap' ? 'rgba(201,76,168,0.2)' : cardType === 'fusion' ? 'rgba(155,76,201,0.2)' : cardType === 'ritual' ? 'rgba(76,168,201,0.2)' : 'rgba(201,168,76,0.15)'}
                stroke={cardType === 'spell' ? 'rgba(76,201,76,0.4)' : cardType === 'trap' ? 'rgba(201,76,168,0.4)' : cardType === 'fusion' ? 'rgba(155,76,201,0.4)' : cardType === 'ritual' ? 'rgba(76,168,201,0.4)' : 'rgba(201,168,76,0.3)'}
                strokeWidth="0.5"
              />
              <text x="44" y="61" textAnchor="middle" fontFamily="sans-serif" fontSize="8" letterSpacing="0.5"
                fill={cardType === 'spell' ? '#4cc94c' : cardType === 'trap' ? '#c94ca8' : cardType === 'fusion' ? '#9b4cc9' : cardType === 'ritual' ? '#4ca8c9' : '#c9a84c'}>
                {cardType === 'monster' ? 'MONSTRE' : cardType === 'spell' ? 'SORT' : cardType === 'trap' ? 'PIÈGE' : cardType === 'fusion' ? 'FUSION' : 'RITUEL'}
              </text>

              {/* Zone illustration */}
              <rect x="18" y="70" width="244" height="200" rx="4" fill="rgba(255,255,255,0.02)" stroke="rgba(201,168,76,0.2)" strokeWidth="1"/>

              {imageUrl ? (
                <image href={imageUrl} x="18" y="70" width="244" height="200" clipPath="url(#artClip)" preserveAspectRatio="xMidYMid slice"/>
              ) : (
                <>
                  <circle cx="140" cy="170" r="55" fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth="1"/>
                  <circle cx="140" cy="170" r="38" fill="none" stroke="rgba(155,76,201,0.05)" strokeWidth="1"/>
                  <circle cx="140" cy="170" r="22" fill="none" stroke="rgba(76,201,168,0.04)" strokeWidth="1"/>
                  <text x="140" y="165" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill="rgba(201,168,76,0.2)">ILLUSTRATION</text>
                  <text x="140" y="180" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fill="rgba(201,168,76,0.15)">Colle une URL Cloudinary</text>
                </>
              )}

              {/* Séparateur */}
              <line x1="18" y1="274" x2="262" y2="274" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
              <circle cx="140" cy="274" r="3" fill="#c9a84c" opacity="0.5"/>
              <circle cx="120" cy="274" r="1.5" fill="#c9a84c" opacity="0.25"/>
              <circle cx="160" cy="274" r="1.5" fill="#c9a84c" opacity="0.25"/>

              {/* Zone effet */}
              <rect x="14" y="280" width="252" height="70" rx="4" fill="rgba(201,168,76,0.02)" stroke="rgba(201,168,76,0.12)" strokeWidth="1"/>
              <foreignObject x="18" y="284" width="244" height="62">
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: '9px', color: 'rgba(232,224,204,0.7)', lineHeight: '1.5', fontFamily: 'sans-serif', overflow: 'hidden', height: '62px' }}>
                  {effect}
                </div>
              </foreignObject>

              {/* Séparateur bas */}
              <line x1="18" y1="355" x2="262" y2="355" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
              <circle cx="140" cy="355" r="3" fill="#c9a84c" opacity="0.5"/>

              {/* ATK / DEF — uniquement pour monstres */}
              {(cardType === 'monster' || cardType === 'fusion' || cardType === 'ritual') && (
                <>
                  <rect x="14" y="363" width="116" height="26" rx="4" fill="url(#statGrad)" stroke="rgba(201,168,76,0.35)" strokeWidth="1"/>
                  <text x="28" y="380" fontFamily="serif" fontSize="9" fill="rgba(201,168,76,0.6)" letterSpacing="1">ATK</text>
                  <text x="122" y="380" textAnchor="end" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)">{atk}</text>

                  <rect x="150" y="363" width="116" height="26" rx="4" fill="url(#statGrad)" stroke="rgba(201,168,76,0.35)" strokeWidth="1"/>
                  <text x="164" y="380" fontFamily="serif" fontSize="9" fill="rgba(201,168,76,0.6)" letterSpacing="1">DEF</text>
                  <text x="258" y="380" textAnchor="end" fontFamily="serif" fontSize="13" fontWeight="bold" fill="#c9a84c" filter="url(#glow)">{def}</text>
                </>
              )}

              {/* Pour sorts et pièges — icône centrée */}
              {(cardType === 'spell' || cardType === 'trap') && (
                <text x="140" y="382" textAnchor="middle" fontFamily="serif" fontSize="10" fill="rgba(201,168,76,0.4)" letterSpacing="2">
                  {cardType === 'spell' ? '✦ CARTE SORT ✦' : '✦ CARTE PIÈGE ✦'}
                </text>
              )}
            </svg>
          </div>
        </div>
      </div>
    </main>
  )
}
