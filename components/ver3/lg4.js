import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function LG4() {
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

      // 노이즈 함수
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = sin(i.x + i.y * 12.34);
        float b = sin(i.x + 1.0 + i.y * 12.34);
        float c = sin(i.x + (i.y + 1.0) * 12.34);
        float d = sin(i.x + 1.0 + (i.y + 1.0) * 12.34);
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec2 uv = vUv;
        float aspect = resolution.x / resolution.y;
        uv.x *= aspect;
        
        // 움직이는 노이즈 패턴
        float n = noise(uv * 5.0 + time * 0.2);
        float n2 = noise(uv * 8.0 - time * 0.3);
        
        // 빛나는 파동
        vec2 center = vec2(0.5 * aspect, 0.5);
        float dist = length(uv - center);
        float wave = sin(dist * 10.0 - time * 2.0) * 0.5 + 0.5;
        
        // 최종 빛 강도
        float light = wave * n * n2;
        
        // 색상 변화
        vec3 color1 = vec3(1.0, 0.2, 0.5); // 핑크
        vec3 color2 = vec3(0.2, 0.5, 1.0); // 파랑
        vec3 color = mix(color1, color2, n);
        
        // 빛나는 효과
        color *= light * 2.0;
        color += vec3(1.0) * pow(light, 3.0);
        
        // 부드러운 알파값
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
