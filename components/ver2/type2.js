import { useThree } from '@react-three/fiber'
import BlobEffect from './BlobEffect'

export default function Type2() {
  const { viewport } = useThree()

  return (
    <>
      <color attach="background" args={["#ffffff"]} />
      
      {/* 블롭들 */}
      <group position={[0, 0, -2]} renderOrder={0}>
        <BlobEffect 
          position={[-viewport.width * 0.2, viewport.height * 0.2, 0]}
          scale={0.9}
          color={[1.0, 0.0, 0.5]}
          speed={1.2}
          direction={[1, -1]}
        />
        
        <BlobEffect 
          position={[viewport.width * 0.1, 0, 0]}
          scale={1.1}
          color={[0.1, 0.1, 0.15]}
          gradientColor={[0.5, 0.3, 0.7]}
          speed={0.8}
          direction={[-1, 1]}
        />
        
        <BlobEffect 
          position={[viewport.width * 0.3, -viewport.height * 0.15, 0]}
          scale={0.8}
          color={[0.6, 0.3, 0.9]}
          speed={1}
          direction={[-1, -1]}
        />
      </group>

      {/* 조명 */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <pointLight position={[0, 0, 5]} intensity={0.5} />
    </>
  )
}