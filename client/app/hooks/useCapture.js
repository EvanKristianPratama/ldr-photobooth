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
  pauseRef
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const localBlobsRef = useRef([]);
  const remoteBlobsRef = useRef([]);
  const [countdown, setCountdown] = useState(null);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [totalShots, setTotalShots] = useState(0);

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

  const captureFrame = (video) => new Promise((resolve, reject) => {
    if (!video.videoWidth || !video.videoHeight) {
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

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, -canvas.width, 0, canvas.width, canvas.height);
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
    await sendPhotoToPeer(blob, index, chunkSize);
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

  const checkProcessingComplete = async () => {
    let retries = 0;
    while (remoteBlobsRef.current.filter(Boolean).length < totalShots && retries < PROCESSING_RETRY_LIMIT) {
      const received = remoteBlobsRef.current.filter(Boolean).length;
      const percentage = 50 + Math.round((received / totalShots) * 50);
      if (typeof onProgress === 'function') onProgress(percentage);
      await new Promise(r => setTimeout(r, PROCESSING_RETRY_DELAY_MS));
      retries++;
    }

    if (typeof onProgress === 'function') onProgress(100);
    if (typeof onProcessingComplete === 'function') {
      onProcessingComplete({
        localBlobs: localBlobsRef.current,
        remoteBlobs: remoteBlobsRef.current
      });
    }
  };

  const storeRemoteBlob = (index, blob) => {
    remoteBlobsRef.current[index || 0] = blob;
  };

  const resetCapture = () => {
    localBlobsRef.current = [];
    remoteBlobsRef.current = [];
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
    setTotalShots,
    startCamera,
    attachStream,
    startCaptureSequence,
    checkProcessingComplete,
    storeRemoteBlob,
    resetCapture
  };
}
