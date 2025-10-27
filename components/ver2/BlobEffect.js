import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const BlobEffect = ({ position, scale = 1, color = [1.0, 0.12, 0.45], gradientColor, speed = 1, direction = [1, 1] }) => {
  const { viewport } = useThree()
  
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      opacity: { value: 1.0 }
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
      uniform float opacity;
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
        float t = time * 0.2;
        return sin(dist * 6.0 - t + angle * 1.5) * strength * 0.8;
      }

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0) * 0.4;
        
        float wave1 = wave(p, 8.0, 0.5, 0.08, 0.0);
        float wave2 = wave(p * 1.2, 5.0, -0.4, 0.06, PI/4.0);
        float wave3 = wave(p * 0.7, 6.0, 0.3, 0.04, PI/2.0);
        float swirlEffect = swirl(p, 0.1);
        
        float totalEffect = wave1 + wave2 + wave3 + swirlEffect;
        
        float colorPulse = sin(time * 1.2) * 0.08 + 0.92;
        
        vec3 baseColor = vec3(${color.join(", ")}) * colorPulse;
        vec3 secondColor = vec3(${gradientColor ? gradientColor.join(", ") : "0.9, 0.45, 0.95"}) * colorPulse;
        
        float gradientOffset = totalEffect * 0.2;
        float gradientEdge = smoothstep(-0.4, 0.3, p.x + gradientOffset);
        
        vec3 color = mix(secondColor, baseColor, gradientEdge);
        
        float glowStrength = 1.0 + totalEffect * 2.0;
        float glow = exp(-r * 1.5) * glowStrength;
        vec3 glowColor = mix(
          secondColor,
          baseColor,
          gradientEdge + totalEffect * 0.15
        );
        color += glowColor * glow * 0.3;
        
        color *= 1.0 + totalEffect * 0.15;
        color = pow(color, vec3(0.85));
        
        float alpha = smoothstep(0.52, 0.15, r);
        alpha = alpha * 0.9 + fresnel * 0.2;
        alpha = clamp(alpha * opacity, 0.0, 0.92);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
  }), [color, gradientColor])

  const meshRef = useRef()
  const velocityRef = useRef([speed * direction[0] * 0.0005, speed * direction[1] * 0.0005])
  const opacityRef = useRef(1)
  const opacityVelocityRef = useRef(0.001)
  
  useFrame((state) => {
    if (!meshRef.current) return
    
    material.uniforms.time.value += 0.008
    
    const currentPos = meshRef.current.position
    currentPos.x += velocityRef.current[0]
    currentPos.y += velocityRef.current[1]
    
    const bounds = {
      x: viewport.width * 0.4,
      y: viewport.height * 0.4
    }
    
    if (Math.abs(currentPos.x) > bounds.x) {
      velocityRef.current[0] *= -1
      currentPos.x = Math.sign(currentPos.x) * bounds.x
    }
    
    if (Math.abs(currentPos.y) > bounds.y) {
      velocityRef.current[1] *= -1
      currentPos.y = Math.sign(currentPos.y) * bounds.y
    }
    
    opacityRef.current += opacityVelocityRef.current
    if (opacityRef.current > 1 || opacityRef.current < 0.6) {
      opacityVelocityRef.current *= -1
    }
    material.uniforms.opacity.value = opacityRef.current
  })

  const radius = Math.min(viewport.width, viewport.height) * 0.2 * scale

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export default BlobEffect
