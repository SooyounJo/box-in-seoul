import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const BlobMaterial = ({ color }) => {
  return new THREE.ShaderMaterial({
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

      float softBlur(float x, float strength) {
        return exp(-x * x / strength);
      }

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        
        // 프레넬 효과 (약하게)
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0) * 0.2;
        
        // 기본 컬러
        vec3 color = ${color};
        
        // 컬러 보정
        color = pow(color, vec3(0.85));
        color += vec3(0.1) * fresnel;
        
        // 부드러운 알파값 계산
        float alpha = smoothstep(0.5, 0.2, r);
        
        // 외곽 블러 효과
        float edgeBlur = softBlur(r - 0.35, 0.3);
        alpha *= (1.0 - edgeBlur * 0.3);
        alpha = clamp(alpha, 0.0, 0.95);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: false,
  });
};

const Blob = ({ position, color, size, index }) => {
  const material = useMemo(() => BlobMaterial({ color }), [color]);
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      material.uniforms.time.value = state.clock.getElapsedTime();
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

  const blobColors = [
    'vec3(0.95, 0.4, 0.6)',   // 핑크
    'vec3(1.0, 0.7, 0.4)',    // 오렌지
    'vec3(0.75, 0.15, 0.45)', // 마젠타
    'vec3(0.2, 0.75, 0.45)',  // 민트
    'vec3(0.2, 0.4, 0.85)'    // 블루
  ];

  const blobSizes = [0.15, 0.17, 0.14, 0.16, 0.15].map(
    size => size * Math.min(viewport.width, viewport.height) * 0.33
  );

  useFrame((state) => {
    setTime(state.clock.getElapsedTime());
  });

  const getPositions = () => {
    const t = time * 0.5;
    const spread = Math.sin(t) * 0.5 + 0.5;
    const maxSpread = 0.5;
    
    return blobColors.map((_, i) => {
      const angle = (i / blobColors.length) * Math.PI * 2 + t;
      const distance = spread * maxSpread;
      return [
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        0
      ];
    });
  };

  const positions = getPositions();

  return (
    <group ref={groupRef} position={[0, 0, 1]}>
      {blobColors.map((color, i) => (
        <Blob
          key={i}
          position={positions[i]}
          color={color}
          size={blobSizes[i]}
          index={i}
        />
      ))}
    </group>
  );
}