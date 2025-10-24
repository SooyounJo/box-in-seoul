import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function LG2() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2() },
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
      varying vec2 vUv;
      varying vec3 vPosition;

      #define PI 3.14159265359

      // FBM (Fractal Brownian Motion)
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        f = f * f * (3.0 - 2.0 * f);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for(int i = 0; i < 5; i++) {
          value += amplitude * noise(st * frequency);
          st += vec2(102.8 + time * 0.1);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }

      // 유기적인 곡선 생성
      float organicCurve(vec2 st, float t) {
        float curve = 0.0;
        for(float i = 1.0; i < 4.0; i++) {
          float freq = i * 2.0;
          curve += sin(st.x * freq + t + i) * cos(st.y * freq * 0.5 + t * 0.7);
        }
        return curve * 0.2;
      }

      void main() {
        vec2 st = vUv;
        vec2 center = vec2(0.5);
        
        // 시간에 따른 움직임
        float t = time * 0.3;
        
        // 유기적인 움직임 생성
        float movement = organicCurve(st, t);
        vec2 movedSt = st + vec2(
          movement * sin(t),
          movement * cos(t * 0.7)
        );
        
        // 여러 레이어의 빛 효과
        float light = 0.0;
        
        // 메인 빛 효과
        for(float i = 0.0; i < 3.0; i++) {
          float scale = 1.0 + i * 0.5;
          vec2 pos = movedSt - center;
          pos *= scale;
          
          // 유기적인 형태의 빛
          float organicLight = fbm(pos * 3.0 + time * 0.1);
          float glow = exp(-length(pos) * (2.0 + organicLight));
          
          // 시간에 따른 색상 변화
          float timeFactor = sin(time * 0.2 + i * PI * 0.5) * 0.5 + 0.5;
          glow *= 0.3 + 0.7 * timeFactor;
          
          light += glow;
        }
        
        // 부드러운 파동 효과
        float wave = sin(length(movedSt - center) * 10.0 - time) * 0.5 + 0.5;
        light += wave * 0.1;
        
        // 노이즈 텍스처로 유기적인 느낌 추가
        float noise = fbm(movedSt * 5.0 + time * 0.05);
        light *= 0.8 + noise * 0.4;
        
        // 색상 설정
        vec3 color1 = vec3(1.0, 0.95, 0.9); // 따뜻한 흰색
        vec3 color2 = vec3(0.95, 0.9, 1.0); // 차가운 흰색
        vec3 color = mix(color1, color2, noise);
        
        // 최종 색상 계산
        color *= light * 2.0;
        
        // 부드러운 알파 처리
        float alpha = smoothstep(0.0, 0.2, light);
        alpha = min(alpha, 0.95);
        
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
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[viewport.width, viewport.height]} />
        <primitive object={material} attach="material" />
      </mesh>
  )
}