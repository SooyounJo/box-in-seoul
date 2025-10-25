import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble5() {
  const { viewport, camera } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        
        // 프레넬 효과
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0) * 0.3;
        
        // 핑크 컬러 베이스
        vec3 color = vec3(0.95, 0.4, 0.65);     // 중앙 핑크
        
        // 글로우 효과
        float glow = exp(-r * 2.5) * 0.8;
        color += vec3(0.9, 0.8, 0.9) * glow;
        
        // 컬러 조정
        color = pow(color, vec3(0.85));
        
        // 알파값 계산
        float alpha = smoothstep(0.5, 0.2, r);
        alpha *= 0.85;
        
        // 외곽 블러 효과
        float blur = smoothstep(0.5, 0.2, r);
        color = mix(color, color * 0.9, 1.0 - blur);
        
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
  
  useFrame(() => {
    if (meshRef.current) {
      material.uniforms.time.value += 0.01
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 1]}
      renderOrder={1000}
    >
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}