import { useState, useEffect } from 'react'
import Head from 'next/head'
import { Canvas } from '@react-three/fiber'
import ShaderBubble from '../components/ver1/1'
import ShaderBubble2 from '../components/ver1/2'
import ShaderBubble3 from '../components/ver1/3'
import ShaderBubble4 from '../components/ver1/4'
import ShaderBubble5 from '../components/ver1/5'
import ShaderBubble6 from '../components/ver1/6'
import ShaderBubble7 from '../components/ver1/7'
import ShaderBubble8 from '../components/ver1/8'
import ShaderBubble9 from '../components/ver1/9'
import ShaderBubble10 from '../components/ver1/10'
import ShaderBubble11 from '../components/ver1/11'
import Type1 from '../components/ver2/type1'
import Type2 from '../components/ver2/type2'
import Type3 from '../components/ver2/type3'
import LG1 from '../components/ver3/lg1'
import LG2 from '../components/ver3/lg2'
import LG3 from '../components/ver3/lg3'
import LG4 from '../components/ver3/lg4'
import LG5 from '../components/ver3/lg5'
import ShaderBubble22 from '../components/ver1/2.2'
import { useRouter } from 'next/router'

export default function Home() {
  const [selectedVersion, setSelectedVersion] = useState('ver1')
  const [selectedStyle, setSelectedStyle] = useState(1)
  const [isActive6, setIsActive6] = useState(false)
  const [isActive7, setIsActive7] = useState(false)
  const [transition6, setTransition6] = useState(0)
  const [transition7, setTransition7] = useState(0)
  const router = useRouter()

  useEffect(() => {
    let startTime = Date.now()
    const totalCycleTime = 14000
    const activeTime = 5000
    const transitionTime = 2000

    const updateTransitions = () => {
      const currentTime = Date.now()
      const elapsedTime = (currentTime - startTime) % totalCycleTime

      if (elapsedTime < activeTime) {
        setTransition6(1)
        setTransition7(1)
        setIsActive6(true)
        setIsActive7(true)
      } else if (elapsedTime < (activeTime + transitionTime)) {
        const t = (elapsedTime - activeTime) / transitionTime
        setTransition6(1 - t)
        setTransition7(1 - t)
        setIsActive6(true)
        setIsActive7(true)
      } else if (elapsedTime < (activeTime + transitionTime + activeTime)) {
        setTransition6(0)
        setTransition7(0)
        setIsActive6(false)
        setIsActive7(false)
      } else {
        const t = (elapsedTime - (activeTime + transitionTime + activeTime)) / transitionTime
        setTransition6(t)
        setTransition7(t)
        setIsActive6(false)
        setIsActive7(false)
      }
    }

    const intervalId = setInterval(updateTransitions, 16)
    return () => clearInterval(intervalId)
  }, [])

  const handleVersionChange = (version) => {
    setSelectedVersion(version)
    if (version === 'ver1') {
      setSelectedStyle(1)
    } else if (version === 'ver2') {
      setSelectedStyle('type2')  // type1 대신 type2로 변경
    } else if (version === 'ver3') {
      setSelectedStyle('lg1')
    }
    setIsActive6(false)
    setIsActive7(false)
  }

  const handleStyleChange = (style) => {
    setSelectedStyle(style)
    if (style === 6) {
      setIsActive6(false)
    } else if (style === 7) {
      setIsActive7(false)
    }
  }

  useEffect(() => {
    if (router.query.style) {
      const style = parseInt(router.query.style)
      if ((style >= 1 && style <= 9) || style === 22) {
        setSelectedStyle(style)
      }
    }
  }, [router.query.style])

  return (
    <>
      <Head>
        <title>Shader Bubble</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app-container">
        <div className="version-selector">
          <button 
            className={`version-btn ${selectedVersion === 'ver1' ? 'active' : ''}`}
            onClick={() => handleVersionChange('ver1')}
          >
            Ver.1
          </button>
          <button 
            className={`version-btn ${selectedVersion === 'ver2' ? 'active' : ''}`}
            onClick={() => handleVersionChange('ver2')}
          >
            Ver.2
          </button>
        </div>

        <div className="canvas-container">
          <Canvas 
            className="r3f-canvas"
            dpr={[1, 3]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 6], fov: 50 }}
          >
            <color attach="background" args={[selectedVersion === 'ver3' ? "#000000" : "#f4ffd8"]} />
            <ambientLight intensity={0.3} />
            <directionalLight position={[2, 3, 2]} intensity={0.5} />
            {selectedStyle === 1 ? <ShaderBubble /> : 
             selectedStyle === 2 ? <ShaderBubble2 /> : 
             selectedStyle === 22 ? <ShaderBubble22 /> :
             selectedStyle === 3 ? <ShaderBubble3 /> : 
             selectedStyle === 4 ? <ShaderBubble4 /> : 
             selectedStyle === 5 ? <ShaderBubble5 /> : 
             selectedStyle === 6 ? <ShaderBubble6 isActive={isActive6} transition={transition6} /> :
             selectedStyle === 7 ? <ShaderBubble7 isActive={isActive7} transition={transition7} /> :
             selectedStyle === 8 ? <ShaderBubble8 /> :
             selectedStyle === 9 ? <ShaderBubble9 /> :
             selectedStyle === 10 ? <ShaderBubble10 /> :
             selectedStyle === 11 ? <ShaderBubble11 /> :
             selectedStyle === 'type1' ? <Type1 /> :
             selectedStyle === 'type2' ? <Type2 /> :
             selectedStyle === 'type3' ? <Type3 /> :
             selectedStyle === 'lg1' ? <LG1 /> :
             selectedStyle === 'lg2' ? <LG2 /> :
             selectedStyle === 'lg3' ? <LG3 /> :
             selectedStyle === 'lg4' ? <LG4 /> :
             selectedStyle === 'lg5' ? <LG5 /> :
             <ShaderBubble />}
          </Canvas>
          
          {/* 버튼별 제목 표시 */}
          {selectedVersion === 'ver1' && selectedStyle === 1 && (
            <div className="title-overlay">
              <h1 className="style-title">Main State</h1>
            </div>
          )}
          {selectedVersion === 'ver1' && selectedStyle === 2 && (
            <div className="title-overlay">
              <h1 className="style-title">Speaking</h1>
            </div>
          )}
          {selectedVersion === 'ver1' && selectedStyle === 22 && (
            <div className="title-overlay">
              <h1 className="style-title">Speaking v2</h1>
            </div>
          )}
          {selectedVersion === 'ver1' && selectedStyle === 3 && (
            <div className="title-overlay">
              <h1 className="style-title">Thinking</h1>
            </div>
          )}
          {selectedVersion === 'ver1' && selectedStyle === 4 && (
            <div className="title-overlay">
              <h1 className="style-title">Zoom In/Out</h1>
            </div>
          )}
          {selectedVersion === 'ver1' && selectedStyle === 5 && (
            <div className="title-overlay">
              <h1 className="style-title">Up and Down</h1>
            </div>
          )}
          {selectedVersion === 'ver1' && selectedStyle === 6 && (
             <div className="title-overlay">
               <h1 className="style-title">Speaking Transition</h1>
             </div>
          )}
          {selectedVersion === 'ver1' && selectedStyle === 7 && (
             <div className="title-overlay">
               <h1 className="style-title">Thinking Transition</h1>
             </div>
          )}
          {selectedVersion === 'ver1' && selectedStyle === 8 && (
            <div className="title-overlay">
              <h1 className="style-title">Tube Form</h1>
            </div>
          )}
          {selectedVersion === 'ver1' && selectedStyle === 9 && (
            <div className="title-overlay">
              <h1 className="style-title">Donut Basic</h1>
            </div>
          )}
          {selectedVersion === 'ver2' && selectedStyle === 'type1' && (
             <div className="title-overlay">
               <h1 className="style-title">Type 1</h1>
             </div>
           )}
          {selectedVersion === 'ver2' && selectedStyle === 'type2' && (
             <div className="title-overlay">
               <h1 className="style-title">Type 2</h1>
             </div>
           )}
          {selectedVersion === 'ver2' && selectedStyle === 'type3' && (
             <div className="title-overlay">
               <h1 className="style-title">Type 3</h1>
             </div>
           )}
          {selectedVersion === 'ver3' && selectedStyle === 'lg1' && (
             <div className="title-overlay">
               <h1 className="style-title light-title">Light 1</h1>
             </div>
           )}
          {selectedVersion === 'ver3' && selectedStyle === 'lg2' && (
             <div className="title-overlay">
               <h1 className="style-title light-title">Light 2</h1>
             </div>
           )}
          {selectedVersion === 'ver3' && selectedStyle === 'lg3' && (
             <div className="title-overlay">
               <h1 className="style-title light-title">Light 3</h1>
             </div>
           )}
          {selectedVersion === 'ver3' && selectedStyle === 'lg4' && (
             <div className="title-overlay">
               <h1 className="style-title light-title">Light 4</h1>
             </div>
           )}
          {selectedVersion === 'ver3' && selectedStyle === 'lg5' && (
             <div className="title-overlay">
               <h1 className="style-title light-title">Light 5</h1>
             </div>
           )}
        </div>

        {/* 하단 버튼 - 버전에 따라 조건부 표시 */}
        {selectedVersion === 'ver1' && (
          <div className="version-switcher-bottom" role="navigation" aria-label="Style Switcher ver1">
            {[1, 2, 22, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
              <button
                key={num}
                className={`ver-button ${selectedStyle === num ? 'active' : ''} ${num === 6 || num === 7 ? 'red-button' : ''} ${num === 4 || num === 5 ? 'blue-button' : ''}`}
                onClick={() => handleStyleChange(num)}
              >
                {num === 22 ? '2.2' : num}
              </button>
            ))}
          </div>
        )}

        {selectedVersion === 'ver2' && (
          <div className="version-switcher-bottom ver2-buttons" role="navigation" aria-label="Style Switcher ver2">
            {['type1', 'type2', 'type3'].map((type) => (
              <button
                key={type}
                className={`ver-button ${selectedStyle === type ? 'active' : ''}`}
                onClick={() => handleStyleChange(type)}
              >
                {type.replace('type', 'T')}
              </button>
            ))}
          </div>
        )}

        {selectedVersion === 'ver3' && (
          <div className="version-switcher-bottom ver3-buttons" role="navigation" aria-label="Style Switcher ver3">
            {['lg1', 'lg2', 'lg3', 'lg4', 'lg5'].map((lg) => (
              <button
                key={lg}
                className={`ver-button ${selectedStyle === lg ? 'active' : ''}`}
                onClick={() => handleStyleChange(lg)}
              >
                {lg.replace('lg', 'L')}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .app-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .version-selector {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .version-btn {
          padding: 8px 16px;
          background: #ffffff;
          color: #333333;
          border: 2px solid #e0e0e0;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          min-width: 80px;
        }

        .version-btn:hover {
          background: #f5f5f5;
          border-color: #d0d0d0;
          transform: translateY(-1px);
        }

        .version-btn.active {
          background: #333333;
          color: white;
          border-color: #222222;
          border-radius: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .canvas-container {
          flex: 1;
          position: relative;
        }

        .red-button {
          background: #ff9999 !important;
          color: white !important;
        }

        .red-button:hover {
          background: #ff7777 !important;
        }

        .red-button.active {
          background: #ff0000 !important;
          box-shadow: 0 0 15px rgba(255, 0, 0, 0.7);
        }

        .blue-button {
          background: #87ceeb !important;
          color: white !important;
        }

        .blue-button:hover {
          background: #5dade2 !important;
        }

        .blue-button.active {
          background: #0077be !important;
          box-shadow: 0 0 15px rgba(0, 119, 190, 0.7);
        }

        .ver2-buttons {
          margin-top: 10px;
        }

        .ver2-buttons .ver-button {
          background: #98fb98 !important;
          color: #000000 !important;
        }

        .ver2-buttons .ver-button:hover {
          background: #90ee90 !important;
        }

        .ver2-buttons .ver-button.active {
          background: #32cd32 !important;
          box-shadow: 0 0 15px rgba(50, 205, 50, 0.7);
        }

        .ver3-buttons {
          margin-top: 10px;
        }

        .ver3-buttons .ver-button {
          background: #ffd700 !important;
          color: #000000 !important;
        }

        .ver3-buttons .ver-button:hover {
          background: #ffed4e !important;
        }

        .ver3-buttons .ver-button.active {
          background: #ff8c00 !important;
          box-shadow: 0 0 15px rgba(255, 140, 0, 0.7);
        }

        .title-overlay {
          position: absolute;
          top: 45px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 5;
        }

        .style-title {
          color: #000000;
          font-family: 'Poppins', sans-serif;
          font-weight: 300;
          font-size: 1.2rem;
          margin: 0;
          text-align: center;
          letter-spacing: 0.02em;
        }

        .light-title {
          color: #ffffff;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .r3f-canvas {
          width: 100% !important;
          height: 100% !important;
        }

        @media (max-width: 768px) {
          .app-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          
          .canvas-container {
            flex: 1;
            width: 100%;
            height: 100%;
          }
          
          .version-selector {
            top: 10px;
            left: 10px;
            gap: 8px;
          }
          
          .version-btn {
            padding: 8px 14px;
            font-size: 12px;
            min-width: 65px;
          }
          
          .style-title {
            font-size: 1rem;
          }
          .title-overlay {
            top: 40px;
          }
        }

        @media (max-width: 480px) {
          .style-title {
            font-size: 0.9rem;
          }
          .title-overlay {
            top: 35px;
          }
        }
      `}</style>
    </>
  )
}