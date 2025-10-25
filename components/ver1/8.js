import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble8() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
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
        vec2 center = vUv - 0.5;
        float dist = length(center);
        
        // 프레넬 효과 감소
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0) * 0.3;
        
        // 컬러 그라데이션 정의 (채도 낮춤)
        vec3 pink = vec3(0.95, 0.4, 0.65);     // 중앙 핑크 (채도 낮춤)
        vec3 yellow = vec3(0.95, 0.85, 0.65);  // 중간 옐로우 (채도 낮춤)
        vec3 purple = vec3(0.85, 0.75, 0.95);  // 외곽 퍼플 (채도 낮춤)
        
        // 거리에 따른 컬러 블렌딩 (부드럽게)
        vec3 color;
        if (dist < 0.25) {
          // 중앙: 핑크 → 옐로우
          color = mix(pink, yellow, smoothstep(0.0, 0.25, dist));
        } else {
          // 외곽: 옐로우 → 퍼플
          color = mix(yellow, purple, smoothstep(0.25, 0.5, dist));
        }
        
        // 프레넬 효과 감소
        color += vec3(0.1) * fresnel;
        
        // 글로우 효과 조정
        float glow = exp(-dist * 2.5) * 0.8;
        color += vec3(0.9, 0.8, 0.9) * glow;
        
        // 콘트라스트 조정
        color = pow(color, vec3(0.85)); // 감마 조정으로 중간톤 보존
        
        // 부드러운 알파값 계산 (투명도 증가)
        float alpha = smoothstep(0.5, 0.2, dist);
        alpha *= 0.85; // 전체적인 투명도 증가
        
        // 외곽 블러 효과
        float blur = smoothstep(0.5, 0.2, dist);
        color = mix(color, color * 0.9, 1.0 - blur);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending, // AdditiveBlending에서 NormalBlending으로 변경
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [])

  const meshRef = useRef()
  const { camera, viewport } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])
  const radius = Math.min(v.width, v.height) * 0.33
  const yBottom = 0

  return (
    <mesh ref={meshRef} position={[0, yBottom, 0]}>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}