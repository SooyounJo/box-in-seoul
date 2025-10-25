import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble8() {
  const { viewport, camera } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])
  const radius = Math.min(v.width, v.height) * 0.33

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
        vec2 center = vUv - 0.5;
        float dist = length(center);
        
        // 프레넬 효과
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0) * 0.3;
        
        // 10번 파라미터 값 적용
        float centerRange = 0.57;
        float midRange = 0.15;
        float outerRange = 0.29;
        float blendStrength = 0.2;
        
        // 컬러 정의
        vec3 centerColor = vec3(1.0, 0.75, 0.9);    // 중앙 핑크
        vec3 midColor = vec3(1.0, 0.85, 0.7);       // 중간 피치
        vec3 outerColor = vec3(0.9, 0.8, 1.0);      // 외곽 연보라
        
        // 거리에 따른 컬러 블렌딩
        vec3 color;
        float centerMix = smoothstep(0.0, centerRange * blendStrength, dist);
        float midMix = smoothstep(centerRange, centerRange + midRange, dist);
        float outerMix = smoothstep(centerRange + midRange, centerRange + midRange + outerRange, dist);
        
        // 컬러 믹싱
        color = mix(centerColor, midColor, centerMix);
        color = mix(color, outerColor, midMix);
        
        // 프레넬 효과 추가
        color += vec3(0.1) * fresnel;
        
        // 글로우 효과
        float centerGlow = exp(-dist * 3.0) * 0.8;
        color += mix(centerColor, midColor, centerGlow) * centerGlow;
        
        // 외곽 글로우
        float edgeGlow = exp(-abs(dist - 0.4) * 4.0) * 0.4;
        color += mix(midColor, outerColor, edgeGlow) * edgeGlow;
        
        // 컬러 보정
        color = pow(color, vec3(0.85));  // 감마 보정
        color *= 1.1;                    // 밝기 증가
        
        // 알파값 계산
        float alpha = smoothstep(0.5, 0.2, dist);
        alpha *= 0.9;
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
  }), [])

  const meshRef = useRef()

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