import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const CHUNK_SIZE = 64 * 1024; // 64KB

function App() {
  const [step, setStep] = useState('join'); // join, room, layout-select, countdown, processing, result
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('Disconnected');
  const [progress, setProgress] = useState(0);

  // LDR State
  const [selectedLayout, setSelectedLayout] = useState(null); // 'layout1', 'layout2', 'layout3'
  const [countdown, setCountdown] = useState(null);

  // Capture session state
  const [capturedPhotos, setCapturedPhotos] = useState([]); // [{ localBlob, remoteBlob }]
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [totalShots, setTotalShots] = useState(0);

  const [mergedImage, setMergedImage] = useState(null);
  const [isFlash, setIsFlash] = useState(false);

  // Refs
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const incomingFileRef = useRef({
    id: null,
    chunks: [],
    receivedSize: 0,
    meta: null
  });

  const localBlobsRef = useRef([]); // Temp store for ongoing session
  const remoteBlobsRef = useRef([]); // Temp store for ongoing session

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to server:', SERVER_URL);
      console.log('Socket ID:', socket.id);
      setStatus('Connected');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      setStatus('Connection Error: ' + error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Disconnected:', reason);
      setStatus('Disconnected: ' + reason);
    });

    socket.on('room:joined', ({ participants }) => {
      console.log('👥 Room joined event, participants:', participants);
      setParticipants(participants);
    });

    // WebRTC Signaling
    socket.on('webrtc:offer', async ({ sdp, from }) => {
      const pc = getOrCreatePC(socket, from);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { to: from, sdp: answer });
    });

    socket.on('webrtc:answer', async ({ sdp }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socket.on('webrtc:candidate', async ({ candidate }) => {
      if (pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // LDR Sync Events
    socket.on('session:layout', (layout) => {
      console.log('Layout selected:', layout);
      setSelectedLayout(layout);
      setStep('layout-select'); // Ensure both on this step
    });

    socket.on('session:start', ({ startTime, layout }) => {
      console.log('Session starting...', layout);
      if (layout) setSelectedLayout(layout);

      // Prepare session
      localBlobsRef.current = [];
      remoteBlobsRef.current = [];
      setCurrentShotIndex(0);

      const shots = getShotsCount(layout || selectedLayout);
      setTotalShots(shots);

      setStep('countdown');
      startCaptureSequence(startTime, shots);
    });

    socket.on('session:reset', () => {
      setStep('layout-select'); // Go back to layout selection
      setCapturedPhotos([]);
      setMergedImage(null);
      setIsFlash(false);
      localBlobsRef.current = [];
      remoteBlobsRef.current = [];
    });

    return () => {
      socket.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  // Effect to ensure video stream stays attached
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      console.log('Re-attaching video stream');
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step]);

  // Watch for completion of transfers to trigger next logic is handled in data channel

  const getShotsCount = (layout) => {
    if (layout === 'layout1') return 1;
    if (layout === 'layout2') return 2;
    if (layout === 'layout3') return 3;
    return 1;
  };

  const startCaptureSequence = async (startTime, total) => {
    // Loop
    for (let i = 0; i < total; i++) {
      setCurrentShotIndex(i + 1);
      await runCountdown(3); // 3s countdown per shot
      await triggerCaptureAndSend(i);
      // Wait for transfer of this shot to complete before next? 
      // Ideally P2P is fast enough. We'll add a small buffer.
      await new Promise(r => setTimeout(r, 2000)); // Buffer for transfer
    }

    setStep('processing');
    // Final merge check triggered by effect or direct call
    checkProcessingComplete(total);
  };

  const runCountdown = (seconds) => {
    return new Promise(resolve => {
      let count = seconds;
      setCountdown(count);
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(interval);
          setCountdown(null);
          resolve();
        }
      }, 1000);
    });
  };

  const triggerCaptureAndSend = async (index) => {
    setIsFlash(true);

    // Wait a bit for flash to render before capture
    await new Promise(r => setTimeout(r, 100));

    if (!videoRef.current) {
      console.error('Video ref not available');
      return;
    }

    // Check if video is actually playing
    if (videoRef.current.readyState < 2) {
      console.error('Video not ready, readyState:', videoRef.current.readyState);
      // Try to re-attach stream
      if (streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    const blob = await captureFrame(videoRef.current);
    setIsFlash(false);

    // Store Local
    localBlobsRef.current[index] = blob;

    // Send
    await sendPhotoToPeer(blob, index);
  };

  const captureFrame = (video) => {
    return new Promise((resolve, reject) => {
      // Validate video dimensions
      if (!video.videoWidth || !video.videoHeight) {
        console.error('Video dimensions not available:', video.videoWidth, video.videoHeight);
        reject(new Error('Video not ready'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1800;
      const ctx = canvas.getContext('2d');

      const vRatio = video.videoWidth / video.videoHeight;
      const cRatio = canvas.width / canvas.height;
      let sw, sh, sx, sy;

      if (vRatio > cRatio) {
        sh = video.videoHeight;
        sw = sh * cRatio;
        sx = (video.videoWidth - sw) / 2;
        sy = 0;
      } else {
        sw = video.videoWidth;
        sh = sw / cRatio;
        sx = 0;
        sy = (video.videoHeight - sh) / 2;
      }

      // Mirror horizontally
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sw, sh, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      canvas.toBlob(b => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.9);
    });
  };

  // Check if we have all photos locally and remotely
  const checkProcessingComplete = async (total) => {
    // Poll or wait until remoteBlobsRef is full
    // Since send/receive is async, we might be here before remote photos arrive.
    // We implement a wait loop.
    let retries = 0;
    while (remoteBlobsRef.current.filter(b => b).length < total && retries < 20) {
      await new Promise(r => setTimeout(r, 500));
      retries++;
    }

    mergePhotos(total);
  };

  const mergePhotos = async (count) => {
    // Canvas depends on layout
    // Layout 1: 1 Row. Total w = 1200+1200 + gap? App asked for template.
    // User provided template:
    // Layout 1: [A][B] + Date/Name (Single Strip)
    // Layout 2: [A][B] / [A][B] (2x2)
    // Layout 3: [A][B] / [A][B] / [A][B] (3x2)

    // Base cell size: let's say 600x900 (half res) to keep final strip manageable? 
    // Or full res. Let's do Full Res 1200x1800 per cell.

    const cellW = 1200;
    const cellH = 1800;
    const gap = 100;
    const headerH = 100;
    const footerH = 300;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const totalW = (cellW * 2) + (gap * 3);
    const totalH = (cellH * count) + (gap * (count + 1)) + headerH + footerH;

    canvas.width = totalW;
    canvas.height = totalH;

    // Fill Background
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, totalW, totalH);

    // Determine Position
    const myId = socketRef.current.id;
    const sorted = [...participants].sort((a, b) => a.id.localeCompare(b.id));
    const myIndex = sorted.findIndex(p => p.id === myId);
    const isUserA = myIndex === 0;

    for (let i = 0; i < count; i++) {
      const localB = localBlobsRef.current[i];
      const remoteB = remoteBlobsRef.current[i];

      const localImg = await blobToImage(localB);
      const remoteImg = remoteB ? await blobToImage(remoteB) : localImg; // Fallback if missing

      const rowY = headerH + gap + (i * (cellH + gap));

      if (isUserA) {
        // A Left?? Img says UserA | UserB. 
        // Let's stick to: A (Left/Right?) 
        // Request says: "User A kanan User B kiri" -> A Right, B Left.
        // Wait, diagram says [USER A] [USER B]. Usually Left to Right.
        // Text "User A kanan" means User A is on the Right side.
        // Let's follow text "User A kanan".
        // So: [User B] [User A]

        // Draw B (Remote) at Left
        ctx.drawImage(remoteImg, gap, rowY, cellW, cellH);
        // Draw A (Local) at Right
        ctx.drawImage(localImg, gap * 2 + cellW, rowY, cellW, cellH);
      } else {
        // I am User B
        // Draw B (Local) at Left
        ctx.drawImage(localImg, gap, rowY, cellW, cellH);
        // Draw A (Remote) at Right
        ctx.drawImage(remoteImg, gap * 2 + cellW, rowY, cellW, cellH);
      }
    }

    // Footer
    ctx.fillStyle = "#333";
    ctx.font = "bold 80px Inter";
    ctx.textAlign = "left";
    ctx.fillText(new Date().toLocaleDateString(), gap, totalH - 100);

    ctx.textAlign = "right";
    // Get names
    const nameA = sorted[0]?.displayName || 'A';
    const nameB = sorted[1]?.displayName || 'B';
    // If A is Right, B is left on image? 
    // Img: [B] [A]
    ctx.fillText(`${nameB} & ${nameA}`, totalW - gap, totalH - 100);

    setMergedImage(canvas.toDataURL('image/jpeg', 0.8));
    setStep('result');
  };

  const blobToImage = (blob) => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(blob);
    });
  };

  // WebRTC & Data
  const getOrCreatePC = (socket, remoteId) => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = e => {
      if (e.candidate) socket.emit('webrtc:candidate', { to: remoteId, candidate: e.candidate });
    };

    pc.ondatachannel = e => setupDataChannel(e.channel);

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setStatus('P2P Ready');
        // If in room, move to layout select automatically if 2 peers
        // But we wait for manual Start
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const setupDataChannel = (dc) => {
    dcRef.current = dc;
    dc.binaryType = 'arraybuffer';
    dc.onmessage = handleDataChannelMessage;
  };

  const handleDataChannelMessage = (e) => {
    const data = e.data;
    if (typeof data === 'string') {
      const msg = JSON.parse(data);
      if (msg.type === 'meta') {
        incomingFileRef.current = {
          chunks: [],
          meta: msg,
          received: 0
        };
      } else if (msg.type === 'done') {
        const blobs = incomingFileRef.current.chunks;
        const meta = incomingFileRef.current.meta;
        const resultBlob = new Blob(blobs, { type: meta.mime });

        // Store in array based on index
        const idx = meta.index || 0;
        remoteBlobsRef.current[idx] = resultBlob;
        console.log(`Received shot ${idx}`);
      }
    } else {
      incomingFileRef.current.chunks.push(data);
    }
  };

  const sendPhotoToPeer = async (blob, index) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return;

    const buffer = await blob.arrayBuffer();
    const fileId = uuidv4();

    dcRef.current.send(JSON.stringify({
      type: 'meta',
      id: fileId,
      size: blob.size,
      mime: blob.type,
      index: index
    }));

    let offset = 0;
    while (offset < buffer.byteLength) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
      while (dcRef.current.bufferedAmount > 10 * 1024 * 1024) {
        await new Promise(r => setTimeout(r, 50));
      }
      dcRef.current.send(chunk);
      offset += chunk.byteLength;
    }
    dcRef.current.send(JSON.stringify({ type: 'done', id: fileId }));
  };

  // UI Actions
  const joinRoom = () => {
    if (!roomCode || !displayName) return;
    console.log('🚪 Joining room:', roomCode, 'as', displayName);
    socketRef.current.emit('room:join', { code: roomCode, displayName });
    setStep('room');
    startCamera();
  };

  const startCamera = () => {
    navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        facingMode: 'user'
      },
      audio: false
    })
      .then(s => {
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(err => {
        console.error('Camera error:', err);
        alert('Cannot access camera: ' + err.message);
      });
  };

  const connectPeers = () => {
    const peer = participants.find(p => p.id !== socketRef.current.id);
    if (!peer) return;
    const pc = getOrCreatePC(socketRef.current, peer.id);
    const dc = pc.createDataChannel('ldr-channel');
    setupDataChannel(dc);
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socketRef.current.emit('webrtc:offer', { to: peer.id, sdp: offer });
    });
  };

  const handleLayoutSelect = (layout) => {
    setSelectedLayout(layout);
    socketRef.current.emit('session:layout', layout);
  };

  const proceedToBooth = () => {
    // Must have layout
    if (!selectedLayout) return alert("Select a layout!");
    setStep('countdown');
    socketRef.current.emit('session:start', { layout: selectedLayout });
  };

  return (
    <div className="container">
      {isFlash && <div className="flash-effect" />}

      <header style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 className="title">LDR Photobooth</h1>
      </header>

      {step === 'join' && (
        <div className="glass-panel" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Your Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Name" />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label>Room Code</label>
            <input value={roomCode} onChange={e => setRoomCode(e.target.value)} placeholder="Code" />
          </div>
          <button className="btn-primary" style={{ width: '100%' }} onClick={joinRoom}>Join Booth</button>
        </div>
      )}

      {(step === 'room') && (
        <div className="glass-panel" style={{ scale: 0.9 }}>
          <h2>Wait Room</h2>
          <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              👥 Participants: <strong>{participants.length}</strong> / 2
            </p>
            {participants.map((p, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: '#aaa' }}>
                • {p.displayName} {p.id === socketRef.current?.id ? '(You)' : ''}
              </div>
            ))}
          </div>
          <div className="camera-container" style={{ height: '300px' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }}></video>
          </div>
          <div className="controls">
            {participants.length < 2 && <p>Waiting for partner...</p>}
            {participants.length >= 2 && status !== 'P2P Ready' && (
              <button className="btn-primary" onClick={connectPeers}>Connect Peers</button>
            )}
            {status === 'P2P Ready' && (
              <button className="btn-primary" onClick={() => setStep('layout-select')}>Next: Select Layout</button>
            )}
          </div>
          <p>Status: {status}</p>
        </div>
      )}

      {(step === 'layout-select') && (
        <div className="result-container">
          <h2>Select Layout</h2>
          <p className="subtitle">Choose how your memories will look</p>

          <div className="layout-selection-container">
            <div
              className={`layout-card ${selectedLayout === 'layout1' ? 'selected' : ''}`}
              onClick={() => handleLayoutSelect('layout1')}
            >
              <div className="layout-preview">
                <div className="layout-mini-1">
                  <div></div><div></div>
                </div>
              </div>
              <div className="strip-label">Layout 1 (1 Shot)</div>
            </div>

            <div
              className={`layout-card ${selectedLayout === 'layout2' ? 'selected' : ''}`}
              onClick={() => handleLayoutSelect('layout2')}
            >
              <div className="layout-preview">
                <div className="layout-mini-2">
                  <div></div><div></div><div></div><div></div>
                </div>
              </div>
              <div className="strip-label">Layout 2 (2 Shots)</div>
            </div>

            <div
              className={`layout-card ${selectedLayout === 'layout3' ? 'selected' : ''}`}
              onClick={() => handleLayoutSelect('layout3')}
            >
              <div className="layout-preview">
                <div className="layout-mini-3">
                  <div></div><div></div><div></div><div></div><div></div><div></div>
                </div>
              </div>
              <div className="strip-label">Layout 3 (3 Shots)</div>
            </div>
          </div>

          <div className="controls" style={{ marginTop: '2rem' }}>
            <button className={`btn-primary ${!selectedLayout ? 'disabled' : ''}`} onClick={proceedToBooth}>
              START BOOTH
            </button>
          </div>
        </div>
      )}

      {(step === 'countdown' || step === 'processing') && (
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }}></video>
            {countdown !== null && (
              <div className="countdown-overlay">
                <div className="countdown-number">{countdown}</div>
                {totalShots > 1 && <div style={{ position: 'absolute', bottom: '20px', color: 'white' }}>Shot {currentShotIndex} / {totalShots}</div>}
              </div>
            )}
          </div>

          {step === 'processing' && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <h3>Processing...</h3>
              <p>Merging photos and syncing...</p>
            </div>
          )}
        </div>
      )}

      {step === 'result' && mergedImage && (
        <div className="result-container">
          <img src={mergedImage} className="merged-preview" alt="LDR Result" />

          <div className="action-buttons">
            <a href={mergedImage} download={`ldr-photo-${Date.now()}.jpg`} className="btn-primary" style={{ textDecoration: 'none' }}>
              Download Photo
            </a>
            <button className="btn-secondary" onClick={() => socketRef.current.emit('session:reset')}>
              Home (Reset)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
