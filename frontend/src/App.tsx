import { useState, Suspense, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Html, useProgress } from '@react-three/drei';
import { OBJLoader } from 'three-stdlib';
import './App.css';

// Room Directory Data
const ROOMS = [
  { id: 'principal', name: "Principal's Office", building: "Building A (Admin)", floor: "Ground Floor", type: "Admin" },
  { id: 'registrar', name: "Registrar", building: "Building A (Admin)", floor: "Ground Floor", type: "Office" },
  { id: 'cashier', name: "Cashier", building: "Building A (Admin)", floor: "Ground Floor", type: "Office" },
  { id: 'scilab', name: "Science Laboratory", building: "Building C", floor: "2nd Floor", type: "Lab" },
  { id: 'library', name: "Library", building: "Building C", floor: "1st Floor", type: "Facility" },
  { id: 'complab', name: "Computer Laboratory", building: "Building B", floor: "2nd Floor", type: "Lab" },
  { id: 'clinic', name: "School Clinic", building: "Building A (Admin)", floor: "Ground Floor", type: "Facility" },
  { id: 'guidance', name: "Guidance Office", building: "Building A (Admin)", floor: "Ground Floor", type: "Office" },
  { id: 'gate1', name: "Main Entrance (Gate 1)", building: "Outdoors", floor: "1st Floor", type: "Entrance" },
  { id: 'gate2', name: "SUV Exit (Gate 2)", building: "Outdoors", floor: "1st Floor", type: "Exit" },
];

// Queuing Office/Service Data
const OFFICES = [
  { id: 'Form137', name: 'Request of Form 137', prefix: 'F137', desc: 'Official student permanent record request' },
  { id: 'Form136', name: 'Form 136 (Report Card)', prefix: 'F136', desc: 'Student report card request' },
  { id: 'AcademicRecords', name: 'Academic Records (Transcripts)', prefix: 'ACAD', desc: 'Transcripts, grades, and school records' },
  { id: 'Certifications', name: 'Certifications (Good Moral Character)', prefix: 'CERT', desc: 'Certificate of Good Moral Character' },
  { id: 'AdminPermissions', name: 'Administrative Permissions (Parental Consent for Events)', prefix: 'ADM', desc: 'Parental consent for events and activities' },
  { id: 'ClearanceTransfer', name: 'Clearance/Transfer Forms', prefix: 'CLR', desc: 'Clearance sheets, honorable dismissal, and transfers' }
];

function Model({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  // Rotate -90 degrees on X-axis to convert Z-up (Topo CAD) to Y-up (Three.js)
  return <primitive object={obj} rotation={[-Math.PI / 2, 0, 0]} />;
}

function CanvasLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="canvas-loader-container">
        <div className="tech-ring"></div>
        <div className="loader-text">INITIALIZING... {progress.toFixed(0)}%</div>
      </div>
    </Html>
  );
}

