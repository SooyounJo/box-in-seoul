import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function LG3() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2() },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec2 resolution;
      varying vec2 vUv;

      #define NUM_BLOBS 15

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      // 부드러운 블롭 형태
      float softBlob(vec2 uv, vec2 center, float radius, float softness) {
        float d = length(uv - center);
        float glow = exp(-d * d / softness);
        float core = smoothstep(radius + 0.03, radius - 0.03, d);
        return glow * 0.3 + core;
      }

      // 블롭의 움직임 계산
      vec2 blobPosition(float index, float time) {
        float angle = index * 6.28 / float(NUM_BLOBS) + time * 0.15;
        // 움직임 범위를 0.3에서 0.2로 줄임
        float radius = 0.2 + sin(time * 0.5 + index) * 0.05;
        return vec2(
          0.5 + cos(angle) * radius,
          0.5 + sin(angle) * radius
        );
      }

      void main() {
        vec2 st = vUv;
        vec3 color = vec3(0.0);
        
        // 여러 개의 블롭 생성
        for(int i = 0; i < NUM_BLOBS; i++) {
          float fi = float(i);
          
          // 블롭의 위치 계산
          vec2 blobPos = blobPosition(fi, time);
          
          // 각 블롭의 특성 (크기를 더 작게 조정)
          float speed = 0.4 + fi * 0.08;
          // 기본 크기를 0.15에서 0.08로 줄이고, 변화 폭도 줄임
          float size = 0.08 + sin(time * speed + fi) * 0.02;
          float brightness = 0.5 + sin(time * 0.8 + fi) * 0.3;
          
          // 블롭 그리기 (부드러움 값을 0.1에서 0.08로 줄임)
          float blob = softBlob(st, blobPos, size, 0.08);
          
          // 블롭의 색상 (민트색 계열)
          vec3 blobColor = mix(
            vec3(0.4, 0.9, 0.7),  // 밝은 민트
            vec3(0.2, 0.8, 0.6),  // 진한 민트
            sin(time * 0.3 + fi) * 0.5 + 0.5
          );
          
          // 반짝임 효과 (약간 줄임)
          float sparkle = sin(time * 2.0 + fi) * 0.4 + 0.5;
          blobColor += vec3(0.15) * sparkle;
          
          // 블롭 합성 (전체적인 밝기를 약간 줄임)
          color += blobColor * blob * brightness * 0.7;
        }
        
        // 전체적인 밝기 조정
        color *= 0.7;
        
        // 추가 반짝임 효과 (더 섬세하게)
        vec2 center = vec2(0.5);
        float d = length(st - center);
        float sparklePattern = random(st * 12.0 + time);
        float sparkles = smoothstep(0.985, 1.0, sparklePattern) * (1.0 - d);
        color += vec3(0.8) * sparkles;
        
        // 알파값 설정 (약간 더 투명하게)
        float alpha = length(color) * 0.7;
        alpha = clamp(alpha, 0.0, 0.9);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
  }), [])

  const meshRef = useRef()
  const { viewport, size } = useThree()

  useFrame((state, delta) => {
    if (!meshRef.current) return
    // 움직임 속도를 약간 줄임
    material.uniforms.time.value += delta * 0.6
    material.uniforms.resolution.value.set(size.width, size.height)
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[viewport.width, viewport.height]} />
        <primitive object={material} attach="material" />
      </mesh>
  )
}