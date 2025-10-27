import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

// AgenticBubble 컴포넌트를 직접 구현하여 opacity 제어 가능하도록 수정
const AgenticBubble = ({ opacity = 1.0 }) => {
  const { camera, viewport } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])
  
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      opacity: { value: opacity }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float time;
      uniform float opacity;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      
      float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y);}      
      float n2(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); float a=hash(i); float b=hash(i+vec2(1.0,0.0)); float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0)); vec2 u=f*f*(3.0-2.0*f); return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);}      
      float noise(vec2 p) { return sin(p.x) * cos(p.y) + sin(p.x*2.0)*cos(p.y*2.0)*0.5; }
      
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        
        vec3 N = normalize(vNormal);
        vec3 V = vec3(0.0, 0.0, 1.0);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.2);
        
        vec3 color = vec3(1.0, 0.7, 0.9);  // 핑크 컬러
        
        float glow = exp(-r * 2.0) * 0.6;
        color += vec3(1.0, 0.8, 0.9) * glow;
        
        color = pow(color, vec3(0.85));
        color += vec3(0.1) * fresnel;
        
        float alpha = smoothstep(0.5, 0.2, r);
        alpha *= 0.9;
        alpha = clamp(alpha, 0.0, 0.95);
        
        // 전체 불투명도 적용
        alpha *= opacity;
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
  }), [])

  const meshRef = useRef()
  const radius = Math.min(v.width, v.height) * 0.33

  useFrame((state) => {
    material.uniforms.time.value = state.clock.getElapsedTime()
    material.uniforms.opacity.value = opacity
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export default function ShaderBubble4() {
  const { viewport, camera } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])
  const [blobOpacity, setBlobOpacity] = useState(1)
  const [planeOpacity, setPlaneOpacity] = useState(0)

  // 그라디언트 플레인 머티리얼
  const gradientMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      opacity: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float opacity;
      varying vec2 vUv;

      void main() {
        vec3 topColor = vec3(1.0, 0.7, 0.9);
        vec3 bottomColor = vec3(0.95, 0.6, 0.8);
        vec3 color = mix(bottomColor, topColor, vUv.y);
        gl_FragColor = vec4(color, opacity);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
  }), [])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    const cycleTime = 15  // 전체 사이클 시간 (15초)
    const t = (time % cycleTime) / cycleTime  // 0 ~ 1

    if (t < 1/3) {
      // 0-5초: 블롭만 표시
      setBlobOpacity(1)
      setPlaneOpacity(0)
    } else if (t < 2/3) {
      // 5-10초: 블롭 사라지고 그라디언트 나타남
      const phase = (t - 1/3) * 3  // 0 ~ 1
      setBlobOpacity(1 - phase)
      setPlaneOpacity(phase)
    } else {
      // 10-15초: 그라디언트 사라지고 블롭 나타남
      const phase = (t - 2/3) * 3  // 0 ~ 1
      setBlobOpacity(phase)
      setPlaneOpacity(1 - phase)
    }

    gradientMaterial.uniforms.opacity.value = planeOpacity
  })

  return (
    <group position={[0, 0, 1]} renderOrder={1000}>
      {/* 그라디언트 플레인 (뒤에 배치) */}
      <mesh position={[0, 0, -0.1]} renderOrder={999}>
        <planeGeometry args={[v.width, v.height]} />
        <primitive object={gradientMaterial} attach="material" />
      </mesh>

      {/* 블롭 */}
      <AgenticBubble opacity={blobOpacity} />
    </group>
  )
}