'use client'

import { useEffect, useRef } from 'react'

export default function Card3D() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script1 = document.createElement('script')
    script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    script1.onload = () => initScene()
    document.head.appendChild(script1)

    function initScene() {
      const THREE = (window as any).THREE
      const mount = mountRef.current
      if (!mount) return

      const width = mount.clientWidth
      const height = mount.clientHeight

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      mount.appendChild(renderer.domElement)

      // Scene
      const scene = new THREE.Scene()

      // Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
      camera.position.z = 3.5

      // Lumières
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)

      const pointLight1 = new THREE.PointLight(0xc9a84c, 2, 10)
      pointLight1.position.set(3, 3, 3)
      scene.add(pointLight1)

      const pointLight2 = new THREE.PointLight(0x9b4cc9, 1.5, 10)
      pointLight2.position.set(-3, -2, 2)
      scene.add(pointLight2)

      // Texture
      const loader = new THREE.TextureLoader()
      loader.crossOrigin = 'anonymous'
      loader.load(
        'https://res.cloudinary.com/daowtjque/image/upload/v1773541131/Strelitzia_V2_upflzl.png',
        (texture: any) => {
          // Carte — ratio standard 280x400
          const geometry = new THREE.PlaneGeometry(2, 2.85)

          // Matériau face avant
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.FrontSide,
            metalness: 0.3,
            roughness: 0.4,
          })

          // Matériau face arrière — fond sombre doré
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

          // Bord doré
          const edgeGeometry = new THREE.PlaneGeometry(2.05, 2.9)
          const edgeMaterial = new THREE.MeshStandardMaterial({
            color: 0xc9a84c,
            metalness: 0.9,
            roughness: 0.1,
            side: THREE.DoubleSide,
          })
          const edge = new THREE.Mesh(edgeGeometry, edgeMaterial)
          edge.position.z = -0.002
          scene.add(edge)

          // Particules dorées autour
          const particleGeometry = new THREE.BufferGeometry()
          const particleCount = 80
          const positions = new Float32Array(particleCount * 3)
          for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 6
            positions[i * 3 + 1] = (Math.random() - 0.5) * 8
            positions[i * 3 + 2] = (Math.random() - 0.5) * 3
          }
          particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
          const particleMaterial = new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.03, transparent: true, opacity: 0.6 })
          const particles = new THREE.Points(particleGeometry, particleMaterial)
          scene.add(particles)

          // Animation
          let autoRotate = true
          let mouseX = 0
          let mouseY = 0
          let targetX = 0
          let targetY = 0

          mount.addEventListener('mousemove', (e: MouseEvent) => {
            autoRotate = false
            const rect = mount.getBoundingClientRect()
            mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
            mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2
          })

          mount.addEventListener('mouseleave', () => {
            autoRotate = true
          })

          let autoAngle = 0

          function animate() {
            requestAnimationFrame(animate)

            if (autoRotate) {
              autoAngle += 0.008
              cardFront.rotation.y = Math.sin(autoAngle) * Math.PI
              cardBack.rotation.y = Math.sin(autoAngle) * Math.PI
              edge.rotation.y = Math.sin(autoAngle) * Math.PI
              cardFront.rotation.x = Math.sin(autoAngle * 0.5) * 0.15
              cardBack.rotation.x = Math.sin(autoAngle * 0.5) * 0.15
              edge.rotation.x = Math.sin(autoAngle * 0.5) * 0.15
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

            // Effet holographique — shimmer
            const time = Date.now() * 0.001
            pointLight1.position.x = Math.sin(time) * 3
            pointLight1.position.y = Math.cos(time * 0.7) * 3
            pointLight2.position.x = Math.cos(time * 0.8) * 3
            pointLight2.position.y = Math.sin(time * 1.2) * 2

            particles.rotation.y += 0.001
            particles.rotation.x += 0.0005

            renderer.render(scene, camera)
          }

          animate()
        }
      )

      // Resize
      window.addEventListener('resize', () => {
        const w = mount.clientWidth
        const h = mount.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      })
    }

    return () => {
      if (mountRef.current) {
        mountRef.current.innerHTML = ''
      }
    }
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
      `}</style>

      <div style={{ fontFamily: 'Cinzel, serif', color: '#c9a84c', fontSize: '0.8rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '16px', opacity: 0.6 }}>
        Nexus Chronicles — Aperçu 3D
      </div>

      <div
        ref={mountRef}
        style={{ width: '100%', maxWidth: '600px', height: '500px', cursor: 'grab' }}
      />

      <div style={{ marginTop: '16px', fontSize: '0.72rem', color: 'rgba(201,168,76,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        Survole la carte pour l'incliner
      </div>

      <a href="/" style={{ marginTop: '24px', fontSize: '0.8rem', color: 'rgba(201,168,76,0.5)', textDecoration: 'none' }}>← Retour au menu</a>
    </main>
  )
}
