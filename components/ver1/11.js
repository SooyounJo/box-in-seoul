import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const BlobMaterial = ({ color, centerColor }) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      spread: { value: 0 }
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
      uniform float spread;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      float softBlur(float x, float strength) {
        return exp(-x * x / strength);
      }

      vec3 saturate(vec3 color, float amount) {
        float luminance = dot(color, vec3(0.299, 0.587, 0.114));
        return mix(vec3(luminance), color, amount);
      }

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0) * 0.35;
        
        vec3 individualColor = saturate(${color}, 2.5);
        vec3 mergedColor = saturate(${centerColor}, 2.0);
        
        float blendFactor = smoothstep(0.0, 1.0, spread);
        vec3 color = mix(mergedColor, individualColor, blendFactor);
        
        float glow = exp(-r * 2.0) * 0.6;
        vec3 glowColor = saturate(individualColor, 1.8);
        color += glowColor * glow * (1.0 - spread * 0.5);
        
        color = saturate(color, 1.5);
        
        color += vec3(fresnel * 0.15);
        
        float baseBlur = mix(0.6, 0.3, spread);
        float edgeBlur = softBlur(r - 0.35, baseBlur);
        float additionalBlur = softBlur(r - 0.4, baseBlur * 1.5);
        
        float alpha = smoothstep(0.52, 0.15, r);
        alpha *= (1.0 - edgeBlur * 0.4);
        alpha *= (1.0 - additionalBlur * 0.3);
        alpha = clamp(alpha, 0.0, 0.92);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
  });
};

const Blob = ({ position, color, centerColor, size, index, spread }) => {
  const material = useMemo(() => BlobMaterial({ color, centerColor }), [color, centerColor]);
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      material.uniforms.time.value = state.clock.getElapsedTime();
      material.uniforms.spread.value = spread;
    }
  });

  return (
    <mesh ref={meshRef} position={position} renderOrder={1000 + index}>
      <sphereGeometry args={[size, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default function ShaderBubble11() {
  const { viewport } = useThree();
  const groupRef = useRef();
  const [time, setTime] = useState(0);

  const centerColor = 'vec3(1.0, 0.5, 0.8)';
  const blobColors = [
    'vec3(0.95, 0.15, 0.35)',
    'vec3(0.95, 0.45, 0.15)',
    'vec3(0.95, 0.1, 0.4)',
    'vec3(0.15, 0.95, 0.35)',
    'vec3(0.15, 0.35, 0.95)'
  ];

  // 블롭 크기 조정 (약간 작게)
  const blobSizes = [0.12, 0.14, 0.11, 0.13, 0.12].map(
    size => size * Math.min(viewport.width, viewport.height) * 0.33
  );

  useFrame((state) => {
    setTime(state.clock.getElapsedTime());
  });

  const getPositions = () => {
    const t = time * 0.5;
    const spread = Math.sin(t) * 0.5 + 0.5;
    // 최대 퍼짐 범위도 약간 줄임
    const maxSpread = 0.45;
    
    return blobColors.map((_, i) => {
      const angle = (i / blobColors.length) * Math.PI * 2 + t;
      const distance = spread * maxSpread;
      return {
        position: [
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          0
        ],
        spread: spread
      };
    });
  };

  const blobData = getPositions();

  return (
    <group ref={groupRef} position={[0, 0, 1]}>
      {blobColors.map((color, i) => (
        <Blob
          key={i}
          position={blobData[i].position}
          color={color}
          centerColor={centerColor}
          size={blobSizes[i]}
          index={i}
          spread={blobData[i].spread}
        />
      ))}
    </group>
  );
}