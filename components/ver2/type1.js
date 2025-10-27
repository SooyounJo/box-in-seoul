import { useThree } from '@react-three/fiber'
import LiquidGlass from './LiquidGlass'

export default function Type1() {
  const { viewport } = useThree()

  return (
    <>
      {/* 화이트 배경 */}
      <color attach="background" args={["#ffffff"]} />
      
      {/* 조명 설정 */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, 5, -5]} intensity={1.0} />
      <pointLight position={[-5, -5, -5]} intensity={1.0} color="#ff9999" />
      <pointLight position={[5, -5, 5]} intensity={1.0} color="#9999ff" />
      <pointLight position={[0, 5, 0]} intensity={1.2} />

      {/* LiquidGlass 컴포넌트 */}
      <LiquidGlass position={[0, 0, 0]} renderOrder={1000} />
    </>
  )
}