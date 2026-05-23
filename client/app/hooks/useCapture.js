import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COUNTDOWN_SECONDS,
  SHOT_DELAY_MS,
  PROCESSING_RETRY_DELAY_MS,
  PROCESSING_RETRY_LIMIT
} from '../constants/layout';
import { useSelfieSegmentation } from './useSelfieSegmentation';

export default function useCapture({
  sendPhotoToPeer,
  sendLiveFramesToPeer,
  onProcessingComplete,
  onProgress,
  onFlash,
  onShotIndex,
  pauseRef,
  participantsCount = 1,
  sessionMode = 'duo'
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const localBlobsRef = useRef([]);
  const remoteBlobsRef = useRef(new Map()); // Map<peerId, blob[]>
  const liveFramesRef = useRef(new Map()); // Map<shotIndex, blob[]>
  const remoteLiveFramesRef = useRef(new Map()); // Map<peerId, Map<shotIndex, blob[]>>
  
  const [countdown, setCountdown] = useState(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [totalShots, setTotalShots] = useState(0);
  const [localBlobs, setLocalBlobs] = useState([]);
  const [liveFrames, setLiveFrames] = useState([]); // Array of entries of shotIndex -> blob[]
  const [remoteLiveFrames, setRemoteLiveFrames] = useState(new Map());
  const [livePhotoEnabled, setLivePhotoEnabled] = useState(true);
  
  // Timer and review states
  const [sessionTimeLeft, setSessionTimeLeft] = useState(null);
  const sessionTimerRef = useRef(null);
  const [isTransmitting, setIsTransmitting] = useState(false);

  // ── LIVE VIDEO CALL (VC) STATES ──
  const [isLiveVCActive, setIsLiveVCActive] = useState(false);
  const [liveVCTimeLeft, setLiveVCTimeLeft] = useState(60);
  const [remoteStream, setRemoteStream] = useState(null);
  const [backgroundRemovalEnabled, setBackgroundRemovalEnabled] = useState(sessionMode === 'live');
  const vcTimerRef = useRef(null);
  const localSegmentedStreamRef = useRef(null);

  // Composite canvas refs
  const compositeCanvasRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // ── INTEGRATE LIVE BACKGROUND REMOVAL HOOK ──
  const { canvasRef: selfieCanvasRef, modelLoaded: selfieModelLoaded } = useSelfieSegmentation({
    enabled: backgroundRemovalEnabled,
    videoRef
  });

  const attachStream = useCallback(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      if (vcTimerRef.current) {
        clearInterval(vcTimerRef.current);
      }
      if (localSegmentedStreamRef.current) {
        localSegmentedStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = () => {
    navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        alert('Cannot access camera: ' + err.message);
      });
  };

  // ── LIVE VIDEO CALL STREAM START & STOP CONTROLS ──
  const startLiveVC = useCallback((addLocalStreamCallback) => {
    if (isLiveVCActive) return;
    console.log('[Capture] Starting live Video Call session (60s limit)');
    setIsLiveVCActive(true);
    setLiveVCTimeLeft(60);

    // Capture transparent background-removed stream from selfie canvas
    const canvas = selfieCanvasRef.current;
    if (canvas) {
      const stream = canvas.captureStream(30); // 30 FPS
      localSegmentedStreamRef.current = stream;
      if (typeof addLocalStreamCallback === 'function') {
        addLocalStreamCallback(stream);
      }
    }

    if (vcTimerRef.current) clearInterval(vcTimerRef.current);
    vcTimerRef.current = setInterval(() => {
      setLiveVCTimeLeft(prev => {
        if (prev <= 1) {
          stopLiveVC(addLocalStreamCallback);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isLiveVCActive, selfieCanvasRef]);

  const stopLiveVC = useCallback((addLocalStreamCallback) => {
    console.log('[Capture] Stopping live Video Call session');
    setIsLiveVCActive(false);
    setLiveVCTimeLeft(60);
    if (vcTimerRef.current) {
      clearInterval(vcTimerRef.current);
      vcTimerRef.current = null;
    }

    // Stop local segmented stream track
    if (localSegmentedStreamRef.current) {
      localSegmentedStreamRef.current.getTracks().forEach(t => t.stop());
      localSegmentedStreamRef.current = null;
    }

    // Clear tracks from WebRTC Peer Connections
    if (typeof addLocalStreamCallback === 'function') {
      addLocalStreamCallback(null);
    }

    setRemoteStream(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  // ── DYNAMIC SIDE-BY-SIDE COMPOSITING CANVAS LOOP (KISS) ──
  useEffect(() => {
    let animationId;

    const drawComposite = () => {
      const canvas = compositeCanvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(drawComposite);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(drawComposite);
        return;
      }

      canvas.width = 1280;
      canvas.height = 720;

      // Draw cute theme solid background (Cream Vibe #fff9e6)
      ctx.fillStyle = '#fff9e6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const localSource = backgroundRemovalEnabled && selfieCanvasRef.current 
        ? selfieCanvasRef.current 
        : videoRef.current;

      const hasRemoteStream = remoteStream && remoteVideoRef.current;

      if (sessionMode === 'live' && hasRemoteStream) {
        // --- DUO side-by-side composite photo posing ---

        // Left Half: Local User
        if (localSource && (localSource.videoWidth || localSource.width)) {
          const w = localSource.videoWidth || localSource.width;
          const h = localSource.videoHeight || localSource.height;
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, 640, 720);
          ctx.clip();

          // Mirror local preview for intuitive control
          ctx.translate(320, 360);
          ctx.scale(-1, 1);
          ctx.translate(-320, -360);

          ctx.drawImage(localSource, 0, 0, w, h, 0, 0, 640, 720);
          ctx.restore();
        }

        // Right Half: Remote Partner
        if (remoteVideoRef.current && remoteVideoRef.current.videoWidth) {
          const rw = remoteVideoRef.current.videoWidth;
          const rh = remoteVideoRef.current.videoHeight;
          ctx.save();
          ctx.beginPath();
          ctx.rect(640, 0, 640, 720);
          ctx.clip();

          ctx.drawImage(remoteVideoRef.current, 0, 0, rw, rh, 640, 0, 640, 720);
          ctx.restore();
        }
      } else {
        // --- SOLO/Single active user fullscreen fallback ---
        if (localSource && (localSource.videoWidth || localSource.width)) {
          const w = localSource.videoWidth || localSource.width;
          const h = localSource.videoHeight || localSource.height;
          ctx.save();
          ctx.translate(640, 360);
          ctx.scale(-1, 1);
          ctx.translate(-640, -360);

          ctx.drawImage(localSource, 0, 0, w, h, 0, 0, 1280, 720);
          ctx.restore();
        }
      }

      animationId = requestAnimationFrame(drawComposite);
    };

    animationId = requestAnimationFrame(drawComposite);
    return () => cancelAnimationFrame(animationId);
  }, [backgroundRemovalEnabled, remoteStream, sessionMode, selfieCanvasRef]);

  // Bind remote stream update to HTMLVideoElement source object
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const runCountdown = (seconds) => new Promise(resolve => {
    let count = seconds;
    setCountdown(count);

    const interval = setInterval(() => {
      if (pauseRef?.current) return;
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

  // ── CAPTURE STATIC PHOTO SNAPSHOT (DRY) ──
  const captureFrame = (video) => new Promise(async (resolve, reject) => {
    const canvasSource = compositeCanvasRef.current || video;
    
    let sourceWidth = canvasSource.videoWidth || canvasSource.width;
    let sourceHeight = canvasSource.videoHeight || canvasSource.height;
    
    let attempts = 0;
    while ((!sourceWidth || !sourceHeight) && attempts < 30) {
      await new Promise(r => setTimeout(r, 100));
      sourceWidth = canvasSource.videoWidth || canvasSource.width;
      sourceHeight = canvasSource.videoHeight || canvasSource.height;
      attempts++;
    }

    if (!sourceWidth || !sourceHeight) {
      reject(new Error('Capture source not ready after waiting'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    const ctx = canvas.getContext('2d');

    if (canvasSource === compositeCanvasRef.current) {
      // Composite canvas is already correctly scaled and mirrored, just draw it directly
      ctx.drawImage(canvasSource, 0, 0, sourceWidth, sourceHeight);
    } else {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(canvasSource, 0, 0, sourceWidth, sourceHeight, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/jpeg', 0.9);
  });

  // ── CAPTURE LIVE PHOTO BURSTS (DRY) ──
  const captureLiveBurst = async (video, shotIndex) => {
    const burstBlobs = [];
    const framesCount = 10; // 10 frames
    const intervalMs = 150; // Every 150ms over 1.5 seconds

    const source = compositeCanvasRef.current || video;

    const burstCanvas = document.createElement('canvas');
    burstCanvas.width = 480;
    burstCanvas.height = 270;
    const bCtx = burstCanvas.getContext('2d');

    for (let f = 0; f < framesCount; f++) {
      if (!source) break;
      bCtx.save();
      
      if (source === compositeCanvasRef.current) {
        bCtx.drawImage(source, 0, 0, source.width, source.height, 0, 0, burstCanvas.width, burstCanvas.height);
      } else {
        bCtx.scale(-1, 1);
        bCtx.drawImage(source, 0, 0, source.videoWidth, source.videoHeight, -burstCanvas.width, 0, burstCanvas.width, burstCanvas.height);
      }
      
      bCtx.restore();

      const blob = await new Promise(resolve => burstCanvas.toBlob(resolve, 'image/jpeg', 0.6));
      if (blob) {
        burstBlobs.push(blob);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }

    liveFramesRef.current.set(shotIndex, burstBlobs);
    setLiveFrames(Array.from(liveFramesRef.current.entries()));
    console.log(`[LivePhoto] Composited burst captured for shot ${shotIndex}`);
  };

  const triggerCaptureAndSend = async (index, chunkSize) => {
    if (typeof onFlash === 'function') onFlash(true);
    await new Promise(r => setTimeout(r, 100));

    // Wait for video element to be mounted (up to 2s)
    let waitAttempts = 0;
    while (!videoRef.current && waitAttempts < 20) {
      await new Promise(r => setTimeout(r, 100));
      waitAttempts++;
    }
    if (!videoRef.current) {
      console.warn('[Capture] Video element not found after waiting. Likely unmounted or timed out.');
      if (typeof onFlash === 'function') onFlash(false);
      return false;
    }

    // Re-attach stream if needed and wait for readyState
    if (videoRef.current.readyState < 2 && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      let readyAttempts = 0;
      while (videoRef.current.readyState < 2 && readyAttempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        readyAttempts++;
      }
    }

    const blob = await captureFrame(videoRef.current);
    if (typeof onFlash === 'function') onFlash(false);

    localBlobsRef.current[index] = blob;
    setLocalBlobs([...localBlobsRef.current]); // Update state to trigger re-render

    // Capture burst frames from composite canvas if enabled
    if (livePhotoEnabled) {
      captureLiveBurst(videoRef.current, index);
    }
    
    return true;
  };

  const startCaptureSequence = async (shots, chunkSize) => {
    setTotalShots(shots);

    for (let i = 0; i < shots; i++) {
      const idx = i + 1;
      setCurrentShotIndex(idx);
      if (typeof onShotIndex === 'function') onShotIndex(idx);
      await runCountdown(COUNTDOWN_SECONDS);
      const success = await triggerCaptureAndSend(i, chunkSize);
      if (!success) break; // abort loop if capture failed (like unmount)
      await new Promise(r => setTimeout(r, SHOT_DELAY_MS));
    }
  };

  const startSingleShotRetake = async (targetIndex, chunkSize) => {
    const prevIndex = currentShotIndex;
    setCurrentShotIndex(targetIndex); 
    if (typeof onShotIndex === 'function') onShotIndex(targetIndex + 1);

    await runCountdown(COUNTDOWN_SECONDS);
    await triggerCaptureAndSend(targetIndex, chunkSize);
    
    setCurrentShotIndex(totalShots);
  };

  const checkProcessingComplete = async (sessionMode, participantsCount, expectedShots = totalShots) => {
    let retries = 0;
    const isSolo = sessionMode === 'solo';

    if (!isSolo) {
      const expectedRemotePeers = participantsCount - 1;
      
      const isComplete = () => {
        if (remoteBlobsRef.current.size < expectedRemotePeers) return false;
        for (const blobs of remoteBlobsRef.current.values()) {
          if (blobs.filter(Boolean).length < expectedShots) return false;
        }
        return true;
      };

      while (!isComplete() && retries < PROCESSING_RETRY_LIMIT) {
        let totalReceived = 0;
        remoteBlobsRef.current.forEach((blobs, peerId) => {
          const count = blobs.filter(Boolean).length;
          totalReceived += count;
          if (count < expectedShots) {
            console.log(`[Capture] Still waiting for ${expectedShots - count} photos from peer ${peerId.slice(0,8)}`);
          }
        });

        if (remoteBlobsRef.current.size < expectedRemotePeers) {
          console.log(`[Capture] Still waiting for ${expectedRemotePeers - remoteBlobsRef.current.size} peers to connect`);
        }
        
        const totalExpected = expectedRemotePeers * totalShots;
        const percentage = 50 + Math.round((totalReceived / (totalExpected || 1)) * 50);
        if (typeof onProgress === 'function') onProgress(percentage);
        
        await new Promise(r => setTimeout(r, PROCESSING_RETRY_DELAY_MS));
        retries++;
      }
      
      if (retries >= PROCESSING_RETRY_LIMIT) {
        console.warn('[Capture] Processing timeout reached. Some photos might be missing.');
      }
    }

    if (typeof onProgress === 'function') onProgress(100);
    if (typeof onProcessingComplete === 'function') {
      onProcessingComplete({
        localBlobs: localBlobsRef.current,
        remoteBlobsByPeer: remoteBlobsRef.current,
        liveFrames: Array.from(liveFramesRef.current.entries()),
        remoteLiveFrames: remoteLiveFramesRef.current
      });
    }
  };

  const storeRemoteBlob = (peerId, index, blob) => {
    if (!remoteBlobsRef.current.has(peerId)) {
      remoteBlobsRef.current.set(peerId, []);
    }
    const peerBlobs = remoteBlobsRef.current.get(peerId);
    const idx = (index != null) ? index : 0;
    if (peerBlobs[idx]) return;
    peerBlobs[idx] = blob;
  };

  const storeRemoteLiveFrame = (peerId, shotIndex, frameIndex, blob) => {
    if (!remoteLiveFramesRef.current.has(peerId)) {
      remoteLiveFramesRef.current.set(peerId, new Map());
    }
    const peerMap = remoteLiveFramesRef.current.get(peerId);
    if (!peerMap.has(shotIndex)) {
      peerMap.set(shotIndex, []);
    }
    const frames = peerMap.get(shotIndex);
    frames[frameIndex] = blob;
    setRemoteLiveFrames(new Map(remoteLiveFramesRef.current));
  };

  const startSessionTimer = (seconds, onTimeoutCallback) => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    setSessionTimeLeft(seconds);
    
    sessionTimerRef.current = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(sessionTimerRef.current);
          sessionTimerRef.current = null;
          if (typeof onTimeoutCallback === 'function') onTimeoutCallback();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopSessionTimer = () => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    sessionTimerRef.current = null;
    setSessionTimeLeft(null);
  };

  const transmitAllLocalData = async (chunkSize) => {
    setIsTransmitting(true);
    const expectedPeers = participantsCount - 1;

    try {
      for (let i = 0; i < localBlobsRef.current.length; i++) {
        const blob = localBlobsRef.current[i];
        if (blob && typeof sendPhotoToPeer === 'function') {
          await sendPhotoToPeer(blob, i, chunkSize, expectedPeers);
        }
      }

      if (livePhotoEnabled && typeof sendLiveFramesToPeer === 'function') {
        for (const [shotIndex, burstBlobs] of liveFramesRef.current.entries()) {
           await sendLiveFramesToPeer(shotIndex, burstBlobs, expectedPeers);
        }
      }
    } catch (err) {
       console.error('[Transmit] Batch upload error:', err);
    } finally {
       setIsTransmitting(false);
    }
  };

  const resetCapture = () => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    sessionTimerRef.current = null;
    setSessionTimeLeft(null);
    setIsTransmitting(false);
    
    localBlobsRef.current = [];
    remoteBlobsRef.current = new Map();
    liveFramesRef.current = new Map();
    remoteLiveFramesRef.current = new Map();
    setLocalBlobs([]);
    setLiveFrames([]);
    setRemoteLiveFrames(new Map());
    setCurrentShotIndex(0);
    setTotalShots(0);
    setCountdown(null);
    stopLiveVC(null);
  };

  return {
    videoRef,
    streamRef,
    localBlobsRef,
    remoteBlobsRef,
    liveFramesRef,
    remoteLiveFramesRef,
    countdown,
    currentShotIndex,
    totalShots,
    localBlobs,
    setLocalBlobs,
    liveFrames,
    setLiveFrames,
    remoteLiveFrames,
    setRemoteLiveFrames,
    livePhotoEnabled,
    setLivePhotoEnabled,
    sessionTimeLeft,
    isTransmitting,
    setTotalShots,
    startCamera,
    attachStream,
    startCaptureSequence,
    startSingleShotRetake,
    startSessionTimer,
    stopSessionTimer,
    transmitAllLocalData,
    checkProcessingComplete,
    storeRemoteBlob,
    storeRemoteLiveFrame,
    resetCapture,
    
    // EXPOSE LIVE VC API
    isLiveVCActive,
    liveVCTimeLeft,
    remoteStream,
    setRemoteStream,
    backgroundRemovalEnabled,
    setBackgroundRemovalEnabled,
    selfieModelLoaded,
    compositeCanvasRef,
    remoteVideoRef,
    startLiveVC,
    stopLiveVC,
    selfieCanvasRef
  };
}
