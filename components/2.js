import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble({ styleType = 1 }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      lightDir: { value: new THREE.Vector3(0.2, 0.9, 0.3).normalize() },
      ringDir: { value: new THREE.Vector3(0.08, 0.56, 0.86).normalize() },
      styleType: { value: styleType },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
      fragmentShader: `
      precision highp float;
      uniform float time;
      uniform vec3 lightDir;
      uniform vec3 ringDir;
      uniform float styleType;
      varying vec2 vUv;
      varying vec3 vNormal;

      float hash(vec2 p){
        p = fract(p*vec2(123.34, 345.45));
        p += dot(p, p+34.345);
        return fract(p.x*p.y);
      }
      float n2(vec2 p){
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i+vec2(1.0,0.0));
        float c = hash(i+vec2(0.0,1.0));
        float d = hash(i+vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }

      // 일렁이는 빛을 위한 노이즈 함수
      float noise(vec2 p) {
        return sin(p.x) * cos(p.y) + sin(p.x * 2.0) * cos(p.y * 2.0) * 0.5;
      }

      // 일레스틱 효과를 위한 웨이브 함수
      float elasticWave(float x, float frequency, float amplitude) {
        float wave = sin(x * frequency) * amplitude;
        float decay = exp(-x * 0.05); // 더 천천히 감쇠
        float bounce = sin(x * frequency * 2.0) * amplitude * 0.3; // 바운스 효과
        return (wave + bounce) * decay;
      }

      float bumpMove(float center, float width, float f) {
        float d0 = abs(f - (center - 1.0));
        float d1 = abs(f - center);
        float d2 = abs(f - (center + 1.0));
        float d  = min(d0, min(d1, d2));
        float aa = fwidth(f) * 1.2; // 부드러운 변화
        return smoothstep(width + aa, 0.0 + aa, d);
      }

      vec3 bandWeights(float f) {
        float width = 0.25; // 부드러운 색상 변화
        float y = bumpMove(0.18, width, f);
        float p = bumpMove(0.52, width, f);
        float u = bumpMove(0.86, width, f);
        return vec3(y, p, u);
      }

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(lightDir);
        float lambert = max(dot(N, L), 0.0);

        vec2 p = vUv - 0.5;
        float r = length(p);

        float topness = clamp(dot(N, normalize(ringDir)) * 0.5 + 0.5, 0.0, 1.0);

        vec3 peach = vec3(1.00, 0.90, 0.72);
        vec3 pink  = vec3(1.00, 0.70, 0.90);
        vec3 purple= vec3(0.82, 0.68, 1.00);
        vec3 base = mix(pink, peach, clamp(0.5 + 0.5*topness, 0.0, 1.0));
        base = mix(base, purple, smoothstep(0.0, 0.35, 1.0 - topness));

        float speed = 0.10;
        float scale = 1.8;
        float loopSec = 10.0;
        float loopT   = mod(time, loopSec) / loopSec;
        float phase = -loopT;
        
        // 일렁이는 빛 효과
        float ripple1 = noise(vUv * 3.0 + time * 0.5) * 0.1;
        float ripple2 = noise(vUv * 5.0 + time * 0.3) * 0.05;
        float ripple3 = noise(vUv * 7.0 + time * 0.7) * 0.03;
        float totalRipple = ripple1 + ripple2 + ripple3;
        
        // 일레스틱 웨이브 효과
        float elastic1 = elasticWave(topness * 2.0 + time * 0.4, 3.0, 0.15);
        float elastic2 = elasticWave(topness * 3.0 + time * 0.6, 2.0, 0.08);
        float totalElastic = elastic1 + elastic2;
        // 블러 효과 (약화)
        float blurAmount = 0.02;
        float f1 = topness * scale + phase + totalRipple + totalElastic;
        float f2 = topness * scale + phase + blurAmount + totalRipple * 0.8 + totalElastic * 0.6;
        float f3 = topness * scale + phase + (blurAmount * 1.5) + totalRipple * 0.6 + totalElastic * 0.4;

        float perturb = 0.02 * n2(vUv*1.5 + time*0.05);
        vec3 w1 = bandWeights(f1 + perturb);
        vec3 w2 = bandWeights(f2 + perturb*0.8);
        vec3 w3 = bandWeights(f3 + perturb*0.6);

        float wobble1 = 0.997 + 0.003*n2(vUv*2.2 + time*0.06);
        float wobble2 = 0.997 + 0.003*n2(vUv*2.2 + time*0.06 + 1.7);
        float wobble3 = 0.997 + 0.003*n2(vUv*2.2 + time*0.06 + 3.1);
        w1 *= wobble1; w2 *= wobble2; w3 *= wobble3;

        // 고채도 핑크 색상 팔레트
        vec3 cY = vec3(1.00, 0.20, 0.60);  // 네온핑크
        vec3 cP = vec3(1.00, 0.00, 0.80);  // 마젠타
        vec3 cU = vec3(1.00, 0.40, 0.90);  // 바이브런트핑크

        w1 *= vec3(0.18, 1.0, 0.95);
        w2 *= vec3(0.18, 1.0, 0.95);
        w3 *= vec3(0.18, 1.0, 0.95);

        vec3 flowColor1 = cY * w1.x + cP * w1.y + cU * w1.z;
        vec3 flowColor2 = cY * w2.x + cP * w2.y + cU * w2.z;
        vec3 flowColor3 = cY * w3.x + cP * w3.y + cU * w3.z;
        vec3 flowColor  = (0.5*flowColor1 + 0.35*flowColor2 + 0.15*flowColor3);

        float mask1 = clamp(w1.x + w1.y + w1.z, 0.0, 1.0);
        float mask2 = clamp(w2.x + w2.y + w2.z, 0.0, 1.0);
        float mask3 = clamp(w3.x + w3.y + w3.z, 0.0, 1.0);
        float flowMaskAvg = clamp((0.5*mask1 + 0.35*mask2 + 0.15*mask3), 0.0, 1.0);

        vec3 lit = base;
        // 부드러운 색상 혼합으로 대비 줄이기
        lit = mix(lit, flowColor, flowMaskAvg * 0.8);
        
        // 일렁이는 빛 효과 적용 (고채도 핑크)
        vec3 rippleColor = vec3(1.0, 0.3, 0.7) * totalRipple * 0.4;
        vec3 elasticColor = vec3(1.0, 0.1, 0.8) * totalElastic * 0.3;
        lit += rippleColor + elasticColor;

        vec3 V = vec3(0.0, 0.0, 1.0);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
        vec3 rimGlow = vec3(1.0, 0.2, 0.8) * fres * 0.5;
        float softHalo = smoothstep(0.34, 0.10, r) * 0.13;
        vec3 glow = rimGlow + vec3(1.0, 0.3, 0.9) * softHalo;
        lit += glow;

        lit += vec3(1.0, 0.1, 0.7) * (1.0 - topness) * 0.2;

        vec3 gray = vec3(dot(lit, vec3(0.299, 0.587, 0.114)));
        lit = mix(gray, lit, 2.2); // 채도 대폭 증가
        lit = pow(lit, vec3(0.85)); // 감마 조정으로 더 선명하게
        lit *= 1.15; // 노출 증가로 더 밝게
        lit = mix(lit, vec3(1.0), 0.05);
        lit = clamp(lit, 0.0, 1.1);

        float edgeFeather = smoothstep(0.52, 0.36, r);
        float alpha = 0.80 * edgeFeather + fres*0.10;
        alpha = clamp(alpha, 0.0, 0.96);

        gl_FragColor = vec4(lit, alpha);
      }
    `,
    transparent: true,
  }), [])

  useFrame((state, delta) => {
    material.uniforms.time.value += delta
  })

  const meshRef = useRef()
  const { camera, viewport } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])

  const radius = Math.min(v.width, v.height) * 0.33
  const margin = v.height * 0.035
  const yBottom = -v.height / 2 + radius + margin

  return (
    <>
      {/* 메인 구 */}
      <mesh ref={meshRef} position={[0, yBottom, 0]}>
        <sphereGeometry args={[radius, 256, 256]} />
        <primitive object={material} attach="material" />
      </mesh>
      
      {/* 배경 구 (버튼 2일 때만 표시) */}
      {styleType === 2 && (
        <mesh position={[0, yBottom, -0.5]}>
          <sphereGeometry args={[radius * 1.2, 128, 128]} />
          <meshBasicMaterial 
            color="#4ecdc4" 
            transparent 
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </>
  )
}
