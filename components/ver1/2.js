import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export default function ShaderBubble4() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      lightDir: { value: new THREE.Vector3(0.2, 0.9, 0.3).normalize() },
      ringDir: { value: new THREE.Vector3(0.08, 0.56, 0.86).normalize() },
    },
    vertexShader: `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      
      float hash(vec2 p){
        p = fract(p*vec2(123.34, 345.45));
        p += dot(p, p+34.345);
        return fract(p.x*p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i+vec2(1.0,0.0));
        float c = hash(i+vec2(0.0,1.0));
        float d = hash(i+vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      float waterDropEffect(vec3 pos, float time) {
        float drop1 = sin(time * 2.0) * 0.3 + 0.5;
        float drop2 = sin(time * 1.7 + 1.5) * 0.25 + 0.5;
        float drop3 = sin(time * 2.3 + 3.1) * 0.2 + 0.5;
        float dist1 = length(pos.xy - vec2(0.2, drop1));
        float dist2 = length(pos.xy - vec2(-0.3, drop2));
        float dist3 = length(pos.xy - vec2(0.4, drop3));
        float ripple1 = sin(dist1 * 20.0 - time * 15.0) * exp(-dist1 * 8.0) * 0.02;
        float ripple2 = sin(dist2 * 18.0 - time * 12.0) * exp(-dist2 * 6.0) * 0.015;
        float ripple3 = sin(dist3 * 22.0 - time * 18.0) * exp(-dist3 * 7.0) * 0.018;
        float shake1 = sin(time * 8.0) * exp(-dist1 * 5.0) * 0.01;
        float shake2 = sin(time * 6.0 + 1.0) * exp(-dist2 * 4.0) * 0.008;
        float shake3 = sin(time * 10.0 + 2.0) * exp(-dist3 * 6.0) * 0.012;
        return ripple1 + ripple2 + ripple3 + shake1 + shake2 + shake3;
      }
      float waterSurfaceDeform(vec3 pos, float time) {
        float wave1 = sin(pos.x * 3.0 + time * 2.0) * cos(pos.y * 2.5 + time * 1.5) * 0.015;
        float wave2 = sin(pos.x * 5.0 + time * 3.0) * cos(pos.y * 4.0 + time * 2.5) * 0.008;
        float wave3 = sin(pos.x * 7.0 + time * 4.0) * cos(pos.y * 6.0 + time * 3.5) * 0.005;
        float noise1 = noise(pos.xy * 2.0 + time * 0.5) * 0.01;
        float noise2 = noise(pos.yz * 1.5 + time * 0.7) * 0.008;
        float noise3 = noise(pos.zx * 2.5 + time * 0.9) * 0.006;
        return wave1 + wave2 + wave3 + noise1 + noise2 + noise3;
      }
      void main() {
        vUv = uv;
        vec3 pos = position;
        float dropEffect = waterDropEffect(pos, time);
        pos += normal * dropEffect;
        float surfaceDeform = waterSurfaceDeform(pos, time);
        pos += normal * surfaceDeform;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
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
      float hash(vec2 p){ p = fract(p*vec2(123.34,345.45)); p += dot(p,p+34.345); return fract(p.x*p.y);}      
      float n2(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); float a=hash(i); float b=hash(i+vec2(1.0,0.0)); float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0)); vec2 u=f*f*(3.0-2.0*f); return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);}      
      float noise(vec2 p) { return sin(p.x) * cos(p.y) + sin(p.x*2.0)*cos(p.y*2.0)*0.5; }
      float elasticWave(float x, float frequency, float amplitude){ float wave=sin(x*frequency)*amplitude; float decay=exp(-x*0.05); float bounce=sin(x*frequency*2.0)*amplitude*0.3; return (wave+bounce)*decay; }
      float bumpMove(float c,float w,float f){ float d0=abs(f-(c-1.0)); float d1=abs(f-c); float d2=abs(f-(c+1.0)); float d=min(d0,min(d1,d2)); float aa=fwidth(f)*1.2; return smoothstep(w+aa,0.0+aa,d);}      
      vec3 bandWeights(float f){ float width=0.25; float y=bumpMove(0.18,width,f); float p=bumpMove(0.52,width,f); float u=bumpMove(0.86,width,f); return vec3(y,p,u);}      
      void main(){
        vec3 N=normalize(vNormal); vec3 L=normalize(lightDir);
        vec2 p = vUv - 0.5; float r=length(p);
        float topness=clamp(dot(N,normalize(ringDir))*0.5+0.5,0.0,1.0);
        vec3 peach=vec3(1.00,0.90,0.72); vec3 pink=vec3(1.00,0.70,0.90); vec3 purple=vec3(0.82,0.68,1.00);
        vec3 base=mix(pink,peach,clamp(0.5+0.5*topness,0.0,1.0)); base=mix(base,purple,smoothstep(0.0,0.35,1.0-topness));
        float loopSec=10.0; float loopT=mod(time,loopSec)/loopSec; float phase=-loopT;
        float drop1=sin(time*2.0)*0.3+0.5; float drop2=sin(time*1.7+1.5)*0.25+0.5; float drop3=sin(time*2.3+3.1)*0.2+0.5;
        float dist1=length(vUv-vec2(0.2,drop1)); float dist2=length(vUv-vec2(-0.3,drop2)); float dist3=length(vUv-vec2(0.4,drop3));
        float ripple1=sin(dist1*20.0-time*15.0)*exp(-dist1*8.0)*0.1; float ripple2=sin(dist2*18.0-time*12.0)*exp(-dist2*6.0)*0.08; float ripple3=sin(dist3*22.0-time*18.0)*exp(-dist3*7.0)*0.09; float totalRipple=ripple1+ripple2+ripple3;
        float elastic1=elasticWave(topness*2.0+time*0.4,3.0,0.15); float elastic2=elasticWave(topness*3.0+time*0.6,2.0,0.08); float totalElastic=elastic1+elastic2;
        float blurAmount=0.01; float f1=topness*1.8+phase+totalRipple+totalElastic; float f2=topness*1.8+phase+blurAmount+totalRipple*0.8+totalElastic*0.6; float f3=topness*1.8+phase+(blurAmount*1.5)+totalRipple*0.6+totalElastic*0.4;
        float perturb=0.02*n2(vUv*1.5+time*0.05); vec3 w1=bandWeights(f1+perturb); vec3 w2=bandWeights(f2+perturb*0.8); vec3 w3=bandWeights(f3+perturb*0.6);
        float wobble1=0.997+0.003*n2(vUv*2.2+time*0.06); float wobble2=0.997+0.003*n2(vUv*2.2+time*0.06+1.7); float wobble3=0.997+0.003*n2(vUv*2.2+time*0.06+3.1); w1*=wobble1; w2*=wobble2; w3*=wobble3;
        vec3 cY=vec3(0.80,0.40,0.70); vec3 cP=vec3(0.85,0.20,0.75); vec3 cU=vec3(0.90,0.50,0.80);
        w1*=vec3(0.18,1.0,0.95); w2*=vec3(0.18,1.0,0.95); w3*=vec3(0.18,1.0,0.95);
        vec3 flowColor1=cY*w1.x + cP*w1.y + cU*w1.z; vec3 flowColor2=cY*w2.x + cP*w2.y + cU*w2.z; vec3 flowColor3=cY*w3.x + cP*w3.y + cU*w3.z; vec3 flowColor=(0.5*flowColor1 + 0.35*flowColor2 + 0.15*flowColor3);
        float mask1=clamp(w1.x+w1.y+w1.z,0.0,1.0); float mask2=clamp(w2.x+w2.y+w2.z,0.0,1.0); float mask3=clamp(w3.x+w3.y+w3.z,0.0,1.0); float flowMaskAvg=clamp((0.5*mask1 + 0.35*mask2 + 0.15*mask3),0.0,1.0);
        vec3 lit=base; lit=mix(lit,flowColor,flowMaskAvg*0.40);
        vec3 rippleColor=vec3(0.8,0.4,0.6)*totalRipple*0.2; vec3 elasticColor=vec3(0.8,0.3,0.7)*totalElastic*0.15; lit+=rippleColor+elasticColor;
        vec3 V=vec3(0.0,0.0,1.0); float fres=pow(1.0 - max(dot(N,V),0.0),2.6); vec3 rimGlow=vec3(0.8,0.3,0.7)*fres*0.3; float softHalo=smoothstep(0.34,0.10,r)*0.08; vec3 glow=rimGlow + vec3(0.8,0.4,0.8)*softHalo; lit+=glow;
        lit+=vec3(0.8,0.2,0.6)*(1.0-topness)*0.1; vec3 gray=vec3(dot(lit,vec3(0.299,0.587,0.114)));
        float loopPhase = 0.5 + 0.5 * sin(6.28318530718 * time / 7.0);
        float sat = 1.0 + 0.85 * loopPhase;
        lit = mix(gray, lit, sat);
        float brightness = 1.0 + 0.14 * loopPhase;
        lit *= brightness;
        float contrast = 1.0 + 0.32 * loopPhase;
        lit = (lit - 0.5) * contrast + 0.5;
        lit=pow(lit,vec3(0.9)); lit*=1.05; lit=mix(lit,vec3(1.0),0.02); lit=clamp(lit,0.0,1.0);
        float edgeFeather=smoothstep(0.52,0.36,r); float alpha=0.95*edgeFeather + fres*0.15; alpha=clamp(alpha,0.7,1.0);
        gl_FragColor=vec4(lit,alpha);
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

  // ver3 모달에서 항상 모바일 크기로 렌더링 (하단 잘리도록)
  const isVer3 = typeof window !== 'undefined' && window.location.pathname === '/ver3'
  const radius = Math.min(v.width, v.height) * (isVer3 ? 0.8 : 0.33)
  const margin = isVer3 ? v.height * 0.01 : v.height * 0.035
  const yBottom = 0 // 화면 중앙 배치

  return (
    <>
      <mesh ref={meshRef} position={[0, yBottom, 0]}>
        <sphereGeometry args={[radius, 256, 256]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  )
}

