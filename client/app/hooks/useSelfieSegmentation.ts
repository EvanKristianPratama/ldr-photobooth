'use client';

import { useEffect, useRef, useState } from 'react';
import { loadScript } from '../utils/scriptLoader';

interface UseSelfieSegmentationProps {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useSelfieSegmentation({ enabled, videoRef }: UseSelfieSegmentationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const activeRef = useRef(false);
  const segmenterRef = useRef<any>(null);

  // Load MediaPipe Selfie Segmentation dynamically
  useEffect(() => {
    if (!enabled) return;

    let unmounted = false;

    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js')
      .then(() => {
        if (unmounted) return;

        const SelfieSegmentationClass = (window as any).SelfieSegmentation;
        if (!SelfieSegmentationClass) {
          throw new Error('SelfieSegmentation is not defined on window');
        }

        const segmenter = new SelfieSegmentationClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });

        segmenter.setOptions({
          modelSelection: 1, // 1 is landscape (lightweight, runs super fast at high fps)
        });

        segmenter.onResults((results: any) => {
          if (!activeRef.current || !canvasRef.current) return;

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Align canvas dimensions to video
          if (canvas.width !== results.image.width || canvas.height !== results.image.height) {
            canvas.width = results.image.width;
            canvas.height = results.image.height;
          }

          ctx.save();
          // Clear background (making it fully transparent)
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw the segmentation mask
          ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

          // Composite source-in: draw the webcam image only where mask is present
          ctx.globalCompositeOperation = 'source-in';
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

          ctx.restore();
        });

        segmenterRef.current = segmenter;
        setModelLoaded(true);
        console.log('[SelfieSegmentation] Model loaded successfully');
      })
      .catch((err) => {
        console.error('[SelfieSegmentation] Failed to initialize model:', err);
      });

    return () => {
      unmounted = true;
      activeRef.current = false;
      if (segmenterRef.current) {
        try {
          segmenterRef.current.close();
        } catch (e) {}
        segmenterRef.current = null;
      }
      setModelLoaded(false);
    };
  }, [enabled]);

  // Frame-by-frame loop trigger
  useEffect(() => {
    if (!enabled || !modelLoaded || !videoRef.current) {
      activeRef.current = false;
      setProcessing(false);
      return;
    }

    activeRef.current = true;
    setProcessing(true);

    let animationId: number;
    const video = videoRef.current;
    const segmenter = segmenterRef.current;

    // Create persistent canvas if not present
    if (!canvasRef.current && typeof document !== 'undefined') {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 640;
      canvasRef.current.height = 480;
    }

    const processFrame = async () => {
      if (!activeRef.current || !video || video.paused || video.ended) {
        animationId = requestAnimationFrame(processFrame);
        return;
      }

      if (video.readyState >= 2 && segmenter) {
        try {
          await segmenter.send({ image: video });
        } catch (err) {
          console.error('[SelfieSegmentation] Frame sending error:', err);
        }
      }

      animationId = requestAnimationFrame(processFrame);
    };

    animationId = requestAnimationFrame(processFrame);

    return () => {
      activeRef.current = false;
      setProcessing(false);
      cancelAnimationFrame(animationId);
    };
  }, [enabled, modelLoaded, videoRef]);

  return {
    canvasRef,
    modelLoaded,
    processing,
  };
}
