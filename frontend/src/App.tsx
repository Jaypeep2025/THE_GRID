import { useState, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { MapControls, Stage } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

function Model({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  // Rotate -90 degrees on X-axis to convert Z-up (Topo CAD) to Y-up (Three.js)
  return <primitive object={obj} rotation={[-Math.PI / 2, 0, 0]} />;
}

export default function App() {
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  
  const handlePinKeyPress = (val: string) => {
    setPinError('');
    if (val === 'C') {
      setPinCode('');
    } else if (val === 'submit') {
      if (pinCode === '2026') {
        alert("Maintenance Mode Activated (Mock)");
        setPinModalOpen(false);
        setPinCode('');
      } else {
        setPinError('INVALID ACCESS PIN');
        setPinCode('');
      }
    } else {
      if (pinCode.length < 4) {
        setPinCode(prev => prev + val);
      }
    }
  };

  return (
    <div className="kiosk-app">
      <div className="kiosk-panel">
        <div className="kiosk-header">
          <div>
            <div className="sys-tag">GRID Terminal Directory</div>
            <h1 className="kiosk-title">Interactive 3D Wayfinder</h1>
            <p className="kiosk-subtitle">Drag to pan across the facility map. Pinch to zoom.</p>
          </div>
          <button className="kiosk-btn kiosk-btn-white" onClick={() => setPinModalOpen(true)}>
            ⚙️ Maintenance Mode
          </button>
        </div>

        <div className="map-split-container">
          <div className="map-view-column">
            {/* logarithmicDepthBuffer helps with Z-fighting across large scale models */}
            <Canvas shadows camera={{ position: [0, 50, 100], fov: 45 }} gl={{ logarithmicDepthBuffer: true }}>
              <color attach="background" args={['#EDF2F7']} />
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
              
              <Suspense fallback={
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshStandardMaterial color="hotpink" />
                </mesh>
              }>
                {/* Disable Stage's auto-shadow plane to prevent it from overlapping and Z-fighting with the model's own terrain */}
                <Stage environment="city" intensity={0.6} shadows={false}>
                  <Model url="/models/topoexport_3D_modeling.obj" />
                </Stage>
              </Suspense>
              
              {/* MapControls maps 1-finger drag to horizontal pan, and 2-finger to zoom/rotate. */}
              {/* Locking polar angle prevents vertical tilting so the map stays at a fixed slant. */}
              <MapControls 
                makeDefault
                enableRotate={true}
                enablePan={true}
                enableZoom={true}
                minPolarAngle={Math.PI / 4} 
                maxPolarAngle={Math.PI / 4} 
              />
            </Canvas>
          </div>

          <div className="info-side-column">
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-dark)' }}>Facility Details</h2>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: '1.6' }}>
              Welcome to the central courtyard. This interactive 3D model allows you to explore the exact topological structure of the campus.
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid #CBD5E1' }} />
            <div className="legend">
               <div className="legend-item"><span className="dot yellow"></span> Main Entrance</div>
               <div className="legend-item"><span className="dot green"></span> SUV Exit Gate</div>
               <div className="legend-item"><span className="dot blue"></span> Building A (Admin)</div>
               <div className="legend-item"><span className="dot red"></span> Building C (Dining)</div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="kiosk-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: '600' }}>
              Terminal Active (Kiosk Locked Mode)
            </span>
            <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }}></div>
          </div>
        </div>
      </div>

      {pinModalOpen && (
        <div className="kiosk-alert-overlay" onClick={() => { setPinModalOpen(false); setPinCode(''); setPinError(''); }}>
          <div className="kiosk-alert-modal" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔐</div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-dark)' }}>Admin Access</h2>
              {pinError && <p style={{ fontSize: '0.85rem', color: 'var(--color-red-solid)', fontWeight: '700', marginTop: '6px' }}>{pinError}</p>}
            </div>

            <div className="pin-input-display">
              {'•'.repeat(pinCode.length) + ' '.repeat(4 - pinCode.length)}
            </div>

            <div className="pin-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button key={num} className="pin-key" onClick={() => handlePinKeyPress(num)}>
                  {num}
                </button>
              ))}
              <button className="pin-key clear" onClick={() => handlePinKeyPress('C')}>C</button>
              <button className="pin-key" onClick={() => handlePinKeyPress('0')}>0</button>
              <button className="pin-key submit" onClick={() => handlePinKeyPress('submit')}>✔</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
