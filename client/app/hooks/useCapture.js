import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COUNTDOWN_SECONDS,
  SHOT_DELAY_MS,
  PROCESSING_RETRY_DELAY_MS,
  PROCESSING_RETRY_LIMIT
} from '../constants/layout';

export default function useCapture({
  sendPhotoToPeer,
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
  const [countdown, setCountdown] = useState(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [totalShots, setTotalShots] = useState(0);
  const [localBlobs, setLocalBlobs] = useState([]);

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

  const triggerCaptureAndSend = async (index, chunkSize) => {
    if (typeof onFlash === 'function') onFlash(true);
    await new Promise(r => setTimeout(r, 100));

    if (!videoRef.current) return;
    if (videoRef.current.readyState < 2 && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      await new Promise(r => setTimeout(r, 500));
    }

    const blob = await captureFrame(videoRef.current);
    if (typeof onFlash === 'function') onFlash(false);

    localBlobsRef.current[index] = blob;
    setLocalBlobs([...localBlobsRef.current]); // Update state to trigger re-render
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

  const checkProcessingComplete = async (sessionMode, participantsCount) => {
    let retries = 0;
    const isSolo = sessionMode === 'solo';

    if (!isSolo) {
      // Tunggu sampai semua remote participant mengirim semua fotonya
      const expectedRemotePeers = participantsCount - 1;
      
      const isComplete = () => {
        if (remoteBlobsRef.current.size < expectedRemotePeers) return false;
        for (const blobs of remoteBlobsRef.current.values()) {
          if (blobs.filter(Boolean).length < totalShots) return false;
        }
        return true;
      };

      while (!isComplete() && retries < PROCESSING_RETRY_LIMIT) {
        let totalReceived = 0;
        remoteBlobsRef.current.forEach(blobs => {
          totalReceived += blobs.filter(Boolean).length;
        });
        
        const totalExpected = expectedRemotePeers * totalShots;
        const percentage = 50 + Math.round((totalReceived / totalExpected) * 50);
        if (typeof onProgress === 'function') onProgress(percentage);
        
        await new Promise(r => setTimeout(r, PROCESSING_RETRY_DELAY_MS));
        retries++;
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

  const resetCapture = () => {
    localBlobsRef.current = [];
    remoteBlobsRef.current = new Map();
    setLocalBlobs([]);
    setCurrentShotIndex(0);
    setTotalShots(0);
    setCountdown(null);
  };

  return {
    videoRef,
    streamRef,
    localBlobsRef,
    remoteBlobsRef,
    countdown,
    currentShotIndex,
    totalShots,
    localBlobs,
    setTotalShots,
    startCamera,
    attachStream,
    startCaptureSequence,
    checkProcessingComplete,
    storeRemoteBlob,
    resetCapture
  };
}
