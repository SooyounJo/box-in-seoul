import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function LG5() {
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

      // 회전 행렬
      mat2 rotate2d(float angle) {
        return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
      }

      // 프랙탈 노이즈
      float fbm(vec2 p) {
        float sum = 0.0;
        float amp = 0.5;
        float freq = 1.0;
        for(int i = 0; i < 6; i++) {
          sum += sin(p.x * freq) * cos(p.y * freq) * amp;
          freq *= 2.0;
          amp *= 0.5;
        }
        return sum;
      }

      void main() {
        vec2 uv = vUv;
        float aspect = resolution.x / resolution.y;
        uv.x *= aspect;
        
        // 회전하는 좌표계
        vec2 p = uv - vec2(0.5 * aspect, 0.5);
        p = rotate2d(time * 0.2) * p;
        
        // 프랙탈 패턴
        float f = fbm(p * 5.0 + time * 0.1);
        f += fbm(p * 8.0 - time * 0.15) * 0.5;
        
        // 빛나는 원형 패턴
        float dist = length(p);
        float circle = smoothstep(0.3, 0.29, dist);
        float ring = smoothstep(0.31, 0.3, dist) - smoothstep(0.29, 0.28, dist);
        
        // 최종 빛 강도
        float light = f * circle + ring;
        
        // 색상 변화
        vec3 color1 = vec3(1.0, 0.8, 0.2); // 황금색
        vec3 color2 = vec3(1.0, 0.4, 0.1); // 주황색
        vec3 color = mix(color1, color2, f);
        
        // 빛나는 효과
        color *= light * 2.0;
        color += vec3(1.0, 0.8, 0.6) * pow(ring, 3.0);
        
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
