import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COUNTDOWN_SECONDS,
  SHOT_DELAY_MS,
  PROCESSING_RETRY_DELAY_MS,
  PROCESSING_RETRY_LIMIT
} from '../constants/layout';

export default function useCapture({
  sendPhotoToPeer,
  sendLiveFramesToPeer,
  onProcessingComplete,
  onProgress,
  onFlash,
  onShotIndex,
  pauseRef,
  participantsCount = 1
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
    };
  }, []);

  const startCamera = () => {
    navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
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

  const captureFrame = (video) => new Promise(async (resolve, reject) => {
    // Tunggu sebentar jika videoWidth belum tersedia (maksimal 3 detik)
    let attempts = 0;
    while ((!video.videoWidth || !video.videoHeight) && attempts < 30) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    if (!video.videoWidth || !video.videoHeight) {
      reject(new Error('Video not ready after waiting'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob'));
    }, 'image/jpeg', 0.9);
  });

  const captureLiveBurst = async (video, shotIndex) => {
    const burstBlobs = [];
    const framesCount = 10; // 10 frames
    const intervalMs = 150; // Every 150ms over 1.5 seconds

    const burstCanvas = document.createElement('canvas');
    // Set a reasonable small size for live photo preview frames to ensure fast processing and networking
    burstCanvas.width = 480;
    burstCanvas.height = 270;
    const bCtx = burstCanvas.getContext('2d');

    for (let f = 0; f < framesCount; f++) {
      if (!video || video.paused || video.ended) break;
      bCtx.save();
      bCtx.scale(-1, 1);
      bCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, -burstCanvas.width, 0, burstCanvas.width, burstCanvas.height);
      bCtx.restore();

      const blob = await new Promise(resolve => burstCanvas.toBlob(resolve, 'image/jpeg', 0.6));
      if (blob) {
        burstBlobs.push(blob);
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }

    liveFramesRef.current.set(shotIndex, burstBlobs);
    setLiveFrames(Array.from(liveFramesRef.current.entries()));
    console.log(`[LivePhoto] Captured ${burstBlobs.length} burst frames for shot index ${shotIndex}`);

    if (typeof sendLiveFramesToPeer === 'function') {
      sendLiveFramesToPeer(shotIndex, burstBlobs, participantsCount - 1);
    }
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
      console.error('[Capture] Video element not found after waiting');
      if (typeof onFlash === 'function') onFlash(false);
      return;
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

    // Start capturing live photo burst frames in parallel (non-blocking) only if enabled
    if (livePhotoEnabled) {
      captureLiveBurst(videoRef.current, index);
    }

    await sendPhotoToPeer(blob, index, chunkSize, participantsCount - 1);
  };

  const startCaptureSequence = async (shots, chunkSize) => {
    setTotalShots(shots);

    for (let i = 0; i < shots; i++) {
      const idx = i + 1;
      setCurrentShotIndex(idx);
      if (typeof onShotIndex === 'function') onShotIndex(idx);
      await runCountdown(COUNTDOWN_SECONDS);
      await triggerCaptureAndSend(i, chunkSize);
      await new Promise(r => setTimeout(r, SHOT_DELAY_MS));
    }
  };

  const checkProcessingComplete = async (sessionMode, participantsCount, expectedShots = totalShots) => {
    let retries = 0;
    const isSolo = sessionMode === 'solo';

    if (!isSolo) {
      // Tunggu sampai semua remote participant mengirim semua fotonya
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
        remoteBlobsByPeer: remoteBlobsRef.current
      });
    }
  };

  const storeRemoteBlob = (peerId, index, blob) => {
    if (!remoteBlobsRef.current.has(peerId)) {
      remoteBlobsRef.current.set(peerId, []);
    }
    const peerBlobs = remoteBlobsRef.current.get(peerId);
    const idx = (index != null) ? index : 0;
    // Deduplicate: if we already have this photo (e.g. from WebRTC), skip socket duplicate
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
    console.log(`[LivePhoto] Stored remote live frame index ${frameIndex} for shot ${shotIndex} from ${peerId.slice(0,8)}`);
  };

  const resetCapture = () => {
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
    liveFrames,
    remoteLiveFrames,
    livePhotoEnabled,
    setLivePhotoEnabled,
    setTotalShots,
    startCamera,
    attachStream,
    startCaptureSequence,
    checkProcessingComplete,
    storeRemoteBlob,
    storeRemoteLiveFrame,
    resetCapture
  };
}
