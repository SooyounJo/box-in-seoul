import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble11() {
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
      #ifdef GL_ES
      precision mediump float;
      #endif

      uniform float time;
      uniform vec2 resolution;
      varying vec2 vUv;

      #define PI 3.14159265359
      #define TWO_PI 6.28318530718

      vec2 doModel(vec3 p);
      vec2 unionOp(vec2 a, vec2 b);

      float sdBox(vec3 p, vec3 b) {
        vec3 d = abs(p) - b;
        return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
      }

      float sdSphere(vec3 p, float r) {
        return length(p) - r;
      }

      vec2 doModel(vec3 p) {
        float t = time * 0.5;
        float rt = t * PI;
        
        vec2 res = vec2(1e10, 0.0);
        
        float a = sin(rt * 0.7);
        float b = cos(rt * 0.8);
        float c = sin(rt * 0.4);
        
        vec3 bp = p;
        bp = bp + vec3(a, b, c) * 0.2;
        
        for(float i = 0.0; i < 16.0; i++) {
          float fi = i;
          float time = t * (fract(fi * 412.531 + 0.513) - 0.5) * 2.0;
          vec3 p = bp;
          
          p = p + vec3(
            sin(time + fi * 1.0) * (1.0 + (sin(time * 0.7 + fi) * 0.5)),
            cos(time * 0.8 + fi * 1.1) * (1.0 + (sin(time + fi) * 0.5)),
            sin(time * 1.1 + fi * 1.1) * (1.0 + (sin(time * 0.5 + fi) * 0.5))
          ) * 0.3;
          
          p = mix(bp, p, smoothstep(0.0, 0.2, abs(0.5 - fract(time * 0.5))));
          
          float d = sdSphere(p, 0.13);
          
          float glow = exp(-d * 4.0);
          
          vec2 res2 = vec2(d, glow);
          res = unionOp(res, res2);
        }
        return res;
      }

      vec2 unionOp(vec2 a, vec2 b) {
        return vec2(min(a.x, b.x), a.y + b.y);
      }

      void main() {
        vec2 q = vUv;
        vec2 p = -1.0 + 2.0 * q;
        p.x *= resolution.x / resolution.y;
        
        vec3 ro = vec3(0.0, 0.0, 2.5);
        vec3 rd = normalize(vec3(p.x, p.y, -1.4));
        
        vec3 color = vec3(0.0);
        float t = 0.0;
        
        for(float i = 0.0; i < 64.0; i++) {
          vec3 p = ro + rd * t;
          vec2 res = doModel(p);
          float d = res.x;
          float glow = res.y;
          
          if(d < 0.001) {
            break;
          }
          
          t += d * 0.5;
          
          color += vec3(0.6, 0.4, 0.7) * 0.01 * glow * glow;
        }
        
        color = mix(vec3(0.0), color, exp(-t * 0.3));
        
        color = pow(color, vec3(0.8, 0.9, 0.8));
        
        gl_FragColor = vec4(color, 1.0);
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
