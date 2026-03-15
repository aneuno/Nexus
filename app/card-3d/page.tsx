'use client'

import { useEffect, useRef, useState } from 'react'

export default function Card3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<any>({})

  const [lightIntensity, setLightIntensity] = useState(2)
  const [lightColor1, setLightColor1] = useState('#c9a84c')
  const [lightColor2, setLightColor2] = useState('#9b4cc9')
  const [effect, setEffect] = useState('none')
  const [bgColor, setBgColor] = useState('#0a0a14')
  const [particleColor, setParticleColor] = useState('#c9a84c')
  const [imageUrl, setImageUrl] = useState('https://res.cloudinary.com/daowtjque/image/upload/v1773541131/Strelitzia_V2_upflzl.png')
  const [inputUrl, setInputUrl] = useState('https://res.cloudinary.com/daowtjque/image/upload/v1773541131/Strelitzia_V2_upflzl.png')

  function hexToInt(hex: string) {
    return parseInt(hex.replace('#', ''), 16)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    mount.innerHTML = ''

    const script1 = document.createElement('script')
    script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script1.onload = () => initScene()
    document.head.appendChild(script1)

    function initScene() {
      const THREE = (window as any).THREE
      if (!mount) return

      const width = mount.clientWidth
      const height = mount.clientHeight

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      mount.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
      camera.position.z = 3.5

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)

      const pointLight1 = new THREE.PointLight(hexToInt(lightColor1), lightIntensity, 10)
      pointLight1.position.set(3, 3, 3)
      scene.add(pointLight1)

      const pointLight2 = new THREE.PointLight(hexToInt(lightColor2), lightIntensity * 0.75, 10)
      pointLight2.position.set(-3, -2, 2)
      scene.add(pointLight2)

      sceneRef.current.pointLight1 = pointLight1
      sceneRef.current.pointLight2 = pointLight2
      sceneRef.current.scene = scene
      sceneRef.current.renderer = renderer

      const loader = new THREE.TextureLoader()
      loader.crossOrigin = 'anonymous'
      loader.load(imageUrl, (texture: any) => {
        const geometry = new THREE.PlaneGeometry(2, 2.85)

        const material = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.FrontSide,
          metalness: 0.3,
          roughness: 0.4,
        })

        const backMaterial = new THREE.MeshStandardMaterial({
          color: 0x0a0a14,
          side: THREE.BackSide,
          metalness: 0.5,
          roughness: 0.3,
        })

        const cardFront = new THREE.Mesh(geometry, material)
        const cardBack = new THREE.Mesh(geometry, backMaterial)
        scene.add(cardFront)
        scene.add(cardBack)

        const edgeGeometry = new THREE.PlaneGeometry(2.05, 2.9)
        const edgeMaterial = new THREE.MeshStandardMaterial({
          color: hexToInt(lightColor1),
          metalness: 0.9,
          roughness: 0.1,
          side: THREE.DoubleSide,
        })
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial)
        edge.position.z = -0.002
        scene.add(edge)

        // Particules
        const particleGeometry = new THREE.BufferGeometry()
        const particleCount = 100
        const positions = new Float32Array(particleCount * 3)
        for (let i = 0; i < particleCount; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 6
          positions[i * 3 + 1] = (Math.random() - 0.5) * 8
          positions[i * 3 + 2] = (Math.random() - 0.5) * 3
        }
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        const particleMaterial = new THREE.PointsMaterial({
          color: hexToInt(particleColor),
          size: 0.035,
          transparent: true,
          opacity: 0.7
        })
        const particles = new THREE.Points(particleGeometry, particleMaterial)
        scene.add(particles)

        sceneRef.current.cardFront = cardFront
        sceneRef.current.cardBack = cardBack
        sceneRef.current.edge = edge
        sceneRef.current.particles = particles
        sceneRef.current.material = material

        let autoRotate = true
        let mouseX = 0
        let mouseY = 0
        let targetX = 0
        let targetY = 0
        let autoAngle = 0
        let hue = 0

        mount.addEventListener('mousemove', (e: MouseEvent) => {
          autoRotate = false
          const rect = mount.getBoundingClientRect()
          mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
          mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2
        })
        mount.addEventListener('mouseleave', () => { autoRotate = true })

        function animate() {
          requestAnimationFrame(animate)
          const time = Date.now() * 0.001

          if (autoRotate) {
            autoAngle += 0.008
            const ry = Math.sin(autoAngle) * Math.PI
            const rx = Math.sin(autoAngle * 0.5) * 0.15
            cardFront.rotation.y = ry
            cardBack.rotation.y = ry
            edge.rotation.y = ry
            cardFront.rotation.x = rx
            cardBack.rotation.x = rx
            edge.rotation.x = rx
          } else {
            targetX += (mouseX * 0.8 - targetX) * 0.05
            targetY += (mouseY * 0.5 - targetY) * 0.05
            cardFront.rotation.y = targetX
            cardBack.rotation.y = targetX
            edge.rotation.y = targetX
            cardFront.rotation.x = -targetY
            cardBack.rotation.x = -targetY
            edge.rotation.x = -targetY
          }

          // Effets
          const eff = sceneRef.current.currentEffect || 'none'

          if (eff === 'rainbow') {
            hue = (hue + 1) % 360
            const color = new THREE.Color(`hsl(${hue}, 100%, 60%)`)
            pointLight1.color.set(color)
            pointLight2.color.set(new THREE.Color(`hsl(${(hue + 180) % 360}, 100%, 60%)`))
            edgeMaterial.color.set(color)
          } else if (eff === 'fire') {
            const fireHue = 10 + Math.sin(time * 3) * 20
            pointLight1.color.set(new THREE.Color(`hsl(${fireHue}, 100%, 55%)`))
            pointLight2.color.set(new THREE.Color(`hsl(${fireHue + 30}, 100%, 40%)`))
            edgeMaterial.color.set(new THREE.Color(`hsl(${fireHue}, 100%, 50%)`))
            particleMaterial.color.set(new THREE.Color(`hsl(${fireHue}, 100%, 55%)`))
          } else if (eff === 'ice') {
            const iceVal = 190 + Math.sin(time * 2) * 20
            pointLight1.color.set(new THREE.Color(`hsl(${iceVal}, 80%, 70%)`))
            pointLight2.color.set(new THREE.Color(`hsl(${iceVal + 20}, 60%, 80%)`))
            edgeMaterial.color.set(new THREE.Color(`hsl(${iceVal}, 80%, 75%)`))
          } else if (eff === 'shadow') {
            pointLight1.color.set(new THREE.Color('#8800ff'))
            pointLight2.color.set(new THREE.Color('#220044'))
            edgeMaterial.color.set(new THREE.Color('#6600cc'))
          } else if (eff === 'gold') {
            const goldVal = 40 + Math.sin(time * 2) * 10
            pointLight1.color.set(new THREE.Color(`hsl(${goldVal}, 100%, 60%)`))
            pointLight2.color.set(new THREE.Color(`hsl(${goldVal - 10}, 80%, 40%)`))
            edgeMaterial.color.set(new THREE.Color(`hsl(${goldVal}, 100%, 55%)`))
          } else {
            pointLight1.color.set(new THREE.Color(hexToInt(sceneRef.current.lc1 || lightColor1)))
            pointLight2.color.set(new THREE.Color(hexToInt(sceneRef.current.lc2 || lightColor2)))
          }

          pointLight1.position.x = Math.sin(time) * 3
          pointLight1.position.y = Math.cos(time * 0.7) * 3
          pointLight2.position.x = Math.cos(time * 0.8) * 3
          pointLight2.position.y = Math.sin(time * 1.2) * 2

          particles.rotation.y += 0.001
          particles.rotation.x += 0.0005

          renderer.render(scene, camera)
        }

        animate()
      })

      window.addEventListener('resize', () => {
        const w = mount.clientWidth
        const h = mount.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      })
    }

    return () => {
      if (mountRef.current) mountRef.current.innerHTML = ''
    }
  }, [imageUrl])

  // Sync refs pour l'animation
  useEffect(() => { sceneRef.current.currentEffect = effect }, [effect])
  useEffect(() => { sceneRef.current.lc1 = lightColor1 }, [lightColor1])
  useEffect(() => { sceneRef.current.lc2 = lightColor2 }, [lightColor2])
  useEffect(() => {
    if (sceneRef.current.pointLight1) sceneRef.current.pointLight1.intensity = lightIntensity
    if (sceneRef.current.pointLight2) sceneRef.current.pointLight2.intensity = lightIntensity * 0.75
  }, [lightIntensity])

  const effects = [
    { id: 'none', label: '✦ Défaut', color: '#c9a84c' },
    { id: 'rainbow', label: '🌈 Rainbow', color: '#ff88ff' },
    { id: 'fire', label: '🔥 Feu', color: '#ff6622' },
    { id: 'ice', label: '❄️ Glace', color: '#88ddff' },
    { id: 'shadow', label: '🌑 Ombre', color: '#8800ff' },
    { id: 'gold', label: '⭐ Or', color: '#ffcc00' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: bgColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', transition: 'background 0.5s' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Rajdhani:wght@400;500;600&display=swap');
        .opt-btn {
          padding: 7px 14px; border-radius: 4px; cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 0.78rem; letter-spacing: 0.08em;
          border: 1px solid rgba(201,168,76,0.2); background: transparent;
          color: rgba(232,224,204,0.5); transition: all 0.2s;
        }
        .opt-btn:hover { border-color: rgba(201,168,76,0.5); color: #e8e0cc; }
        .opt-btn.active { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.6); color: #c9a84c; }
        .slider { width: 100%; accent-color: #c9a84c; cursor: pointer; }
        .panel-label { font-size: 0.68rem; color: rgba(201,168,76,0.5); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; }
        .color-input { width: 36px; height: 28px; border: 1px solid rgba(201,168,76,0.3); border-radius: 4px; cursor: pointer; background: none; padding: 2px; }
      `}</style>

      <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.8rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '16px', opacity: 0.6 }}>
        Nexus Chronicles — Visualiseur 3D
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '1000px' }}>

        {/* Panneau gauche */}
        <div style={{ background: 'rgba(15,15,30,0.9)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '16px', width: '200px', flexShrink: 0 }}>

          <div className="panel-label">Effet</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {effects.map(e => (
              <button key={e.id} className={`opt-btn ${effect === e.id ? 'active' : ''}`}
                style={{ textAlign: 'left', borderColor: effect === e.id ? e.color + '99' : undefined, color: effect === e.id ? e.color : undefined }}
                onClick={() => setEffect(e.id)}>
                {e.label}
              </button>
            ))}
          </div>

          <div className="panel-label">Intensité lumière</div>
          <input type="range" className="slider" min="0.5" max="5" step="0.1" value={lightIntensity}
            onChange={e => setLightIntensity(parseFloat(e.target.value))}
            style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.4)', marginBottom: '16px', textAlign: 'center' }}>{lightIntensity.toFixed(1)}</div>

          <div className="panel-label">Couleur lumière 1</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <input type="color" className="color-input" value={lightColor1} onChange={e => setLightColor1(e.target.value)} />
            <span style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.4)' }}>{lightColor1}</span>
          </div>

          <div className="panel-label">Couleur lumière 2</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <input type="color" className="color-input" value={lightColor2} onChange={e => setLightColor2(e.target.value)} />
            <span style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.4)' }}>{lightColor2}</span>
          </div>

          <div className="panel-label">Couleur particules</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <input type="color" className="color-input" value={particleColor} onChange={e => setParticleColor(e.target.value)} />
            <span style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.4)' }}>{particleColor}</span>
          </div>

          <div className="panel-label">Fond</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['#0a0a14', '#000000', '#0d0005', '#000d05', '#0d0d00'].map(c => (
              <div key={c} onClick={() => setBgColor(c)} style={{ width: '24px', height: '24px', borderRadius: '4px', background: c, border: bgColor === c ? '2px solid #c9a84c' : '1px solid rgba(201,168,76,0.3)', cursor: 'pointer' }} />
            ))}
          </div>
        </div>

        {/* Carte 3D */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div ref={mountRef} style={{ width: '500px', height: '480px', cursor: 'grab', borderRadius: '8px' }} />
          <div style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Survole pour incliner · Auto-rotation si inactif
          </div>
        </div>

        {/* Panneau droit */}
        <div style={{ background: 'rgba(15,15,30,0.9)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '16px', width: '200px', flexShrink: 0 }}>

          <div className="panel-label">Image (URL)</div>
          <input
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            placeholder="URL Cloudinary..."
            style={{ width: '100%', padding: '7px 10px', background: '#141428', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', color: '#e8e0cc', fontSize: '0.72rem', marginBottom: '8px', boxSizing: 'border-box' }}
          />
          <button onClick={() => setImageUrl(inputUrl)}
            style={{ width: '100%', padding: '8px', background: 'linear-gradient(135deg, #8a6a1e, #c9a84c)', color: '#0a0a14', border: 'none', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', marginBottom: '16px', fontFamily: 'Cinzel, serif' }}>
            Charger
          </button>

          <div className="panel-label">Presets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: '🌟 Légendaire', e: 'gold', l1: '#ffcc00', l2: '#ff8800', p: '#ffcc00' },
              { label: '💜 Épique', e: 'shadow', l1: '#9b4cc9', l2: '#4c1c99', p: '#9b4cc9' },
              { label: '🔵 Rare', e: 'ice', l1: '#4c99c9', l2: '#1c4c99', p: '#4c99c9' },
              { label: '🔥 Feu', e: 'fire', l1: '#ff6622', l2: '#ff2200', p: '#ff6622' },
              { label: '🌈 Arc-en-ciel', e: 'rainbow', l1: '#ff0000', l2: '#0000ff', p: '#00ff00' },
            ].map(p => (
              <button key={p.label} className="opt-btn" onClick={() => { setEffect(p.e); setLightColor1(p.l1); setLightColor2(p.l2); setParticleColor(p.p) }}>
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '24px' }}>
            <a href="/card-maker" style={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(201,168,76,0.4)', textDecoration: 'none', marginBottom: '8px' }}>→ Card Maker</a>
            <a href="/" style={{ display: 'block', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(201,168,76,0.4)', textDecoration: 'none' }}>← Menu</a>
          </div>
        </div>
      </div>
    </main>
  )
}
