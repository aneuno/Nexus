'use client'

import { useEffect, useRef, useState } from 'react'

export default function Card3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<any>({})

  const [lightIntensity, setLightIntensity] = useState(2)
  const [lightColor1, setLightColor1] = useState('#c9a84c')
  const [lightColor2, setLightColor2] = useState('#9b4cc9')
  const [rainbow, setRainbow] = useState(false)

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
      camera.position.z = 6.5

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
      loader.load('https://res.cloudinary.com/daowtjque/image/upload/v1773541131/Strelitzia_V2_upflzl.png', (texture: any) => {
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
          color: hexToInt(lightColor1),
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
        sceneRef.current.edgeMaterial = edgeMaterial
        sceneRef.current.particleMaterial = particleMaterial

        let mouseX = 0
        let mouseY = 0
        let targetX = 0
        let targetY = 0
        let hue = 0

        window.addEventListener('mousemove', (e: MouseEvent) => {
          mouseX = ((e.clientX / window.innerWidth) - 0.5) * 2
          mouseY = -((e.clientY / window.innerHeight) - 0.5) * 2
        })

        function animate() {
          requestAnimationFrame(animate)
          const time = Date.now() * 0.001

          targetX += (mouseX * 0.8 - targetX) * 0.05
          targetY += (mouseY * 0.5 - targetY) * 0.05
          cardFront.rotation.y = targetX
          cardBack.rotation.y = targetX
          edge.rotation.y = targetX
          cardFront.rotation.x = -targetY
          cardBack.rotation.x = -targetY
          edge.rotation.x = -targetY

          if (sceneRef.current.rainbow) {
            hue = (hue + 1) % 360
            const color = new THREE.Color(`hsl(${hue}, 100%, 60%)`)
            const color2 = new THREE.Color(`hsl(${(hue + 180) % 360}, 100%, 60%)`)
            pointLight1.color.set(color)
            pointLight2.color.set(color2)
            edgeMaterial.color.set(color)
            particleMaterial.color.set(color)
          } else {
            pointLight1.color.set(new THREE.Color(hexToInt(sceneRef.current.lc1 || '#c9a84c')))
            pointLight2.color.set(new THREE.Color(hexToInt(sceneRef.current.lc2 || '#9b4cc9')))
            edgeMaterial.color.set(new THREE.Color(hexToInt(sceneRef.current.lc1 || '#c9a84c')))
            particleMaterial.color.set(new THREE.Color(hexToInt(sceneRef.current.lc1 || '#c9a84c')))
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
  }, [])

  useEffect(() => { sceneRef.current.rainbow = rainbow }, [rainbow])
  useEffect(() => { sceneRef.current.lc1 = lightColor1 }, [lightColor1])
  useEffect(() => { sceneRef.current.lc2 = lightColor2 }, [lightColor2])
  useEffect(() => {
    if (sceneRef.current.pointLight1) sceneRef.current.pointLight1.intensity = lightIntensity
    if (sceneRef.current.pointLight2) sceneRef.current.pointLight2.intensity = lightIntensity * 0.75
  }, [lightIntensity])

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Rajdhani:wght@400;500;600&display=swap');
        .slider { width: 100%; accent-color: #c9a84c; cursor: pointer; }
        .panel-label { font-size: 0.68rem; color: rgba(201,168,76,0.5); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; font-family: 'Rajdhani', sans-serif; }
        .color-input { width: 44px; height: 32px; border: 1px solid rgba(201,168,76,0.3); border-radius: 4px; cursor: pointer; background: none; padding: 2px; }
        .rainbow-btn {
          width: 100%; padding: 8px; border-radius: 4px; cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 0.78rem; letter-spacing: 0.08em;
          transition: all 0.2s; border: 1px solid rgba(201,168,76,0.2);
          background: transparent; color: rgba(232,224,204,0.5);
        }
        .rainbow-btn.active {
          background: linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff);
          color: white; border-color: transparent; font-weight: 600;
        }
        .rainbow-btn:hover:not(.active) { border-color: rgba(201,168,76,0.5); color: #e8e0cc; }
      `}</style>

      {/* Zone 3D plein écran */}
      <div ref={mountRef} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', cursor: 'default' }} />

      {/* Titre */}
      <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.8rem', letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.5, zIndex: 10, pointerEvents: 'none' }}>
        Nexus Chronicles — Visualiseur 3D
      </div>

      {/* Panneau gauche */}
      <div style={{ position: 'fixed', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(10,10,20,0.85)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '16px', width: '200px', zIndex: 10, backdropFilter: 'blur(8px)' }}>

        <div className="panel-label">Éclairage</div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.4)', marginBottom: '6px', fontFamily: 'Rajdhani, sans-serif' }}>Lumière 1</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="color" className="color-input" value={lightColor1} onChange={e => { setLightColor1(e.target.value); setRainbow(false) }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>{lightColor1}</span>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.4)', marginBottom: '6px', fontFamily: 'Rajdhani, sans-serif' }}>Lumière 2</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="color" className="color-input" value={lightColor2} onChange={e => { setLightColor2(e.target.value); setRainbow(false) }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.4)', fontFamily: 'Rajdhani, sans-serif' }}>{lightColor2}</span>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <button className={`rainbow-btn ${rainbow ? 'active' : ''}`} onClick={() => setRainbow(prev => !prev)}>
            🌈 Rainbow
          </button>
        </div>

        <div className="panel-label">Intensité</div>
        <input type="range" className="slider" min="0.5" max="5" step="0.1" value={lightIntensity} onChange={e => setLightIntensity(parseFloat(e.target.value))} style={{ marginBottom: '6px' }} />
        <div style={{ fontSize: '0.72rem', color: 'rgba(201,168,76,0.4)', marginBottom: '4px', textAlign: 'center', fontFamily: 'Rajdhani, sans-serif' }}>{lightIntensity.toFixed(1)}</div>
      </div>

      {/* Bouton menu en bas à gauche */}
      <a href="/" style={{ position: 'fixed', top: '20px', right: '20px', background: 'rgba(10,10,20,0.85)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '10px 16px', fontSize: '0.78rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.1em', zIndex: 10, backdropFilter: 'blur(8px)' }}>
        ← Menu
      </a>
    </main>
  )
}
