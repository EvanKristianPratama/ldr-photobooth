import React, { useState, useEffect, useRef } from 'react';
import rootPkg from '../../package.json';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
const SOCKET_ONLY = import.meta.env.VITE_SOCKET_ONLY === 'true';
const CHUNK_SIZE = 64 * 1024; // 64KB

const getCssVar = (name, fallback) => {
  try {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const APP_VERSION = rootPkg?.version || '';
  const [step, setStep] = useState('join'); // join, room, layout-select, countdown, processing, result
  const [roomCode, setRoomCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('Disconnected');
  const [progress, setProgress] = useState(0);

  // Frame customization (used when merging result)
  const [frameColor, setFrameColor] = useState('#000000');
  const [frameTextColor, setFrameTextColor] = useState('#FFFFFF');
  const [lastMergeCount, setLastMergeCount] = useState(0);
  const [locationsById, setLocationsById] = useState({}); // { [socketId]: { lat, lng, accuracy, city, country } }

  // LDR State
  const [selectedLayout, setSelectedLayout] = useState(null); // 'layout1', 'layout2', 'layout3'
  const [countdown, setCountdown] = useState(null);

  // Capture session state
  const [capturedPhotos, setCapturedPhotos] = useState([]); // [{ localBlob, remoteBlob }]
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [totalShots, setTotalShots] = useState(0);

  const [mergedImage, setMergedImage] = useState(null);
  const [isFlash, setIsFlash] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateQrMissing, setDonateQrMissing] = useState(false);

  // Refs
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const socketOnlyRef = useRef(false); // force non-WebRTC fallback if negotiation fails

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

    // Optional: force socket-only mode via env flag
    if (SOCKET_ONLY) {
      enableSocketFallback('socket-only-mode');
      setStatus('Socket-only ready');
    }

    socket.on('connect', () => {
      console.log('✅ Connected to server:', SERVER_URL);
      console.log('Socket ID:', socket.id);
      setStatus('Connected');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      setStatus('Connection Error: ' + error.message);
    });

    socket.on('room:error', (error) => {
      console.error('❌ Room error:', error.message);
      Swal.fire({
        icon: 'error',
        title: 'Oops!',
        text: 'Sooryy room is fulll :( maybe try another one?',
        confirmButtonColor: '#9b87f5'
      });
      setStatus('Room Error: ' + error.message);
      setStep('join'); // Go back to join screen
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Disconnected:', reason);
      setStatus('Disconnected: ' + reason);
    });

    socket.on('room:joined', ({ participants }) => {
      console.log('👥 Room joined event, participants:', participants);
      setParticipants(participants);
    });

    socket.on('location:update', ({ from, lat, lng, accuracy }) => {
      // city/country are optional; coords are required
      const city = typeof arguments[0]?.city === 'string' ? arguments[0].city : undefined;
      const country = typeof arguments[0]?.country === 'string' ? arguments[0].country : undefined;
      if (!from || typeof lat !== 'number' || typeof lng !== 'number') return;
      setLocationsById(prev => ({
        ...prev,
        [from]: { lat, lng, accuracy, city, country }
      }));
    });

    // WebRTC Signaling with Perfect Negotiation
    socket.on('webrtc:offer', async ({ sdp, from }) => {
      try {
        const pc = getOrCreatePC(socket, from);

        // Determine if we are polite (higher socket ID = polite)
        const isPolite = socket.id > from;
        const offerCollision = pc.signalingState !== 'stable' || makingOfferRef.current;

        ignoreOfferRef.current = !isPolite && offerCollision;
        if (ignoreOfferRef.current) {
          console.log('⚠️ Ignoring offer collision (impolite peer)');
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { to: from, sdp: answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('webrtc:answer', async ({ sdp }) => {
      try {
        if (pcRef.current && !ignoreOfferRef.current) {
          // Avoid InvalidStateError when already stable
          if (pcRef.current.signalingState === 'stable') return;
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      } catch (err) {
        console.error('Error handling answer:', err);
        enableSocketFallback('answer-error');
      }
    });

    socket.on('webrtc:candidate', async ({ candidate }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('ICE candidate error:', err);
          enableSocketFallback('candidate-error');
        }
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
      setLastMergeCount(0);
    });

    // Photo relay via Socket.IO (fallback when not using WebRTC data channel)
    socket.on('photo:receive', async ({ index, mime, base64 }) => {
      try {
        const blob = await base64ToBlob(base64, mime || 'image/jpeg');
        remoteBlobsRef.current[index || 0] = blob;
        console.log(`📩 Photo received via socket for index ${index}`);
      } catch (err) {
        console.error('Failed to handle photo:receive', err);
      }
    });

    return () => {
      socket.off('photo:receive');
      socket.off('location:update');
      socket.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  const getDefaultFrameNames = () => {
    const sorted = [...participants].sort((a, b) => (a?.id || '').localeCompare(b?.id || ''));
    const userA = (sorted[0]?.displayName || '').trim();
    const userB = (sorted[1]?.displayName || '').trim();

    // Canvas layout is always: Left = User B, Right = User A
    // Avoid generic placeholders; if we can't infer, keep it blank.
    const left = userB || '';
    const right = userA || '';
    return { left, right };
  };

  const requestAndSendLocation = () => {
    try {
      if (!navigator?.geolocation) return;
      if (!socketRef.current?.id) return;

      const reverseGeocode = async (lat, lng) => {
        // Best-effort, no key. Fallbacks included.
        try {
          const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&localityLanguage=en`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const city = (data.city || data.locality || data.principalSubdivision || '').toString().trim();
            const country = (data.countryName || '').toString().trim();
            if (city || country) return { city: city || undefined, country: country || undefined };
          }
        } catch {
          // ignore
        }

        try {
          const url = `https://geocode.maps.co/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address || {};
            const city = (addr.city || addr.town || addr.village || addr.county || addr.state || '').toString().trim();
            const country = (addr.country || '').toString().trim();
            if (city || country) return { city: city || undefined, country: country || undefined };
          }
        } catch {
          // ignore
        }

        return { city: undefined, country: undefined };
      };

      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = Number(pos?.coords?.latitude);
          const lng = Number(pos?.coords?.longitude);
          const accuracy = Number(pos?.coords?.accuracy);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

          (async () => {
            const { city, country } = await reverseGeocode(lat, lng);

            const myId = socketRef.current.id;
            setLocationsById(prev => ({
              ...prev,
              [myId]: { lat, lng, accuracy, city, country }
            }));

            socketRef.current.emit('location:update', { lat, lng, accuracy, city, country });
          })();
        },
        err => {
          console.log('Geolocation unavailable/denied:', err?.message);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 5 * 60 * 1000
        }
      );
    } catch (e) {
      console.log('Geolocation error:', e);
    }
  };

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
      await runCountdown(6); // 6s countdown per shot
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
    const headerH = 170;
    const footerH = 260;

    const { left: defaultLeft, right: defaultRight } = getDefaultFrameNames();
    const leftName = (defaultLeft || '').trim();
    const rightName = (defaultRight || '').trim();
    const activeFrameColor = (frameColor || '#9b87f5').trim();
    const activeTextColor = (frameTextColor || '#FFFFFF').trim();

    const sorted = [...participants].sort((a, b) => (a?.id || '').localeCompare(b?.id || ''));
    const userAId = sorted[0]?.id;
    const userBId = sorted[1]?.id;
    const leftId = userBId || sorted[0]?.id;
    const rightId = userAId || sorted[1]?.id;

    const formatLocationLine = (loc) => {
      if (!loc) return '';
      const city = (loc.city || '').toString().trim();
      const country = (loc.country || '').toString().trim();
      if (city && country) return `${city}, ${country}`;
      if (city) return city;
      if (country) return country;
      if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        return `(${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`;
      }
      return '';
    };

    const leftLocationLine = formatLocationLine(locationsById[leftId]);
    const rightLocationLine = formatLocationLine(locationsById[rightId]);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const totalW = (cellW * 2) + (gap * 3);
    const totalH = (cellH * count) + (gap * (count + 1)) + headerH + footerH;

    canvas.width = totalW;
    canvas.height = totalH;

    // Fill Background
    ctx.fillStyle = activeFrameColor;
    ctx.fillRect(0, 0, totalW, totalH);

    // Determine Position
    const myId = socketRef.current.id;
    const myIndex = sorted.findIndex(p => p.id === myId);
    const isUserA = myIndex === 0;

    // Header: names + coordinates (clean, no boxes)
    ctx.save();
    ctx.fillStyle = activeTextColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.textBaseline = 'middle';

    const headerY1 = Math.round(headerH * 0.45);
    const headerY2 = Math.round(headerH * 0.78);

    ctx.textAlign = 'left';
    ctx.font = '800 44px Quicksand, system-ui, -apple-system, sans-serif';
    if (leftName) ctx.fillText(leftName, gap, headerY1);
    ctx.font = '700 34px Quicksand, system-ui, -apple-system, sans-serif';
    if (leftLocationLine) ctx.fillText(leftLocationLine, gap, headerY2);

    ctx.textAlign = 'right';
    ctx.font = '800 44px Quicksand, system-ui, -apple-system, sans-serif';
    if (rightName) ctx.fillText(rightName, totalW - gap, headerY1);
    ctx.font = '700 34px Quicksand, system-ui, -apple-system, sans-serif';
    if (rightLocationLine) ctx.fillText(rightLocationLine, totalW - gap, headerY2);
    ctx.restore();

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
    ctx.fillStyle = activeTextColor;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.font = '800 52px Quicksand, system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(new Date().toLocaleDateString(), gap, totalH - Math.round(footerH * 0.4));

    ctx.textAlign = 'right';
    ctx.fillText('Ldr-Photobooth', totalW - gap, totalH - Math.round(footerH * 0.4));

    setLastMergeCount(count);
    setMergedImage(canvas.toDataURL('image/jpeg', 0.85));
    setStep('result');
  };

  const blobToImage = (blob) => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = URL.createObjectURL(blob);
    });
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const base64ToBlob = async (base64, mime = 'image/jpeg') => {
    const res = await fetch(`data:${mime};base64,${base64}`);
    return await res.blob();
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
      } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        enableSocketFallback(pc.connectionState);
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
    // Preferred: use data channel if available
    if (!socketOnlyRef.current && dcRef.current && dcRef.current.readyState === 'open') {
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
      return;
    }

    // Fallback: send via Socket.IO as base64
    try {
      const base64 = await blobToBase64(blob);
      socketRef.current.emit('photo:send', {
        index,
        mime: blob.type || 'image/jpeg',
        base64
      });
      console.log(`📤 Photo sent via socket for index ${index}`);
    } catch (err) {
      console.error('Failed to send photo via socket', err);
    }
  };

  const enableSocketFallback = (reason) => {
    socketOnlyRef.current = true;
    setStatus(`Fallback (socket-only): ${reason}`);
    try {
      if (pcRef.current) pcRef.current.close();
    } catch (e) {
      console.error('Error closing PC during fallback', e);
    }
    pcRef.current = null;
    dcRef.current = null;
  };

  // UI Actions
  const joinRoom = () => {
    if (!displayName || !displayName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Oops...',
        text: 'Please enter your name!',
        confirmButtonColor: '#9b87f5'
      });
      return;
    }
    if (!roomCode) return;

    // Update URL to match the room code
    const newUrl = `${window.location.origin}${window.location.pathname}?code=${roomCode}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    console.log('🚪 Joining room:', roomCode, 'as', displayName);
    socketRef.current.emit('room:join', { code: roomCode, displayName });
    setStep('room');
    startCamera();
    requestAndSendLocation();
  };

  const generateRoomCode = () => {
    const code = uuidv4().split('-')[0].toUpperCase();
    setRoomCode(code);
    try {
      if (navigator?.clipboard) navigator.clipboard.writeText(code);
    } catch (e) {
      // ignore
    }
  };

  // Check URL for code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setRoomCode(codeParam.toUpperCase());
    }
  }, []);

  const [showToast, setShowToast] = useState(false);

  const copyRoomCode = async () => {
    if (!roomCode) return;
    try {
      const url = `${window.location.origin}?code=${roomCode}`;
      const textToCopy = `Join my LDR Photobooth!\nRoom Code: ${roomCode}\nLink: ${url}`;
      await navigator.clipboard.writeText(textToCopy);
      console.log('Room link copied:', url);

      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const openDonate = () => {
    setDonateQrMissing(false);
    setDonateOpen(true);
  };
  const closeDonate = () => setDonateOpen(false);

  const goHomeToJoin = () => {
    // Return to the join screen (copy code) without resetting the room session on server.
    setStep('join');
    setSelectedLayout(null);
    setCountdown(null);
    setCapturedPhotos([]);
    setCurrentShotIndex(0);
    setTotalShots(0);
    localBlobsRef.current = [];
    remoteBlobsRef.current = [];
    setMergedImage(null);
    setProgress(0);
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

  const connectPeers = async () => {
    if (SOCKET_ONLY) {
      enableSocketFallback('socket-only-mode');
      return;
    }

    const peer = participants.find(p => p.id !== socketRef.current.id);
    if (!peer) return;

    try {
      const pc = getOrCreatePC(socketRef.current, peer.id);
      const dc = pc.createDataChannel('ldr-channel');
      setupDataChannel(dc);

      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      makingOfferRef.current = false;

      socketRef.current.emit('webrtc:offer', { to: peer.id, sdp: offer });
    } catch (err) {
      makingOfferRef.current = false;
      console.error('Error creating offer:', err);
    }
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

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', alignItems: 'center' }}>
              <button className="btn-secondary" onClick={generateRoomCode}>Generate Code</button>
              <div className="code-display" style={{ cursor: roomCode ? 'pointer' : 'default', position: 'relative' }} onClick={copyRoomCode}>
                <div className={`copy-toast ${showToast ? 'visible' : ''}`}>Link Copied!</div>
                {roomCode || 'No code yet'}
                <button className="btn-icon" style={{ marginLeft: '8px' }} onClick={(e) => { e.stopPropagation(); copyRoomCode(); }} aria-label="Copy code">Copy</button>
              </div>
            </div>
          </div>
          <button className="btn-primary" style={{ width: '100%' }} onClick={joinRoom}>Join Booth</button>
        </div>
      )}

      {(step === 'room') && (
        <div className="glass-panel wait-room wait-room-panel">
          <h2 className="wait-room__title">Wait Room</h2>

          <div className="wait-room__meta">
            <div className="wait-room__participants">
              <div className="wait-room__participantsHeader">
                <span>Participants</span>
                <strong>{participants.length} / 2</strong>
              </div>
              <div className="wait-room__participantsList">
                {participants.map((p, i) => (
                  <div key={i} className="wait-room__participant">
                    • {p.displayName} {p.id === socketRef.current?.id ? '(You)' : ''}
                  </div>
                ))}
              </div>
            </div>

            <div className="wait-room__code">
              <div className="wait-room__codeLabel">Room Code</div>
              <div className="code-display" style={{ cursor: roomCode ? 'pointer' : 'default', position: 'relative' }} onClick={copyRoomCode}>
                <div className={`copy-toast ${showToast ? 'visible' : ''}`}>Link Copied!</div>
                {roomCode || 'No code'}
                <button
                  className="btn-icon"
                  style={{ marginLeft: '8px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    copyRoomCode();
                  }}
                  aria-label="Copy room code"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="wait-room__status">
              <span className="status-indicator">
                <span className={`status-dot ${status?.startsWith?.('Connected') ? 'active' : ''}`} />
                {status}
              </span>
            </div>
          </div>

          <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }}></video>
          </div>
          <div className="controls">
            {participants.length < 2 && <p>Waiting for partner...</p>}
            {participants.length >= 2 && (
              <button className="btn-primary" onClick={() => setStep('layout-select')}>
                Next: Select Layout
              </button>
            )}
          </div>
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
          <div className="result-customize">
            <h2 className="result-title">Edit Your Photostrip</h2>

            <div className="customize-grid">
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Frame Color</label>
                <div className="color-row">
                  <input
                    className="color-input"
                    type="color"
                    value={frameColor}
                    onChange={e => setFrameColor(e.target.value)}
                    aria-label="Frame color"
                  />
                  <div className="color-hex">{frameColor?.toUpperCase?.() || frameColor}</div>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Text Color</label>
                <div className="color-row">
                  <input
                    className="color-input"
                    type="color"
                    value={frameTextColor}
                    onChange={e => setFrameTextColor(e.target.value)}
                    aria-label="Frame text color"
                  />
                  <div className="color-hex">{frameTextColor?.toUpperCase?.() || frameTextColor}</div>
                </div>
              </div>
            </div>

            <div className="customize-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  if (!lastMergeCount) return;
                  mergePhotos(lastMergeCount);
                }}
              >
                Apply
              </button>
            </div>
          </div>

          <img src={mergedImage} className="merged-preview" alt="LDR Result" />

          <div className="action-buttons">
            <a href={mergedImage} download={`ldr-photo-${Date.now()}.jpg`} className="btn-primary" style={{ textDecoration: 'none' }}>
              Download Photo
            </a>
            <button className="btn-secondary" onClick={goHomeToJoin}>
              Home
            </button>
          </div>
        </div>
      )}

      <footer className="credits">
        Created by Evan Kristian — <a href="https://www.instagram.com/evankristiannn/" target="_blank" rel="noopener noreferrer">@evankristiannn</a>
        {APP_VERSION && (
          <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontWeight: 700 }}>
            v{APP_VERSION}
          </div>
        )}
        <div style={{ marginTop: '10px' }}>
          <button className="btn-secondary" onClick={openDonate} style={{ marginTop: '8px' }}>Donate</button>
        </div>
        <div style={{ marginTop: '8px' }}>
          <a href="https://wa.me/6287779511667?text=Halo%2C%20saya%20mengalami%20masalah%20dengan%20LDR%20Photobooth.%20Bisa%20dibantu%3F" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 800, textDecoration: 'none' }}>
            Tell me if u have trouble
          </a>
        </div>
      </footer>

      {donateOpen && (
        <div className="donate-modal">
          <div className="donate-dialog">
            <button className="donate-close" onClick={closeDonate}>×</button>
            <h3 style={{ marginTop: 0 }}>Donate</h3>

            <p className="subtitle" style={{ marginTop: '-6px' }}>Pwiiss untuk bayar server hehhe..</p>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {!donateQrMissing ? (
                <img
                  src="/donate-qr.png"
                  alt="Donate QR"
                  style={{ width: 320, height: 320, objectFit: 'contain', borderRadius: 12, background: '#fff' }}
                  onError={() => setDonateQrMissing(true)}
                />
              ) : (
                <div style={{ color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>
                  QR belum tersedia.
                  <div style={{ marginTop: 6, fontWeight: 600 }}>
                    Taruh file di client/public/donate-qr.png.
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              {!donateQrMissing && (
                <a
                  className="btn-secondary"
                  href="/donate-qr.png"
                  download="donate-qr.png"
                  style={{ textDecoration: 'none' }}
                >
                  Download QR
                </a>
              )}
              <button className="btn-secondary" onClick={closeDonate}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
