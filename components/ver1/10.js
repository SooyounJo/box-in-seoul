import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble10() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2() },
      mousePos: { value: new THREE.Vector2(0.5, 0.5) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec2 resolution;
      uniform vec2 mousePos;
      varying vec2 vUv;
      varying vec3 vPosition;

      #define NUM_BLOBS 6

      // 노이즈 함수
      float hash(vec2 p) { 
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y); 
      }

      // 2D 노이즈
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      // 블롭 색상 정의
      vec3 getBlobColor(int index) {
        if(index == 0) return vec3(1.0, 0.2, 0.2); // 빨강
        if(index == 1) return vec3(0.2, 1.0, 0.2); // 초록
        if(index == 2) return vec3(0.2, 0.2, 1.0); // 파랑
        if(index == 3) return vec3(1.0, 1.0, 0.2); // 노랑
        if(index == 4) return vec3(1.0, 0.2, 1.0); // 마젠타
        return vec3(0.2, 1.0, 1.0); // 시안
      }

      // 블롭의 위치 계산
      vec2 getBlobPosition(int index, float time) {
        float angle = float(index) * 3.14159 * 2.0 / float(NUM_BLOBS) + time * 0.5;
        float radius = 0.3 + 0.1 * sin(time * 0.5 + float(index));
        return vec2(
          0.5 + cos(angle) * radius + 0.1 * noise(vec2(time * 0.5 + float(index), 0.0)),
          0.5 + sin(angle) * radius + 0.1 * noise(vec2(0.0, time * 0.5 + float(index)))
        );
      }

      // 메타볼 필드 계산
      float getMetaballField(vec2 p, vec2 center, float radius) {
        float d = length(p - center);
        return radius / (d * d);
      }

      void main() {
        vec2 uv = vUv;
        float aspect = resolution.x / resolution.y;
        uv.x *= aspect;
        
        float totalField = 0.0;
        vec3 finalColor = vec3(0.0);
        
        // 각 블롭에 대한 필드와 색상 계산
        for(int i = 0; i < NUM_BLOBS; i++) {
          vec2 blobPos = getBlobPosition(i, time);
          blobPos.x *= aspect;
          float field = getMetaballField(uv, blobPos, 0.02);
          
          // 블롭 색상 혼합
          vec3 blobColor = getBlobColor(i);
          finalColor += blobColor * field;
          totalField += field;
        }
        
        // 색상 정규화 및 블렌딩
        if(totalField > 0.0) {
          finalColor /= totalField;
        }
        
        // 메타볼 효과 적용
        float metaball = smoothstep(0.8, 1.0, totalField);
        
        // 최종 색상 계산
        vec3 color = mix(finalColor, vec3(1.0), metaball * 0.7);
        
        // 부드러운 알파 처리
        float alpha = smoothstep(0.0, 0.2, totalField);
        
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
    material.uniforms.time.value += delta
    material.uniforms.resolution.value.set(size.width, size.height)
    
    // 마우스 위치 업데이트
    const mouseX = (state.mouse.x + 1) / 2
    const mouseY = (state.mouse.y + 1) / 2
    material.uniforms.mousePos.value.set(mouseX, mouseY)
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
