import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble3() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      lightDir: { value: new THREE.Vector3(0.2, 0.9, 0.3).normalize() },
      ringDir: { value: new THREE.Vector3(0.08, 0.56, 0.86).normalize() },
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
        float aa = fwidth(f) * 1.5;
        return smoothstep(width + aa, 0.0 + aa, d);
      }

      vec3 bandWeights(float f) {
        float width = 0.28;
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
        
        // 일렁이는 빛 효과 (2번 구와 같은 방식) - 조금 더 빠르게
        float ripple1 = noise(vUv * 3.0 + time * 0.7) * 0.1;
        float ripple2 = noise(vUv * 5.0 + time * 0.45) * 0.05;
        float ripple3 = noise(vUv * 7.0 + time * 0.9) * 0.03;
        float totalRipple = ripple1 + ripple2 + ripple3;
        
        // 일레스틱 웨이브 효과 (2번 구와 같은 방식) - 조금 더 빠르게
        float elastic1 = elasticWave(topness * 2.0 + time * 0.6, 3.0, 0.15);
        float elastic2 = elasticWave(topness * 3.0 + time * 0.8, 2.0, 0.08);
        float totalElastic = elastic1 + elastic2;
        
        // 블러 효과 (약화)
        float blurAmount = 0.02;
        float f1 = topness * scale + phase + totalRipple + totalElastic;
        float f2 = topness * scale + phase + blurAmount + totalRipple * 0.8 + totalElastic * 0.6;
        float f3 = topness * scale + phase + (blurAmount * 1.5) + totalRipple * 0.6 + totalElastic * 0.4;

        float perturb = 0.02 * n2(vUv*1.5 + time*0.07);
        vec3 w1 = bandWeights(f1 + perturb);
        vec3 w2 = bandWeights(f2 + perturb*0.8);
        vec3 w3 = bandWeights(f3 + perturb*0.6);

        float wobble1 = 0.997 + 0.003*n2(vUv*2.2 + time*0.08);
        float wobble2 = 0.997 + 0.003*n2(vUv*2.2 + time*0.08 + 1.7);
        float wobble3 = 0.997 + 0.003*n2(vUv*2.2 + time*0.08 + 3.1);
        w1 *= wobble1; w2 *= wobble2; w3 *= wobble3;

        // 1번 톤에 맞춘 팔레트 (magenta/purple 계열)
        vec3 cY = vec3(0.80, 0.40, 0.70);
        vec3 cP = vec3(0.85, 0.20, 0.75);
        vec3 cU = vec3(0.90, 0.50, 0.80);

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
        lit = mix(lit, flowColor, flowMaskAvg * 0.95);
        
        // 일렁이는 빛 효과 적용 (1번 톤)
        vec3 rippleColor = vec3(0.8, 0.4, 0.6) * totalRipple * 0.3;
        vec3 elasticColor = vec3(0.8, 0.3, 0.7) * totalElastic * 0.2;
        lit += rippleColor + elasticColor;

        vec3 V = vec3(0.0, 0.0, 1.0);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
        
        // 중앙에서 퍼지는 홀로그램 파동 효과
        float centerDistance = length(p);
        float wavePhase = centerDistance * 8.0 - time * 3.0;
        
        // 홀로그램 색상이 파동처럼 퍼지되, 1번 톤으로 재착색
        float a = 0.5 + 0.5 * sin(wavePhase + 0.0);
        float b = 0.5 + 0.5 * sin(wavePhase + 2.094);
        float c = 0.5 + 0.5 * sin(wavePhase + 4.188);
        vec3 hologramColor = (a * cY + b * cP + c * cU) / max(a + b + c, 1e-3);
        
        // 파동의 강도가 중심에서 바깥쪽으로 감쇠
        float waveIntensity = exp(-centerDistance * 2.0) * (1.0 + sin(wavePhase) * 0.5);
        
        // 홀로그램 스캔라인 효과 (파동과 함께) - 조금 더 빠르게
        float scanline = sin(centerDistance * 20.0 + time * 6.5) * 0.1 + 0.9;
        hologramColor *= scanline * waveIntensity;
        
        // 중앙에서 퍼지는 홀로그램 글로우 (약화)
        float hologramGlow = smoothstep(0.4, 0.0, r) * waveIntensity * 0.5;
        lit += hologramColor * hologramGlow;
        
        // 파동의 가장자리 홀로그램 효과 (약화)
        float hologramRim = pow(1.0 - max(dot(N, V), 0.0), 1.2) * waveIntensity;
        lit += hologramColor * hologramRim * 0.5;

        lit += vec3(0.72, 0.57, 1.02) * (1.0 - topness) * 0.14;

        // 1번과 동일한 채도/밝기/대비 루프 동기화
        vec3 gray = vec3(dot(lit, vec3(0.299, 0.587, 0.114)));
        float loopPhaseColor = 0.5 + 0.5 * sin(6.28318530718 * time / 7.0);
        float sat = 1.0 + 0.85 * loopPhaseColor;
        lit = mix(gray, lit, sat);
        float brightness = 1.0 + 0.14 * loopPhaseColor;
        lit *= brightness;
        float contrast = 1.0 + 0.32 * loopPhaseColor;
        lit = (lit - 0.5) * contrast + 0.5;
        lit = pow(lit, vec3(0.86));
        lit *= 1.12;
        lit = mix(lit, vec3(1.0), 0.05);
        lit = clamp(lit, 0.0, 1.1);

        // 외곽 페더링 범위 확장 및 부드럽게
        float edgeFeather = smoothstep(0.54, 0.32, r);
        float alpha = 0.75 * edgeFeather + fres * 0.12;
        
        // 외곽으로 갈수록 더 투명하게
        float edgeGradient = 1.0 - smoothstep(0.3, 0.5, r);
        alpha *= mix(0.85, 1.0, edgeGradient);
        
        // 핑크 홀로그램 알파 효과 - 조금 더 부드럽게
        float hologramFlicker = 0.75 + 0.25 * sin(time * 3.8 + r * 14.0);
        alpha *= hologramFlicker;
        alpha = clamp(alpha, 0.25, 0.85);

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

  const radius = Math.min(v.width, v.height) * (window.innerWidth <= 768 ? 0.5 : 0.33) // 모바일: 화면에 딱 맞춤 (잘림 없음)
  const margin = v.height * 0.035
  const yBottom = window.innerWidth <= 768 ? 
    -v.height / 2 + radius + margin : // 모바일: 화면 하단에 딱 맞춤
    -v.height / 2 + radius + margin // 데스크톱: 기존 위치

  return (
    <>
      {/* 메인 구 */}
      <mesh ref={meshRef} position={[0, yBottom, 0]}>
        <sphereGeometry args={[radius, 256, 256]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  )
}
