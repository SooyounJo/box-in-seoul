import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'

export default function ShaderBubble7({ isActive = false }) {
  const [transitionProgress, setTransitionProgress] = useState(1)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // 1.js 기반 + 9번과 동일한 강렬한 방사형 움직임
  const material = useMemo(() => new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        lightDir: { value: new THREE.Vector3(0.2, 0.9, 0.3).normalize() },
        ringDir: { value: new THREE.Vector3(0.08, 0.56, 0.86).normalize() },
        camY: { value: 0.0 },
        moveActive: { value: 0.0 },
        camZ: { value: 6.0 },
        zoomActive: { value: 0.0 },
        transitionProgress: { value: 0 },
        scaleFactor: { value: 1.0 }, // 구 크기 조절
      },
    vertexShader: `
      uniform float scaleFactor;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position * scaleFactor, 1.0);
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
      uniform float transitionProgress; // 홀로그램 효과 트랜지션 진행도
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
        vec3 peach=vec3(1.00,0.90,0.72); vec3 pink=vec3(1.00,0.70,0.90); vec3 purple=vec3(0.82,0.68,1.00);
        vec3 base=mix(pink,peach,clamp(0.5+0.5*topness,0.0,1.0)); base=mix(base,purple,smoothstep(0.0,0.35,1.0-topness));
        float loopSec=10.0; float loopT=mod(time,loopSec)/loopSec; float phase=-loopT;
        
        // 방사형 파동 (9번과 동일한 강렬한 움직임) - 극적으로 강화하고 격렬하게
        float waveSpeed = 5.5; // 더 빠르게
        float waveFreq  = 35.0; // 더 높은 빈도
        float radial = sin(waveFreq * r + waveSpeed * time);
        float envelope = smoothstep(0.0, 0.8, r);
        float outwardWave = radial * envelope * (1.0 - transitionProgress) * 1.5; // 더 강한 파동
        
        // 1.js와 동일한 리플/일래스틱 계산 (transitionProgress에 따라 극적으로 강화하고 격렬하게)
        float ripple1=noise(vUv*3.0+time*1.0)*0.07; 
        float ripple2=noise(vUv*5.0+time*0.6)*0.035; 
        float ripple3=noise(vUv*7.0+time*1.2)*0.022; 
        float totalRipple=(ripple1+ripple2+ripple3) * (1.0 + 2.0 * (1.0 - transitionProgress));
        float elastic1=elasticWave(topness*2.0+time*0.7,4.0,0.15); 
        float elastic2=elasticWave(topness*3.0+time*0.9,3.0,0.1); 
        float totalElastic=(elastic1+elastic2) * (1.0 + 1.8 * (1.0 - transitionProgress));
        
        // 1.js와 동일한 밴드/컬러 믹스 (outwardWave는 f에만 소량 가산 => 패턴 변화만)
        float blurAmount=0.012; 
        float f1=topness*1.8+phase+totalRipple+totalElastic + outwardWave*0.35; // 더 강한 파동 영향
        float f2=topness*1.8+phase+blurAmount+totalRipple*0.8+totalElastic*0.6 + outwardWave*0.25; 
        float f3=topness*1.8+phase+(blurAmount*1.5)+totalRipple*0.6+totalElastic*0.4 + outwardWave*0.15;
        
        float perturb=0.012*n2(vUv*1.5+time*0.05); vec3 w1=bandWeights(f1+perturb); vec3 w2=bandWeights(f2+perturb*0.8); vec3 w3=bandWeights(f3+perturb*0.6);
        float wobble1=0.997+0.0015*n2(vUv*2.2+time*0.06); float wobble2=0.997+0.0015*n2(vUv*2.2+time*0.06+1.7); float wobble3=0.997+0.0015*n2(vUv*2.2+time*0.06+3.1); w1*=wobble1; w2*=wobble2; w3*=wobble3;
        vec3 cY=vec3(0.80,0.40,0.70); vec3 cP=vec3(0.85,0.20,0.75); vec3 cU=vec3(0.90,0.50,0.80);
        w1*=vec3(0.18,1.0,0.95); w2*=vec3(0.18,1.0,0.95); w3*=vec3(0.18,1.0,0.95);
        vec3 flowColor1=cY*w1.x + cP*w1.y + cU*w1.z; vec3 flowColor2=cY*w2.x + cP*w2.y + cU*w2.z; vec3 flowColor3=cY*w3.x + cP*w3.y + cU*w3.z; 
        vec3 flowColor=(0.5*flowColor1 + 0.35*flowColor2 + 0.15*flowColor3);
        float mask1=clamp(w1.x+w1.y+w1.z,0.0,1.0); float mask2=clamp(w2.x+w2.y+w2.z,0.0,1.0); float mask3=clamp(w3.x+w3.y+w3.z,0.0,1.0);
        float flowMaskAvg=clamp((0.5*mask1 + 0.35*mask2 + 0.15*mask3),0.0,1.0);
        vec3 lit=base; lit=mix(lit,flowColor,flowMaskAvg*0.4);
        vec3 rippleColor=vec3(0.8,0.4,0.6)*totalRipple*0.2; vec3 elasticColor=vec3(0.8,0.3,0.7)*totalElastic*0.15; lit+=rippleColor+elasticColor;
        
        vec3 V=vec3(0.0,0.0,1.0); float fres=pow(1.0 - max(dot(N,V),0.0),2.6); vec3 rimGlow=vec3(0.8,0.3,0.7)*fres*0.3; float softHalo=smoothstep(0.34,0.10,r)*0.08; vec3 glow=rimGlow + vec3(0.8,0.4,0.8)*softHalo; lit+=glow;
        lit+=vec3(0.8,0.2,0.6)*(1.0-topness)*0.1; vec3 gray=vec3(dot(lit,vec3(0.299,0.587,0.114)));
        float loopPhase = 0.5 + 0.5 * sin(6.28318530718 * time / 7.0);
        float sat = 1.0 + 0.85 * loopPhase + (1.0 - transitionProgress) * 0.6; // 액티브 시 채도 확실히 높게
        lit = mix(gray, lit, sat);
        float brightness = 1.0 + 0.14 * loopPhase; // 밝기는 1번과 동일하게 유지
        lit *= brightness;
        float contrast = 1.0 + 0.32 * loopPhase; // 대비도 1번과 동일하게 유지
        lit = (lit - 0.5) * contrast + 0.5;

        // 상하 이동에 따른 채도/밝기 조절 (위로 갈수록 진하고, 아래로 갈수록 연하게)
        float yNorm = clamp(-camY / 0.20, -1.0, 1.0);
        float up = max(yNorm, 0.0);
        float down = max(-yNorm, 0.0);
        float satAdjMove = up * 0.45 - down * 0.40;
        float brightAdjMove = -up * 0.20 + down * 0.22;
        float contrastAdjMove = up * 0.40 - down * 0.25;

        // 줌 인/아웃에 따른 채도/밝기 조절 (줌 아웃 시 진하고, 줌 인 시 연하게)
        float zNorm = clamp((camZ - 6.0) / 0.68, -1.0, 1.0);
        float zoomOut = max(zNorm, 0.0);
        float zoomIn = max(-zNorm, 0.0);
        float satAdjZoom = zoomOut * 0.45 - zoomIn * 0.40;
        float brightAdjZoom = -zoomOut * 0.12 + zoomIn * 0.18;
        float contrastAdjZoom = zoomOut * 0.25 - zoomIn * 0.20;

        // 전체 조정값 합산
        float totalSatAdj = satAdjMove * moveActive + satAdjZoom * zoomActive;
        float totalBrightAdj = brightAdjMove * moveActive + brightAdjZoom * zoomActive;
        float totalContrastAdj = contrastAdjMove * moveActive + contrastAdjZoom * zoomActive;

        vec3 gray2 = vec3(dot(lit, vec3(0.299, 0.587, 0.114)));
        float satFactor = clamp(1.0 + totalSatAdj, 0.0, 2.0);
        lit = mix(gray2, lit, satFactor);
        lit *= (1.0 + totalBrightAdj);
        lit = (lit - 0.5) * (1.0 + totalContrastAdj) + 0.5;
        
        lit=pow(lit,vec3(0.9)); lit*=1.05; lit=mix(lit,vec3(1.0),0.02); lit=clamp(lit,0.0,1.0);
        float edgeFeather=smoothstep(0.52,0.36,r); float alpha=0.80*edgeFeather + fres*0.10; alpha=clamp(alpha,0.0,0.96);
        
        // 오퍼시티만 숨쉬듯 변동 (9번과 동일)
        float opacityWave = 0.70 + 0.25 * sin(6.28318530718 * time / 7.0);
        alpha = clamp(alpha * opacityWave, 0.0, 1.0);
        
        gl_FragColor=vec4(lit,alpha);
      }
    `,
    transparent: true,
  }), [])

  // 2초 자연스러운 트랜지션 효과
  useEffect(() => {
    setIsTransitioning(true)
    const startTime = Date.now()
    const duration = 2000 // 2초
    
    // 초기값 설정 - 처음 버튼을 누르면 1(움직임 없는 1 상태)로 시작
    setTransitionProgress(isActive ? 1 : 1)
    material.uniforms.transitionProgress.value = isActive ? 1 : 1
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // 부드러운 이징 함수 (ease-in-out cubic)
      const easedProgress = progress < 0.5 
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2
      
      // 처음 버튼을 누르면 1(움직임 없는 1 상태)에서 0(방사형 움직임)으로 전환
      const targetProgress = isActive ? 1 - easedProgress : 1
      setTransitionProgress(targetProgress)
      material.uniforms.transitionProgress.value = targetProgress
      
      // 액티브될 때 구가 살짝 줄어드는 효과
      const scaleTarget = isActive ? 0.85 : 1.0 // 액티브 시 85% 크기
      const currentScale = material.uniforms.scaleFactor.value
      const newScale = currentScale + (scaleTarget - currentScale) * 0.1 // 부드러운 스케일 전환
      material.uniforms.scaleFactor.value = newScale
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsTransitioning(false)
      }
    }
    
    requestAnimationFrame(animate)
  }, [isActive, material])

  useFrame((state, delta) => {
    material.uniforms.time.value += delta
  })

  const meshRef = useRef()
  const { camera, viewport } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])
  const radius = Math.min(v.width, v.height) * (window.innerWidth <= 768 ? 0.5 : 0.33)
  const margin = v.height * 0.035
  const yBottom = window.innerWidth <= 768 ? -v.height / 2 + radius + margin : -v.height / 2 + radius + margin

  return (
    <mesh ref={meshRef} position={[0, yBottom, 0]}>
      <sphereGeometry args={[radius, 256, 256]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}