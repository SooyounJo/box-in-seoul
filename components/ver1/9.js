import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function AgenticBubble({ styleType = 6, cameraMode = 'default' }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      lightDir: { value: new THREE.Vector3(0.2, 0.9, 0.3).normalize() },
      ringDir: { value: new THREE.Vector3(0.08, 0.56, 0.86).normalize() },
      camY: { value: 0.0 },
      moveActive: { value: 0.0 },
      camZ: { value: 6.0 },
      zoomActive: { value: 0.0 },
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
      uniform float camY;       // 카메라 Y 위치
      uniform float moveActive; // 상하 이동 모드 활성화 여부 (0 or 1)
      uniform float camZ;       // 카메라 Z 위치
      uniform float zoomActive; // 줌 모드 활성화 여부 (0 or 1)
      varying vec2 vUv;
      varying vec3 vNormal;
      float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y);}      
      float n2(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); float a=hash(i); float b=hash(i+vec2(1.0,0.0)); float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0)); vec2 u=f*f*(3.0-2.0*f); return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);}      
      float noise(vec2 p) { return sin(p.x) * cos(p.y) + sin(p.x*2.0)*cos(p.y*2.0)*0.5; }
      float elasticWave(float x, float frequency, float amplitude){ float wave=sin(x*frequency)*amplitude; float decay=exp(-x*0.05); float bounce=sin(x*frequency*2.0)*amplitude*0.3; return (wave+bounce)*decay; }
      float breathingMotion(float time){ float slow=sin(time*0.3)*0.15; float fast=sin(time*0.8)*0.08; float deep=sin(time*0.15)*0.25; return slow+fast+deep; }
      float bumpMove(float c,float w,float f){ float d0=abs(f-(c-1.0)); float d1=abs(f-c); float d2=abs(f-(c+1.0)); float d=min(d0,min(d1,d2)); float aa=fwidth(f)*1.2; return smoothstep(w+aa,0.0+aa,d);}      
      vec3 bandWeights(float f){ float width=0.25; float y=bumpMove(0.18,width,f); float p=bumpMove(0.52,width,f); float u=bumpMove(0.86,width,f); return vec3(y,p,u);}      
      void main(){
        vec3 N=normalize(vNormal); vec3 L=normalize(lightDir); vec2 p=vUv-0.5; float r=length(p);
        float breathing=breathingMotion(time); r=r*(1.0+breathing*0.3);
        float topness=clamp(dot(N,normalize(ringDir))*0.5+0.5,0.0,1.0);
        
        // CSS 코드의 정확한 컬러와 그라디언트 적용
        // linear-gradient(180deg, #361EAE 0.96%, #FF9CD4 79.81%, #FFE6C3 98.08%)
        
        // 하단: #361EAE (0.96% 위치)
        vec3 bottomColor = vec3(0.211, 0.118, 0.682); // #361EAE
        
        // 중간: #FF9CD4 (79.81% 위치)  
        vec3 midColor = vec3(1.0, 0.612, 0.831); // #FF9CD4
        
        // 상단: #FFE6C3 (98.08% 위치)
        vec3 topColor = vec3(1.0, 0.902, 0.765); // #FFE6C3
        
        // 라이너 그라디언트 (Y 좌표 기반, 180deg = 위에서 아래로)
        float gradientFactor = vUv.y; // 0.0 (하단) ~ 1.0 (상단)
        
        // CSS 그라디언트 정확히 재현
        vec3 base;
        if (gradientFactor > 0.9808) {
          // 98.08% 이상: 상단 색상
          base = topColor;
        } else if (gradientFactor > 0.7981) {
          // 79.81% ~ 98.08%: 중간에서 상단으로
          float t = (gradientFactor - 0.7981) / (0.9808 - 0.7981);
          base = mix(midColor, topColor, t);
        } else if (gradientFactor > 0.0096) {
          // 0.96% ~ 79.81%: 하단에서 중간으로
          float t = (gradientFactor - 0.0096) / (0.7981 - 0.0096);
          base = mix(bottomColor, midColor, t);
        } else {
          // 0.96% 이하: 하단 색상
          base = bottomColor;
        }
        
        // 이미지처럼 균일한 확산 블러 효과 - 모든 가장자리에서 바깥쪽으로 확산
        // 블롭 전체가 부드럽게 빛을 내뿜는 듯한 효과
        
        // 중심에서 가장자리까지의 거리 기반 블러 (방향성 없음)
        float centerDistance = r; // 중심(0.5, 0.5)에서의 거리
        float maxDistance = 0.5; // 최대 거리 (구의 반지름)
        
        // 거리 기반 블러 강도 (중심은 선명, 가장자리로 갈수록 강한 블러)
        float radialBlur = smoothstep(0.0, maxDistance, centerDistance);
        radialBlur = radialBlur * radialBlur * 0.8; // 제곱으로 부드러운 전환
        
        // 정적인 블러 효과 (애니메이션 없음)
        float blurNoise1 = sin(vUv.x * 6.0) * sin(vUv.y * 6.0) * radialBlur;
        float blurNoise2 = sin(vUv.x * 10.0) * sin(vUv.y * 10.0) * radialBlur * 0.7;
        float blurNoise3 = sin(vUv.x * 14.0) * sin(vUv.y * 14.0) * radialBlur * 0.5;
        float blurNoise4 = sin(vUv.x * 18.0) * sin(vUv.y * 18.0) * radialBlur * 0.3;
        
        // 색상에 블러 노이즈 적용
        base += blurNoise1 + blurNoise2 + blurNoise3 + blurNoise4;
        
        // 균일한 가장자리 부드러움 (모든 방향에서 동일)
        float edgeSoftness = smoothstep(0.0, 0.1 + radialBlur * 0.3, centerDistance);
        base *= edgeSoftness;
        
        // 정적인 색상 확산 효과 (애니메이션 없음)
        float colorSpread = radialBlur * 0.2;
        base.r += sin(vUv.x * 12.0) * colorSpread;
        base.g += sin(vUv.x * 12.0) * colorSpread;
        base.b += sin(vUv.x * 12.0) * colorSpread;
        
        // 배경과의 균일한 블렌딩 (모든 가장자리에서 동일하게)
        vec3 bgColor = vec3(0.95, 0.95, 0.98); // 매우 밝은 배경
        float blendFactor = radialBlur * 0.6; // 균일한 블렌딩
        base = mix(base, bgColor, blendFactor);
        
        // 정적인 확산 효과 (애니메이션 없음)
        float lightSpread = radialBlur * 0.3;
        base += sin(vUv.x * 8.0) * lightSpread;
        base += sin(vUv.y * 8.0) * lightSpread;
        
        // 정적인 최종 색상 (애니메이션 효과 모두 제거)
        vec3 lit = base;
        
        // 간단한 프레넬 효과만 유지 (정적)
        vec3 V = vec3(0.0, 0.0, 1.0);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
        vec3 rimGlow = vec3(0.8, 0.3, 0.7) * fres * 0.2;
        lit += rimGlow;
        
        // 간단한 가장자리 페더링
        float edgeFeather = smoothstep(0.52, 0.36, r);
        float alpha = 0.85 * edgeFeather + fres * 0.1;
        alpha = clamp(alpha, 0.0, 0.95);
        
        gl_FragColor = vec4(lit, alpha);
      }
    `,
    transparent: true,
  }), [])

  // 스프링 상태 저장 (속도)
  const zVelocityRef = useRef(0)
  const yVelocityRef = useRef(0)

  useFrame((state, delta) => {
    material.uniforms.time.value += delta
    
    // 카메라 애니메이션 처리 (스프링 기반, 미세 진동)
    const { camera } = state
    const time = state.clock.getElapsedTime()
    const dt = Math.min(delta, 0.05)

    const baseZ = 6 // Canvas 기본 카메라 z와 동기화
    const baseY = 0

    // 더 넓은 진폭과 개선된 스프링 애니메이션
    const periodZoom = 8 // 초 (더 빠른 주기)
    const periodMove = 8 // 초 (더 빠른 주기)
    const ampZ = 2.0 // z 진폭 (더 강하게)
    const ampY = 0.8 // y 진폭 (더 강하게)

    // 스프링 기반 타겟 계산 (빠르게 들어가고 천천히 나오는 이징)
    let targetZ = baseZ
    let targetY = baseY

    if (cameraMode === 'zoom') {
      const t = (time / periodZoom) % 1.0
      // 빠르게 들어가고 천천히 나오는 이징 함수
      const easedT = t < 0.5 
        ? 2 * t * t // 빠르게 들어가기 (0~0.5)
        : 1 - 2 * (1 - t) * (1 - t) // 천천히 나오기 (0.5~1)
      targetZ = baseZ + Math.sin(easedT * Math.PI * 2) * ampZ
    }

    if (cameraMode === 'move') {
      const t = (time / periodMove) % 1.0
      // 빠르게 들어가고 천천히 나오는 이징 함수
      const easedT = t < 0.5 
        ? 2 * t * t // 빠르게 들어가기 (0~0.5)
        : 1 - 2 * (1 - t) * (1 - t) // 천천히 나오기 (0.5~1)
      targetY = baseY + Math.sin(easedT * Math.PI * 2) * ampY
    }

    // 스프링 파라미터 (더 반응적인 스프링)
    const stiffnessZ = 12.0
    const stiffnessY = 12.0
    const damping = 0.75 // 더 강한 감쇠로 자연스러운 움직임

    // Z 축 스프링 업데이트
    const currentZ = camera.position.z
    const accZ = (targetZ - currentZ) * stiffnessZ
    zVelocityRef.current += accZ * dt
    zVelocityRef.current *= damping
    const newZ = currentZ + zVelocityRef.current * dt

    // Y 축 스프링 업데이트
    const currentY = camera.position.y
    const accY = (targetY - currentY) * stiffnessY
    yVelocityRef.current += accY * dt
    yVelocityRef.current *= damping
    const newY = currentY + yVelocityRef.current * dt

    camera.position.set(0, newY, newZ)

    // 셰이더로 현재 카메라 Y와 이동 모드 전달
    material.uniforms.camY.value = newY
    material.uniforms.moveActive.value = cameraMode === 'move' ? 1.0 : 0.0
    material.uniforms.camZ.value = newZ
    material.uniforms.zoomActive.value = cameraMode === 'zoom' ? 1.0 : 0.0
  })

  const meshRef = useRef()
  const { camera, viewport } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])
  // ver3 모달에서 항상 모바일 크기로 렌더링 (하단 잘리도록)
  const isVer3 = typeof window !== 'undefined' && window.location.pathname === '/ver3'
  const radius = Math.min(v.width, v.height) * (isVer3 ? 0.8 : 0.33)
  const margin = isVer3 ? v.height * 0.01 : v.height * 0.035
  const yBottom = isVer3 ? -v.height / 2 + radius * 0.6 + margin : -v.height / 2 + radius + margin

  return (
    <>
      <mesh ref={meshRef} position={[0, yBottom, 0]}>
        <sphereGeometry args={[radius, 256, 256]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  )
}