export default function App() {
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [isInteractive, setIsInteractive] = useState(false);

  // New Interactive Panel States
  const [menuState, setMenuState] = useState<'main' | 'find-room' | 'get-ticket' | 'view-ticket'>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<typeof ROOMS[0] | null>(null);
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [generatedTicketNo, setGeneratedTicketNo] = useState<number | null>(null);
  const [generatedOfficeNames, setGeneratedOfficeNames] = useState<string[]>([]);
  const [ticketTimestamp, setTicketTimestamp] = useState<string>('');
  const [scannedStudent, setScannedStudent] = useState<{
    name: string;
    idNumber: string;
    fathersName: string;
    className: string;
    classRoll: string;
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [isShaking, setIsShaking] = useState(false);
  const [lang, setLang] = useState('EN');
  const [time, setTime] = useState(new Date());
  const [ripples, setRipples] = useState<{ x: number, y: number, id: number }[]>([]);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  // Generate random particles once on mount
  const [particles] = useState(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    animationDuration: 15 + Math.random() * 25,
    animationDelay: Math.random() * 20,
    size: 2 + Math.random() * 4
  })));

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Idle timeout logic
  useEffect(() => {
    if (!isInteractive) {
      setShowIdleWarning(false);
      return;
    }

    let idleTimer: ReturnType<typeof setTimeout>;
    let resetTimer: ReturnType<typeof setTimeout>;

    const resetIdle = () => {
      setShowIdleWarning(false);
      clearTimeout(idleTimer);
      clearTimeout(resetTimer);

      // Show warning after 45 seconds of inactivity
      idleTimer = setTimeout(() => {
        setShowIdleWarning(true);
        // Reset completely after 15 more seconds
        resetTimer = setTimeout(() => {
          setIsInteractive(false);
          setShowIdleWarning(false);
        }, 15000);
      }, 45000);
    };

    resetIdle();

    const events = ['mousedown', 'touchstart', 'keydown', 'wheel'];
    const handleActivity = () => resetIdle();
    events.forEach(e => window.addEventListener(e, handleActivity));

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(resetTimer);
      events.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [isInteractive]);

  // Delayed reset when exiting interactive mode to allow smooth slide-out animation
  useEffect(() => {
    if (!isInteractive) {
      const timer = setTimeout(() => {
        setMenuState('main');
        setSelectedRoom(null);
        setSelectedOfficeIds([]);
        setGeneratedTicketNo(null);
        setGeneratedOfficeNames([]);
        setScannedStudent(null);
        setSearchQuery('');
        setIsScanning(false);
      }, 1200); // matches the 1.2s panel slide-out transition
      return () => clearTimeout(timer);
    }
  }, [isInteractive]);

  const timeString = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateString = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const handleScreenClick = (e: React.MouseEvent) => {
    // Exclude clicks from buttons/inputs if needed, but for a global ripple this is fine.
    const newRipple = { x: e.clientX, y: e.clientY, id: Date.now() };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 1000);
  };

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
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      }
    } else {
      if (pinCode.length < 4) {
        setPinCode(prev => prev + val);
      }
    }
  };

  const handleToggleOffice = (officeId: string) => {
    setSelectedOfficeIds(prev =>
      prev.includes(officeId)
        ? prev.filter(id => id !== officeId)
        : [...prev, officeId]
    );
  };

  const handleScanMockID = () => {
    if (scannedStudent) {
      setScannedStudent(null);
    } else {
      setIsScanning(true);
      setTimeout(() => {
        setScannedStudent({
          name: 'Juan Dela Cruz',
          idNumber: 'DMH-26-0024',
          fathersName: 'Juan Dela Cruz Sr.',
          className: 'Grade 12 - Einstein',
          classRoll: '0024'
        });
        setIsScanning(false);
      }, 1000);
    }
  };

  const handleReviewTickets = () => {
    if (selectedOfficeIds.length === 0) return;

    const officeNames = selectedOfficeIds
      .map(id => OFFICES.find(o => o.id === id)?.name || '')
      .filter(Boolean);

    const randomNum = Math.floor(Math.random() * 900) + 100;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    setGeneratedTicketNo(randomNum);
    setGeneratedOfficeNames(officeNames);
    setTicketTimestamp(`${formattedDate} ${formattedTime}`);
    setMenuState('view-ticket');
  };

  const handlePrintTicket = () => {
    const displayName = scannedStudent ? scannedStudent.name : 'Juan Dela Cruz';
    alert(`Ticket #${generatedTicketNo} printed successfully for ${displayName}!`);
    setMenuState('main');
    setGeneratedTicketNo(null);
    setGeneratedOfficeNames([]);
    setSelectedOfficeIds([]);
    setScannedStudent(null);
  };

  const filteredRooms = ROOMS.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.building.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`kiosk-app-container ${isInteractive ? 'interactive-mode' : ''}`} onClick={handleScreenClick}>
      {/* Background Particles */}
      <div className="particles-container">
        {particles.map(p => (
          <div key={p.id} className="particle" style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.animationDuration}s`,
            animationDelay: `-${p.animationDelay}s`
          }} />
        ))}
      </div>

      {/* Ripple Effect Overlays */}
      {ripples.map(r => (
        <span key={r.id} className="ripple" style={{ left: r.x, top: r.y }}></span>
      ))}

      {/* Attract Mode Overlay */}
      <div className="attract-mode-overlay" onClick={() => setIsInteractive(true)} />

      {/* Top Left Brand */}
      <div className="top-brand">
        <div className="brand-icon">⬡</div>
        <div>
          <div className="brand-text">
            GRID: An Integrated IoT-Based Facility & Queuing Management<br />
            (Guided Room Information Directory)
          </div>
          <div className="iot-status-container">
            <span className="iot-status"><span className="status-dot green"></span> RFID Connected</span>
            <span className="iot-status"><span className="status-dot green"></span> MCU Online</span>
          </div>
        </div>
      </div>

      {/* Top Right Widget */}
      <div className="top-right-widget">
        {timeString} <span className="widget-divider">|</span> {dateString} <span className="widget-divider">|</span> PATEROS 🌤️
      </div>

      <div className="hero-split">
        {/* Left Side: 3D Orbit Model */}
        <div className="hero-canvas-col">
          <Canvas shadows camera={{ position: [0, 50, 100], fov: 45 }} gl={{ logarithmicDepthBuffer: true, alpha: true }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

            <Suspense fallback={<CanvasLoader />}>
              <Stage environment="city" intensity={0.6} shadows={false}>
                <Model url="/models/topoexport_3D_modeling.obj" />
              </Stage>
            </Suspense>

            <OrbitControls
              makeDefault
              enableRotate={true}
              enablePan={false}
              enableZoom={true}
              enableDamping={true}
              dampingFactor={0.05}
              autoRotate={!isInteractive}
              autoRotateSpeed={0.8}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 4}
            />
          </Canvas>
        </div>

        {/* Right Side: Text & Prompt */}
        <div className="hero-text-col">
          <h1 className="hero-title" onClick={(e) => { e.stopPropagation(); if (isInteractive) setIsInteractive(false); }} title={isInteractive ? "Click to return" : ""}>
            Welcome to <span className="title-break"></span>
            President Diosdado <span className="title-break"></span>
            Macapagal High School
          </h1>

          <div className="hero-touch-prompt" onClick={(e) => { e.stopPropagation(); setIsInteractive(true); }}>
            Touch screen<br />
            to interact <span className="touch-icon"></span>
          </div>

          <div className="rfid-scan-prompt">
            <div className="rfid-animation-container">
              <span className="rfid-card">💳</span>
            </div>
            <span>...or tap your student ID<br />card to log attendance.</span>
          </div>
        </div>
      </div>

      {/* Floating Interactive Panel */}
      <div className="interactive-panel">
        {menuState === 'main' && (
          <div className="panel-content fade-in">
            <h2 className="panel-title">Navigation & Services</h2>
            <p className="panel-subtitle">Select an option to begin using the Kiosk.</p>

            <div className="menu-options">
              <button className="menu-card" onClick={() => setMenuState('find-room')}>
                <div className="card-info">
                  <div className="card-title">Find a Room</div>
                  <div className="card-desc">View directories & locate rooms on the 3D map</div>
                </div>
              </button>

              <button className="menu-card" onClick={() => { setMenuState('get-ticket'); setSelectedOfficeIds([]); }}>
                <div className="card-info">
                  <div className="card-title">Request forms & certifications</div>
                  <div className="card-desc">Request Form 137, Form 136, Academic Records, Certifications, etc.</div>
                </div>
              </button>
            </div>

            <div className="student-id-scanner-section">
              <div className="scanner-label">Student ID Scanner</div>
              <div
                className={`id-card-scanner ${scannedStudent ? 'has-card' : ''} ${isScanning ? 'scanning' : ''}`}
                onClick={handleScanMockID}
              >
                {isScanning && (
                  <div className="scanning-ray-container">
                    <div className="scanning-ray"></div>
                    <div className="scanning-text">Reading RFID Chip...</div>
                  </div>
                )}

                {!isScanning && !scannedStudent && (
                  <div className="scanner-placeholder">
                    <div className="sensor-target">
                      <div className="sensor-wave ring-1"></div>
                      <div className="sensor-wave ring-2"></div>
                      <div className="sensor-center"></div>
                    </div>
                    <div className="scanner-prompt">TAP STUDENT ID HERE</div>
                    <div className="scanner-subprompt">Click to simulate tapping RFID card</div>
                  </div>
                )}

                {!isScanning && scannedStudent && (
                  <div className="scanned-id-card-container fade-in">
                    <div className="scanned-id-card-visual">
                      {/* Left curved decoration swoop */}
                      <svg className="id-card-decor-left" viewBox="0 0 30 400" preserveAspectRatio="none">
                        <path d="M0,0 L20,0 C5,130 5,270 20,400 L0,400 Z" fill="#5B21B6" />
                        <path d="M20,0 C5,130 5,270 20,400" fill="none" stroke="#0D9488" strokeWidth="3" />
                      </svg>

                      {/* Right curved decoration swoop */}
                      <svg className="id-card-decor-right" viewBox="0 0 30 400" preserveAspectRatio="none">
                        <path d="M30,0 L10,0 C25,130 25,270 10,400 L30,400 Z" fill="#5B21B6" />
                        <path d="M10,0 C25,130 25,270 10,400" fill="none" stroke="#0D9488" strokeWidth="3" />
                      </svg>

                      {/* School Emblem / Logo */}
                      <div className="id-school-logo-container">
                        <svg className="id-school-logo" viewBox="0 0 100 100" width="52" height="52">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#5B21B6" strokeWidth="2" />
                          <circle cx="50" cy="50" r="39" fill="none" stroke="#5B21B6" strokeWidth="1" strokeDasharray="2,2" />
                          <circle cx="50" cy="50" r="32" fill="none" stroke="#5B21B6" strokeWidth="1.5" />
                          <path id="textPathTop" d="M 18 50 A 32 32 0 0 1 82 50" fill="none" />
                          <text fontFamily="Outfit" fontSize="7.5" fontWeight="800" fill="#5B21B6" textAnchor="middle">
                            <textPath href="#textPathTop" startOffset="50%">DIOSDADO MACAPAGAL HS</textPath>
                          </text>
                          <path id="textPathBottom" d="M 82 50 A 32 32 0 0 1 18 50" fill="none" />
                          <text fontFamily="Outfit" fontSize="7.5" fontWeight="800" fill="#5B21B6" textAnchor="middle">
                            <textPath href="#textPathBottom" startOffset="50%">ESTD. 2005</textPath>
                          </text>
                          <g fill="none" stroke="#5B21B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M50,58 C43,53 38,53 30,56 L30,45 C38,42 43,42 50,47 Z" fill="#5B21B6" fillOpacity="0.1" />
                            <path d="M50,58 C57,53 62,53 70,56 L70,45 C62,42 57,42 50,47 Z" fill="#5B21B6" fillOpacity="0.1" />
                            <line x1="50" y1="47" x2="50" y2="58" />
                          </g>
                        </svg>
                      </div>

                      {/* School Name */}
                      <div className="id-school-name">DIOSDADO MACAPAGAL HS</div>

                      {/* Student Photo with Teal Border */}
                      <div className="id-photo-container">
                        <img src="/student_id_photo.png" className="id-photo" alt="Student Portrait" />
                      </div>

                      {/* Student ID Code */}
                      <div className="id-number-row">
                        <span className="id-label">STUDENT ID: </span>
                        <span className="id-val">{scannedStudent.idNumber}</span>
                      </div>

                      {/* Student Name */}
                      <div className="id-student-name">{scannedStudent.name.toUpperCase()}</div>

                      {/* Student Details Grid */}
                      <div className="id-details-grid">
                        <div className="detail-row-col">Father's Name</div>
                        <div className="detail-row-col">:</div>
                        <div className="detail-row-col value">{scannedStudent.fathersName}</div>

                        <div className="detail-row-col">Class Name</div>
                        <div className="detail-row-col">:</div>
                        <div className="detail-row-col value">{scannedStudent.className}</div>

                        <div className="detail-row-col">Class Roll</div>
                        <div className="detail-row-col">:</div>
                        <div className="detail-row-col value">{scannedStudent.classRoll}</div>
                      </div>
                    </div>
                    <div className="click-to-eject-tip">Click card to eject</div>
                  </div>
                )}
              </div>
            </div>

            <button className="panel-back-btn exit" onClick={() => setIsInteractive(false)}>
              Exit Interactive Mode
            </button>
          </div>
        )}

        {menuState === 'find-room' && (
          <div className="panel-content fade-in">
            <div className="panel-header">
              <button className="back-arrow" onClick={() => { setMenuState('main'); setSelectedRoom(null); }}>←</button>
              <h2 className="panel-title">Find a Room</h2>
            </div>
            <p className="panel-subtitle">Search or select a room to highlight on the directory.</p>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search room or building..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="directory-list">
              {filteredRooms.map(room => (
                <div
                  key={room.id}
                  className={`directory-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
                  onClick={() => setSelectedRoom(room)}
                >
                  <div className="item-main">
                    <div className="item-name">{room.name}</div>
                    <div className="item-building">{room.building}</div>
                  </div>
                  <div className="item-badge">{room.type}</div>
                </div>
              ))}
            </div>

            {selectedRoom && (
              <div className="room-detail-panel fade-in">
                <div className="detail-row">
                  <strong>Building:</strong> {selectedRoom.building}
                </div>
                <div className="detail-row">
                  <strong>Floor level:</strong> {selectedRoom.floor}
                </div>
                <button className="highlight-map-btn" onClick={() => alert(`Locating ${selectedRoom.name} on the 3D map model...`)}>
                  Highlight Room
                </button>
              </div>
            )}
          </div>
        )}

        {menuState === 'get-ticket' && (
          <div className="panel-content fade-in">
            <div className="panel-header">
              <button className="back-arrow" onClick={() => { setMenuState('main'); setSelectedOfficeIds([]); }}>←</button>
              <h2 className="panel-title">Queue Tickets</h2>
            </div>
            <p className="panel-subtitle">Select a request or document type to issue a queue ticket.</p>

            <div className="office-list">
              {OFFICES.map(office => (
                <button
                  key={office.id}
                  className={`office-card ${selectedOfficeIds.includes(office.id) ? 'selected' : ''}`}
                  onClick={() => handleToggleOffice(office.id)}
                >
                  <div className="office-info">
                    <div className="office-name">
                      {office.name}
                      {selectedOfficeIds.includes(office.id) && <span className="selected-tag"> (Selected)</span>}
                    </div>
                    <div className="office-desc">{office.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              className="review-tickets-btn"
              disabled={selectedOfficeIds.length === 0}
              onClick={handleReviewTickets}
            >
              Review Selected ({selectedOfficeIds.length})
            </button>
          </div>
        )}

        {menuState === 'view-ticket' && generatedTicketNo && (
          <div className="panel-content fade-in">
            <div className="panel-header">
              <button className="back-arrow" onClick={() => { setMenuState('get-ticket'); setGeneratedTicketNo(null); }}>←</button>
              <h2 className="panel-title">Your Ticket</h2>
            </div>

            <div className="printed-ticket">
              <div className="ticket-body-unified">
                <div className="ticket-number-header">
                  #{generatedTicketNo}
                </div>
                <div className="ticket-request-title">
                  Requesting documents for:
                </div>
                <ul className="ticket-docs-list">
                  {generatedOfficeNames.map((name, index) => (
                    <li key={index} className="ticket-doc-item">
                      • {name}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ticket-footer-divider"></div>
              <div className="ticket-footer">
                <div className="ticket-footer-row">
                  <span className="ticket-footer-label">Student:</span>
                  <span className="ticket-footer-val">{scannedStudent ? scannedStudent.name : 'Juan Dela Cruz'}</span>
                </div>
                <div className="ticket-footer-row">
                  <span className="ticket-footer-label">Date/Time:</span>
                  <span className="ticket-footer-val">{ticketTimestamp}</span>
                </div>
              </div>
            </div>

            <button className="print-action-btn" onClick={handlePrintTicket}>
              Print Ticket
            </button>
          </div>
        )}
      </div>

      {/* Bottom Left Language Selector */}
      <div className="bottom-left-lang">
        <button className={`lang-btn ${lang === 'EN' ? 'active' : ''}`} onClick={() => setLang('EN')}>EN</button>
        <span className="lang-divider">|</span>
        <button className={`lang-btn ${lang === 'PH' ? 'active' : ''}`} onClick={() => setLang('PH')}>PH</button>
      </div>

      {/* Bottom Center Credit */}
      <div className="bottom-center-credit">
        A Capstone Project by Pateros Technological College - Institute of Information and Computing Technology<br />
        March 2026
      </div>

      {/* Hidden Maintenance Button (Top Right) */}
      <button className="hidden-maintenance-btn" onClick={() => setPinModalOpen(true)}>
        ⚙️
      </button>

      {showIdleWarning && (
        <div className="idle-warning-overlay">
          <div className="idle-warning-box">
            <h2>Are you still there?</h2>
            <p>The screen has been idle. Returning to home screen shortly...</p>
            <button className="btn-stay" onClick={(e) => { e.stopPropagation(); setShowIdleWarning(false); }}>
              Yes, I'm still here
            </button>
          </div>
        </div>
      )}

      {pinModalOpen && (
        <div className="kiosk-alert-overlay" onClick={() => { setPinModalOpen(false); setPinCode(''); setPinError(''); }}>
          <div className={`kiosk-alert-modal ${isShaking ? 'shake-error' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">Admin Access</h2>
              {pinError && <p className="admin-modal-error">{pinError}</p>}
            </div>

            <div className="pin-input-display">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`pin-dot ${i < pinCode.length ? 'filled' : ''}`}></div>
              ))}
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
