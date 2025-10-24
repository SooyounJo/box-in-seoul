import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function LG1() {
  // 프리즘 효과를 위한 유리면 생성
  const Prism = ({ position, rotation, scale }) => {
    const materialRef = useRef()
    
    const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
      transmission: 0.98,  // 더 투명하게
      thickness: 0.3,     // 얇게 조정
      roughness: 0.05,    // 더 매끄럽게
      metalness: 0.1,     // 약간의 금속성 추가
      envMapIntensity: 2.5, // 환경 반사 강화
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      ior: 1.7,          // 굴절률 조정
      transparent: true,
      opacity: 0.6,      // 투명도 증가
      side: THREE.DoubleSide,
      color: new THREE.Color(0.9, 0.95, 1.0), // 약간 푸른빛
      attenuationColor: new THREE.Color(0.9, 0.95, 1.0),
      attenuationDistance: 0.3
    }), [])

    useFrame((state) => {
      if (!materialRef.current) return
      materialRef.current.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2
      materialRef.current.transmission = 0.98 + Math.sin(state.clock.elapsedTime * 0.3) * 0.02
    })

    return (
      <mesh position={position} rotation={rotation} scale={scale}>
        <boxGeometry args={[1.2, 1.2, 0.02]} /> {/* 더 얇고 넓게 */}
        <primitive object={glassMaterial} ref={materialRef} attach="material" />
      </mesh>
    )
  }

  // 빛나는 점들
  const Particles = () => {
    const particlesCount = 200 // 파티클 수 증가
    const positions = useMemo(() => {
      const pos = new Float32Array(particlesCount * 3)
      for (let i = 0; i < particlesCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 4    // 더 넓은 범위
        pos[i * 3 + 1] = (Math.random() - 0.5) * 4
        pos[i * 3 + 2] = (Math.random() - 0.5) * 2
      }
      return pos
    }, [])

    const particleMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
        size: { value: 8.0 } // 파티클 크기 조정
    },
    vertexShader: `
        uniform float time;
        uniform float size;
        varying vec3 vColor;
        
      void main() {
          vColor = vec3(0.95 + sin(time + position.x) * 0.05,
                       0.97 + sin(time + position.y) * 0.03,
                       1.0);
          vec3 pos = position;
          pos.x += sin(time * 0.3 + position.y) * 0.1;
          pos.y += cos(time * 0.3 + position.x) * 0.1;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float strength = 1.0 - (d * 2.0);
          strength = pow(strength, 3.0); // 더 강한 글로우
          gl_FragColor = vec4(vColor, strength * 0.8);
      }
    `,
    transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
  }), [])

    useFrame((state) => {
      particleMaterial.uniforms.time.value = state.clock.elapsedTime * 0.5
    })

    return (
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <primitive object={particleMaterial} attach="material" />
      </points>
    )
  }

  // 환경 맵 설정
  const { scene } = useThree()
  useMemo(() => {
    const pmremGenerator = new THREE.PMREMGenerator(new THREE.WebGLRenderer())
    pmremGenerator.compileEquirectangularShader()
    
    const envMap = pmremGenerator.fromScene(new THREE.Scene()).texture
    scene.environment = envMap
    scene.background = new THREE.Color(0x000000)
    
    return () => {
      envMap.dispose()
      pmremGenerator.dispose()
    }
  }, [scene])

  // 프리즘 배열 생성
  const prisms = useMemo(() => {
    const items = []
    const count = 10 // 프리즘 수 증가
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 1.2 // 반경 증가
      items.push({
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        ],
        rotation: [0, 0, angle + Math.PI / count], // 회전 각도 조정
        scale: [1, 1, 1]
      })
    }
    return items
  }, [])

  // 전체 장면 회전
  const groupRef = useRef()
  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.z = state.clock.elapsedTime * 0.08 // 더 천천히
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.15 // 더 부드럽게
  })

  return (
    <group ref={groupRef}>
      {prisms.map((props, i) => (
        <Prism key={i} {...props} />
      ))}
      <Particles />
      <ambientLight intensity={0.4} />
      <pointLight position={[2, 2, 2]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-2, -2, 2]} intensity={0.8} color="#4444ff" />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#ffffff" />
    </group>
  )
}