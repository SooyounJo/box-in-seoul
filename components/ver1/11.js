import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const BlobMaterial = ({ color, centerColor }) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      spread: { value: 0 }  // 퍼짐 정도를 전달하기 위한 uniform 추가
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

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        
        // 프레넬 효과
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.0) * 0.2;
        
        // spread 값에 따라 개별 색상과 중앙 색상을 블렌딩
        vec3 individualColor = ${color};
        vec3 mergedColor = ${centerColor};  // 1.js의 핑크 컬러
        vec3 color = mix(mergedColor, individualColor, spread);
        
        // 컬러 보정
        color = pow(color, vec3(0.85));
        color += vec3(0.1) * fresnel;
        
        // spread에 따라 블러 강도 조절
        float blurStrength = mix(0.4, 0.2, spread);  // 중앙에 모일 때 더 블러리하게
        float edgeBlur = softBlur(r - 0.35, blurStrength);
        
        // 알파값 계산
        float alpha = smoothstep(0.5, 0.2, r);
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

  const centerColor = 'vec3(1.0, 0.7, 0.9)';  // 1.js의 핑크 컬러
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
    const spread = Math.sin(t) * 0.5 + 0.5;  // 0 ~ 1
    const maxSpread = 0.5;
    
    return blobColors.map((_, i) => {
      const angle = (i / blobColors.length) * Math.PI * 2 + t;
      const distance = spread * maxSpread;
      return {
        position: [
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          0
        ],
        spread: spread  // 퍼짐 정도를 각 블롭에 전달
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