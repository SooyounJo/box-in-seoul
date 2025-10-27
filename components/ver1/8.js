import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble8() {
  const { viewport, camera } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2() }
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

      #define PI 3.14159265359

      float wave(vec2 p, float freq, float speed, float amp, float timeOffset) {
        float t = time * speed + timeOffset;
        float x = p.x * cos(t) - p.y * sin(t);
        float y = p.x * sin(t) + p.y * cos(t);
        return sin(x * freq + t) * cos(y * freq + t * 0.8) * amp;
      }

      float swirl(vec2 p, float strength) {
        float angle = atan(p.y, p.x);
        float dist = length(p);
        float t = time * 0.4;
        return sin(dist * 8.0 - t + angle * 1.8) * strength;
      }

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0) * 0.4;
        
        float wave1 = wave(p, 10.0, 1.0, 0.13, 0.0);
        float wave2 = wave(p * 1.5, 7.0, -0.7, 0.1, PI/4.0);
        float wave3 = wave(p * 0.7, 12.0, 0.5, 0.08, PI/2.0);
        float swirlEffect = swirl(p, 0.12);
        
        float totalEffect = wave1 + wave2 + wave3 + swirlEffect;
        
        float colorPulse = sin(time * 1.8) * 0.1 + 0.9;
        
        vec3 pinkColor = vec3(1.0, 0.12, 0.45) * colorPulse;
        vec3 purpleColor = vec3(0.9, 0.45, 0.95) * colorPulse;
        
        float gradientOffset = totalEffect * 0.25;
        float gradientEdge = smoothstep(-0.2, 0.3, p.x + gradientOffset);
        
        vec3 color = mix(pinkColor, purpleColor, gradientEdge);
        
        float glowStrength = 1.0 + totalEffect * 2.5;
        float glow = exp(-r * 1.5) * glowStrength;
        vec3 glowColor = mix(
          vec3(1.0, 0.2, 0.5),
          vec3(0.95, 0.5, 1.0),
          gradientEdge + totalEffect * 0.18
        );
        color += glowColor * glow * 0.4;
        
        color *= 1.0 + totalEffect * 0.18;
        color = pow(color, vec3(0.85));
        
        float alpha = smoothstep(0.52, 0.15, r);
        alpha = alpha * 0.9 + fresnel * 0.2;
        alpha = clamp(alpha, 0.0, 0.95);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
  }), [])

  const meshRef = useRef()
  
  // 반지름을 약간 증가
  const radius = Math.min(v.width, v.height) * 0.38  // 0.33에서 0.38로 증가
  
  useFrame(() => {
    if (meshRef.current) {
      material.uniforms.time.value += 0.012
      
      // 뷰포트 크기 업데이트
      material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
      
      // 메시 위치 조정 - 스케일도 약간 증가
      const scale = Math.min(window.innerWidth, window.innerHeight) / 900  // 1000에서 900으로 감소하여 크기 증가
      meshRef.current.scale.set(scale, scale, 1)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0]}
      renderOrder={1000}
    >
      <planeGeometry args={[radius * 2, radius * 2]} />
        <primitive object={material} attach="material" />
      </mesh>
  )
}
