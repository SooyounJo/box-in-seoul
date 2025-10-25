import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

export default function ShaderBubble10() {
  const { viewport, camera } = useThree()
  const v = viewport.getCurrentViewport(camera, [0, 0, 0])
  
  const [params, setParams] = useState({
    centerRange: 0.3,
    midRange: 0.6,
    outerRange: 0.9,
    blendStrength: 0.5
  });

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      centerRange: { value: params.centerRange },
      midRange: { value: params.midRange },
      outerRange: { value: params.outerRange },
      blendStrength: { value: params.blendStrength }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float centerRange;
      uniform float midRange;
      uniform float outerRange;
      uniform float blendStrength;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);

        vec3 centerPink = vec3(1.0, 0.75, 0.9);
        vec3 midOrange = vec3(1.0, 0.85, 0.7);
        vec3 outerPurple = vec3(0.9, 0.8, 1.0);
        
        float centerMix = smoothstep(0.0, centerRange * blendStrength, r);
        float midMix = smoothstep(centerRange, midRange * blendStrength, r);
        float outerMix = smoothstep(midRange, outerRange * blendStrength, r);
        
        vec3 color = mix(centerPink, midOrange, centerMix);
        color = mix(color, outerPurple, midMix);
        
        vec3 N = normalize(vNormal);
        vec3 V = vec3(0.0, 0.0, 1.0);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.2);
        
        float edgeFeather = smoothstep(0.52, 0.36, r);
        float alpha = 0.88 * edgeFeather + fres * 0.15;
        alpha = clamp(alpha, 0.0, 0.95);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  }), []);

  const meshRef = useRef();
  const radius = Math.min(v.width, v.height) * 0.33;

  useFrame(() => {
    if (meshRef.current) {
      material.uniforms.centerRange.value = params.centerRange;
      material.uniforms.midRange.value = params.midRange;
      material.uniforms.outerRange.value = params.outerRange;
      material.uniforms.blendStrength.value = params.blendStrength;
    }
  });

  const ParamSlider = ({ label, value, onChange }) => (
    <div style={{ marginBottom: '2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={onChange}
        style={{ width: '100%', height: '6px' }}
      />
    </div>
  );

  return (
    <group renderOrder={1000}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <sphereGeometry args={[radius, 64, 64]} />
        <primitive object={material} attach="material" />
      </mesh>
      
      <Html
        wrapperClass="shader-controls"
        style={{
          width: '80px',
          position: 'absolute',
          right: '10px',
          top: '10px',
          background: 'rgba(60, 60, 60, 0.8)',
          padding: '4px',
          borderRadius: '4px',
          fontSize: '7px',
          fontFamily: 'monospace',
          pointerEvents: 'auto',
          transform: 'scale(0.9)',
          transformOrigin: 'top right',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        distanceFactor={10}
        position={[v.width / 2 - 0.1, v.height / 2 - 0.1, 0]}
      >
        <ParamSlider
          label="Center"
          value={params.centerRange}
          onChange={(e) => setParams({...params, centerRange: parseFloat(e.target.value)})}
        />
        <ParamSlider
          label="Mid"
          value={params.midRange}
          onChange={(e) => setParams({...params, midRange: parseFloat(e.target.value)})}
        />
        <ParamSlider
          label="Outer"
          value={params.outerRange}
          onChange={(e) => setParams({...params, outerRange: parseFloat(e.target.value)})}
        />
        <ParamSlider
          label="Blend"
          value={params.blendStrength}
          onChange={(e) => setParams({...params, blendStrength: parseFloat(e.target.value)})}
        />
      </Html>
    </group>
  );
}