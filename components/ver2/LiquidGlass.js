import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'

const LiquidGlass = ({ position = [0, 0, 0], renderOrder = 1000 }) => {
  const { viewport, gl, scene, camera } = useThree()
  const meshRef = useRef()
  
  // 환경맵 생성
  const envMap = useMemo(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl)
    const envScene = new THREE.Scene()
    envScene.background = new THREE.Color(0xffffff)
    const texture = pmremGenerator.fromScene(envScene).texture
    pmremGenerator.dispose()
    return texture
  }, [gl])

  // 큐브 렌더 타겟 생성
  const cubeRenderTarget = useMemo(() => new THREE.WebGLCubeRenderTarget(512, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    encoding: THREE.sRGBEncoding,
  }), [])

  // 큐브 카메라 생성
  const cubeCamera = useMemo(() => new THREE.CubeCamera(0.1, 1000, cubeRenderTarget), [cubeRenderTarget])

  useEffect(() => {
    if (scene) {
      scene.environment = envMap
    }
  }, [scene, envMap])

  // 프로스트 글래스 머티리얼
  const material = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      transmission: 1.0,
      thickness: 1.5,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMap: envMap,
      envMapIntensity: 3.0,
      ior: 1.5,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true,
    })

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 }
      shader.uniforms.distortionScale = { value: 0.5 }
      shader.uniforms.refractionMap = { value: cubeRenderTarget.texture }

      shader.vertexShader = `
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vUv = uv;
        
        // 부드러운 표면 변형
        float deformation = sin(position.x * 2.0 + time) * cos(position.y * 2.0 + time) * 0.02;
        transformed += normal * deformation;
        `
      )

      shader.fragmentShader = `
        uniform float time;
        uniform float distortionScale;
        uniform samplerCube refractionMap;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        
        ${shader.fragmentShader}
      `.replace(
        '#include <transmission_fragment>',
        `
        #ifdef USE_TRANSMISSION
          float transmission = transmissionFactor;
          vec3 cameraToFrag = normalize(vWorldPosition - cameraPosition);
          vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);
          
          // 굴절 효과
          vec3 refractedRay = refract(cameraToFrag, worldNormal, 1.0 / ior);
          
          // 색수차 효과
          vec3 refractedR = refract(cameraToFrag, worldNormal, 1.0 / (ior * 0.99));
          vec3 refractedG = refract(cameraToFrag, worldNormal, 1.0 / ior);
          vec3 refractedB = refract(cameraToFrag, worldNormal, 1.0 / (ior * 1.01));
          
          vec4 envColorR = textureCube(refractionMap, refractedR);
          vec4 envColorG = textureCube(refractionMap, refractedG);
          vec4 envColorB = textureCube(refractionMap, refractedB);
          
          vec3 transmittedLight = vec3(envColorR.r, envColorG.g, envColorB.b);
          
          // 프레넬 효과
          float fresnel = pow(1.0 + dot(normalize(vNormal), normalize(vViewPosition)), 4.0);
          vec3 reflectedColor = vec3(1.0);
          
          vec3 finalColor = mix(transmittedLight, reflectedColor, fresnel * 0.3);
          totalDiffuse = mix(totalDiffuse, finalColor, transmission);
        #endif
        `
      )

      mat.userData.shader = shader
    }

    return mat
  }, [envMap])

  useFrame((state) => {
    if (!meshRef.current) return

    // 큐브맵 업데이트
    meshRef.current.visible = false
    cubeCamera.position.copy(camera.position)
    cubeCamera.update(gl, scene)
    meshRef.current.visible = true

    // 셰이더 시간 업데이트
    if (material.userData.shader) {
      material.userData.shader.uniforms.time.value = state.clock.getElapsedTime() * 0.2
    }

    // 부드러운 회전
    meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1
  })

  const radius = Math.min(viewport.width, viewport.height) * 0.3

  return (
    <mesh 
      ref={meshRef} 
      position={position}
      renderOrder={renderOrder}
    >
      <sphereGeometry args={[radius, 128, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export default LiquidGlass