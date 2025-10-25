import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble4() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      lightDir: { value: new THREE.Vector3(0.2, 0.9, 0.3).normalize() },
      ringDir: { value: new THREE.Vector3(0.08, 0.56, 0.86).normalize() },
      progress: { value: 0.0 }, // 전환 진행도
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
      uniform float progress;
      uniform vec3 lightDir;
      uniform vec3 ringDir;
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
        vec3 N=normalize(vNormal); 
        vec3 L=normalize(lightDir); 
        vec2 p=vUv-0.5; 
        float r=length(p);

        // 배경 그라데이션 색상
        vec3 gradientTop = vec3(0.95, 0.85, 0.95);    // 연한 핑크
        vec3 gradientMiddle = vec3(0.90, 0.80, 0.95); // 연한 퍼플
        vec3 gradientBottom = vec3(0.85, 0.75, 0.95);  // 더 진한 퍼플
        
        vec3 gradientColor;
        float y = vUv.y;
        if (y > 0.66) {
            gradientColor = mix(gradientMiddle, gradientTop, (y - 0.66) / 0.34);
        } else if (y > 0.33) {
            gradientColor = mix(gradientBottom, gradientMiddle, (y - 0.33) / 0.33);
        } else {
            gradientColor = mix(gradientBottom, gradientBottom, y / 0.33);
        }

        // 기본 블롭 효과 계산
        float breathing=breathingMotion(time); 
        r=r*(1.0+breathing*0.3);
        float topness=clamp(dot(N,normalize(ringDir))*0.5+0.5,0.0,1.0);
        vec3 peach=vec3(1.00,0.90,0.72); 
        vec3 pink=vec3(1.00,0.70,0.90); 
        vec3 purple=vec3(0.82,0.68,1.00);
        vec3 base=mix(pink,peach,clamp(0.5+0.5*topness,0.0,1.0)); 
        base=mix(base,purple,smoothstep(0.0,0.35,1.0-topness));

        float loopSec=10.0; 
        float loopT=mod(time,loopSec)/loopSec; 
        float phase=-loopT;
        float ripple1=noise(vUv*3.0+time*0.5)*0.05; 
        float ripple2=noise(vUv*5.0+time*0.3)*0.025; 
        float ripple3=noise(vUv*7.0+time*0.7)*0.015; 
        float totalRipple=ripple1+ripple2+ripple3;
        float elastic1=elasticWave(topness*2.0+time*0.4,3.0,0.08); 
        float elastic2=elasticWave(topness*3.0+time*0.6,2.0,0.04); 
        float totalElastic=elastic1+elastic2;

        float blurAmount=0.01; 
        float f1=topness*1.8+phase+totalRipple+totalElastic; 
        float f2=topness*1.8+phase+blurAmount+totalRipple*0.8+totalElastic*0.6; 
        float f3=topness*1.8+phase+(blurAmount*1.5)+totalRipple*0.6+totalElastic*0.4;
        
        float perturb=0.01*n2(vUv*1.5+time*0.05); 
        vec3 w1=bandWeights(f1+perturb); 
        vec3 w2=bandWeights(f2+perturb*0.8); 
        vec3 w3=bandWeights(f3+perturb*0.6);
        
        float wobble1=0.997+0.001*n2(vUv*2.2+time*0.06); 
        float wobble2=0.997+0.001*n2(vUv*2.2+time*0.06+1.7); 
        float wobble3=0.997+0.001*n2(vUv*2.2+time*0.06+3.1); 
        w1*=wobble1; w2*=wobble2; w3*=wobble3;
        
        vec3 cY=vec3(0.80,0.40,0.70); 
        vec3 cP=vec3(0.85,0.20,0.75); 
        vec3 cU=vec3(0.90,0.50,0.80);
        w1*=vec3(0.18,1.0,0.95); 
        w2*=vec3(0.18,1.0,0.95); 
        w3*=vec3(0.18,1.0,0.95);
        
        vec3 flowColor1=cY*w1.x + cP*w1.y + cU*w1.z; 
        vec3 flowColor2=cY*w2.x + cP*w2.y + cU*w2.z; 
        vec3 flowColor3=cY*w3.x + cP*w3.y + cU*w3.z; 
        vec3 flowColor=(0.5*flowColor1 + 0.35*flowColor2 + 0.15*flowColor3);
        
        float mask1=clamp(w1.x+w1.y+w1.z,0.0,1.0); 
        float mask2=clamp(w2.x+w2.y+w2.z,0.0,1.0); 
        float mask3=clamp(w3.x+w3.y+w3.z,0.0,1.0); 
        float flowMaskAvg=clamp((0.5*mask1 + 0.35*mask2 + 0.15*mask3),0.0,1.0);
        
        vec3 lit=base; 
        lit=mix(lit,flowColor,flowMaskAvg*0.4);
        vec3 rippleColor=vec3(0.8,0.4,0.6)*totalRipple*0.2; 
        vec3 elasticColor=vec3(0.8,0.3,0.7)*totalElastic*0.15; 
        lit+=rippleColor+elasticColor;
        
        vec3 V=vec3(0.0,0.0,1.0); 
        float fres=pow(1.0 - max(dot(N,V),0.0), 2.2);
        vec3 rimGlow=vec3(0.8,0.3,0.7)*fres*0.4;
        float softHalo=smoothstep(0.4, 0.1, r)*0.12;
        vec3 glow=rimGlow + vec3(0.8,0.4,0.8)*softHalo;
        lit+=glow;

        // 블롭과 그라데이션 사이의 전환
        vec3 finalColor = mix(lit, gradientColor, progress);
        
        // 알파값 계산 - 블롭이 페이드아웃되면서 그라데이션이 페이드인
        float edgeFeather = smoothstep(0.52, 0.36, r);
        float alpha;
        if (progress < 0.5) {
            // 블롭 상태일 때의 알파값
            alpha = (0.88 * edgeFeather + fres * 0.15) * (1.0 - progress * 2.0);
            alpha = clamp(alpha, 0.0, 0.95);
        } else {
            // 그라데이션 상태일 때는 완전 불투명으로 전환
            alpha = mix(0.0, 1.0, (progress - 0.5) * 2.0);
        }
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
  }), [])

  // 자동 전환을 위한 시간 추적
  const timeRef = useRef(0)
  const cycleTime = 10.0 // 전체 사이클 시간
  const transitionTime = 4.0 // 전환 시간
  const holdTime = 2.0 // 유지 시간

  useFrame((state, delta) => {
    material.uniforms.time.value += delta
    
    // 전환 진행도 업데이트
    timeRef.current = (timeRef.current + delta) % cycleTime
    let progress
    if (timeRef.current < transitionTime) {
      // 블롭 → 그라데이션 전환
      progress = timeRef.current / transitionTime
    } else if (timeRef.current < transitionTime + holdTime) {
      // 그라데이션 상태 유지
      progress = 1.0
    } else if (timeRef.current < transitionTime * 2 + holdTime) {
      // 그라데이션 → 블롭 전환
      progress = 1.0 - (timeRef.current - (transitionTime + holdTime)) / transitionTime
    } else {
      // 블롭 상태 유지
      progress = 0.0
    }
    material.uniforms.progress.value = progress
  })

  const meshRef = useRef()
  const { camera, viewport } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])
  const radius = Math.min(v.width, v.height) * 0.33 // 3번과 동일한 크기
  const margin = v.height * 0.035
  const yBottom = 0 // 화면 중앙 배치

  return (
    <mesh ref={meshRef} position={[0, yBottom, 0]}>
      <sphereGeometry args={[radius, 256, 256]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}