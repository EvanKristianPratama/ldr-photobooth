'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { v4 as uuidv4 } from 'uuid';

import FrameSelectScreen from './components/screens/FrameSelectScreen';
import JoinRoomScreen from './components/screens/JoinRoomScreen';
import WaitRoomScreen from './components/screens/WaitRoomScreen';
import LayoutSelectScreen from './components/screens/LayoutSelectScreen';
import CaptureScreen from './components/screens/CaptureScreen';
import ResultScreen from './components/screens/ResultScreen';
import StepIndicator from './components/ui/StepIndicator';

import useRoom from './hooks/useRoom';
import useWebRTC from './hooks/useWebRTC';
import useCapture from './hooks/useCapture';
import useFrame from './hooks/useFrame';
import useDebouncedValue from './hooks/useDebouncedValue';
import usePhotoTransfer from './hooks/usePhotoTransfer';
import { LAYOUTS, STEP_LABELS, CHUNK_SIZE } from './constants/layout';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
const SOCKET_ONLY = process.env.NEXT_PUBLIC_SOCKET_ONLY === 'true';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '';

export default function Page() {
  const [step, setStep] = useState('join');
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const [isFlash, setIsFlash] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateQrMissing, setDonateQrMissing] = useState(false);
  const [locationsById, setLocationsById] = useState({});
  const [downloadName, setDownloadName] = useState('');
  const autoApplyReadyRef = useRef(false);

  const handlePartnerPause = () => {
    if (pausedRef.current) return;
    pausedRef.current = true;

    Swal.fire({
      title: 'Partner Disconnected!',
      text: 'Waiting for them to reconnect...',
      icon: 'warning',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  };

  const handlePartnerResume = () => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    Swal.close();
    Swal.fire({
      icon: 'success',
      title: 'Connected!',
      text: 'Resuming session...',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleLocationUpdate = ({ from, lat, lng, accuracy, city, country }) => {
    if (!from || typeof lat !== 'number' || typeof lng !== 'number') return;
    setLocationsById(prev => ({
      ...prev,
      [from]: { lat, lng, accuracy, city, country }
    }));
  };

  const room = useRoom({
    serverUrl: SERVER_URL,
    socketOnly: SOCKET_ONLY,
    step,
    setStep,
    onLocationUpdate: handleLocationUpdate,
    onPartnerPause: handlePartnerPause,
    onPartnerResume: handlePartnerResume
  });

  const participantsWithSelf = useMemo(() => {
    return room.participants.map(p => ({
      ...p,
      isYou: p.id === room.selfId
    }));
  }, [room.participants, room.selfId]);

  const photoTransfer = usePhotoTransfer({ socketRef: room.socketRef });

  const webRTC = useWebRTC({
    socketRef: room.socketRef,
    setStatus: room.setStatus,
    onDataChannelMessage: ({ index, blob }) => capture.storeRemoteBlob(index, blob),
    onSocketPhotoReceive: (blob, index) => photoTransfer.sendPhotoViaSocket(blob, index)
  });

  const capture = useCapture({
    sendPhotoToPeer: webRTC.sendPhotoToPeer,
    onProcessingComplete: ({ localBlobs, remoteBlobs }) => {
      setStep('frame-select');
      frame.mergePhotos({
        count: capture.totalShots,
        participants: participantsWithSelf,
        localBlobs,
        remoteBlobs,
        locationsById
      });
    },
    onProgress: setProgress,
    onFlash: setIsFlash,
    pauseRef: pausedRef
  });

  const frame = useFrame({ participants: participantsWithSelf });

  const selectedLayoutRef = useRef(selectedLayout);
  const captureRef = useRef(capture);
  const frameRef = useRef(frame);
  const webRTCRef = useRef(webRTC);
  const photoTransferRef = useRef(photoTransfer);

  const mergeDeps = useMemo(() => [
    frame.frameMode,
    frame.framePresetId,
    frame.frameSrc,
    frame.showFrameText,
    frame.frameColor,
    frame.frameTextColor,
    frame.locTextLeft,
    frame.locTextRight
  ].join('|'), [
    frame.frameMode,
    frame.framePresetId,
    frame.frameSrc,
    frame.showFrameText,
    frame.frameColor,
    frame.frameTextColor,
    frame.locTextLeft,
    frame.locTextRight
  ]);

  const debouncedMergeDeps = useDebouncedValue(mergeDeps, 200);

  useEffect(() => {
    selectedLayoutRef.current = selectedLayout;
  }, [selectedLayout]);

  useEffect(() => {
    captureRef.current = capture;
  }, [capture]);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  useEffect(() => {
    webRTCRef.current = webRTC;
  }, [webRTC]);

  useEffect(() => {
    photoTransferRef.current = photoTransfer;
  }, [photoTransfer]);

  useEffect(() => {
    capture.attachStream();
  }, [step, capture.attachStream]);

  useEffect(() => {
    if (!room.socket) return;

    const socket = room.socket;

    const handleOffer = (payload) => webRTCRef.current.handleOffer(payload);
    const handleAnswer = (payload) => webRTCRef.current.handleAnswer(payload);
    const handleCandidate = (payload) => webRTCRef.current.handleCandidate(payload);

    const handlePhotoReceive = async (payload) => {
      try {
        const { index, blob } = await photoTransferRef.current.handleSocketReceive(payload);
        captureRef.current.storeRemoteBlob(index, blob);
      } catch {
        // ignore
      }
    };

    const handleSessionLayout = (layout) => {
      setSelectedLayout(layout);
      setStep('layout-select');
    };

    const handleSessionStart = async ({ startTime, layout }) => {
      if (layout) setSelectedLayout(layout);

      frameRef.current.bumpSessionSeed();
      captureRef.current.resetCapture();
      setProgress(0);

      const shots = LAYOUTS[layout || selectedLayoutRef.current]?.shots || 1;

      if (startTime) {
        const delay = Math.max(0, startTime - Date.now());
        if (delay > 0) await new Promise(r => setTimeout(r, delay));
      }

      setStep('countdown');
      await captureRef.current.startCaptureSequence(shots, CHUNK_SIZE);
      setStep('processing');
      captureRef.current.checkProcessingComplete();
    };

    const handleSessionReset = () => {
      setStep('layout-select');
      setSelectedLayout(null);
      setProgress(0);
      pausedRef.current = false;
      captureRef.current.resetCapture();
      frameRef.current.resetFrame();
      setLocationsById({});
      setDownloadName('');
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:candidate', handleCandidate);
    socket.on('photo:receive', handlePhotoReceive);
    socket.on('session:layout', handleSessionLayout);
    socket.on('session:start', handleSessionStart);
    socket.on('session:reset', handleSessionReset);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:candidate', handleCandidate);
      socket.off('photo:receive', handlePhotoReceive);
      socket.off('session:layout', handleSessionLayout);
      socket.off('session:start', handleSessionStart);
      socket.off('session:reset', handleSessionReset);
    };
  }, [room.socket]);

  useEffect(() => {
    if (step !== 'frame-select') {
      autoApplyReadyRef.current = false;
    }
  }, [step]);

  useEffect(() => {
    if (step !== 'frame-select' || !frame.lastMergeCount) return;
    if (!autoApplyReadyRef.current) {
      autoApplyReadyRef.current = true;
      return;
    }

    frame.mergePhotos({
      count: frame.lastMergeCount,
      participants: participantsWithSelf,
      localBlobs: capture.localBlobsRef.current,
      remoteBlobs: capture.remoteBlobsRef.current,
      locationsById
    });
  }, [debouncedMergeDeps, step, frame.lastMergeCount, frame.mergePhotos, participantsWithSelf, locationsById]);

  useEffect(() => {
    if (step === 'result' && frame.mergedImage) {
      setDownloadName(`ldr-photo-${Date.now()}.jpg`);
    }
  }, [step, frame.mergedImage]);

  const handleJoin = () => {
    const ok = room.joinRoom();
    if (ok) {
      capture.startCamera();
      room.requestAndSendLocation();
    }
  };

  const handleGoLayout = () => {
    webRTC.connectPeers(participantsWithSelf, SOCKET_ONLY);
    setStep('layout-select');
  };

  const handleLayoutSelect = (layout) => {
    setSelectedLayout(layout);
    room.emitLayout(layout);
  };

  const handleStartBooth = () => {
    if (!selectedLayout) return;
    room.emitSessionStart(selectedLayout);
  };

  const handleGoHome = () => {
    room.leaveRoom();
    setStep('join');
    room.setRoomCode('');
    setSelectedLayout(null);
    setProgress(0);
    pausedRef.current = false;
    capture.resetCapture();
    frame.resetFrame();
    setLocationsById({});
    setDownloadName('');
  };

  const handleDownload = () => {
    if (!downloadName) {
      setDownloadName(`ldr-photo-${Date.now()}.jpg`);
    }
  };

  const handleReapply = () => {
    if (!frame.lastMergeCount) return;
    frame.mergePhotos({
      count: frame.lastMergeCount,
      participants: participantsWithSelf,
      localBlobs: capture.localBlobsRef.current,
      remoteBlobs: capture.remoteBlobsRef.current,
      locationsById
    });
  };

  const handleOpenDonate = () => {
    setDonateQrMissing(false);
    setDonateOpen(true);
  };

  return (
    <div className="container">
      {isFlash && <div className="flash-effect" />}

      <header style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 className="title">LDR Photobooth</h1>
      </header>

      <StepIndicator steps={STEP_LABELS} currentStep={step} />

      {step === 'join' && (
        <JoinRoomScreen
          displayName={room.displayName}
          setDisplayName={room.setDisplayName}
          roomCode={room.roomCode}
          setRoomCode={room.setRoomCode}
          generateRoomCode={() => room.generateRoomCode(uuidv4)}
          copyRoomCode={room.copyRoomCode}
          showToast={room.showToast}
          onJoin={handleJoin}
        />
      )}

      {step === 'room' && (
        <WaitRoomScreen
          participants={participantsWithSelf}
          roomCode={room.roomCode}
          copyRoomCode={room.copyRoomCode}
          showToast={room.showToast}
          status={room.status}
          videoRef={capture.videoRef}
          onNext={handleGoLayout}
        />
      )}

      {step === 'layout-select' && (
        <LayoutSelectScreen
          selectedLayout={selectedLayout}
          onSelectLayout={handleLayoutSelect}
          onStart={handleStartBooth}
        />
      )}

      {(step === 'countdown' || step === 'processing') && (
        <CaptureScreen
          videoRef={capture.videoRef}
          countdown={capture.countdown}
          totalShots={capture.totalShots}
          currentShotIndex={capture.currentShotIndex}
          progress={progress}
          isProcessing={step === 'processing'}
        />
      )}

      {step === 'frame-select' && frame.mergedImage && (
        <FrameSelectScreen
          mergedImage={frame.mergedImage}
          isMerging={frame.isMerging}
          onContinue={() => setStep('result')}
          onReapply={handleReapply}
          framePresets={frame.framePresets}
          framePresetId={frame.framePresetId}
          selectFramePreset={frame.selectFramePreset}
          frameSrc={frame.frameSrc}
          setFrameSrc={frame.setFrameSrc}
          setFrameName={frame.setFrameName}
          setFrameMode={frame.setFrameMode}
          setFramePresetId={frame.setFramePresetId}
          handleFrameUpload={frame.handleFrameUpload}
          frameName={frame.frameName}
          frameError={frame.frameError}
          frameMode={frame.frameMode}
          frameColor={frame.frameColor}
          setFrameColor={frame.setFrameColor}
          frameTextColor={frame.frameTextColor}
          setFrameTextColor={frame.setFrameTextColor}
          showFrameText={frame.showFrameText}
          setShowFrameText={frame.setShowFrameText}
          getDefaultFrameNames={frame.getDefaultFrameNames}
          locTextLeft={frame.locTextLeft}
          setLocTextLeft={frame.setLocTextLeft}
          locTextRight={frame.locTextRight}
          setLocTextRight={frame.setLocTextRight}
          setLocTextEdited={frame.setLocTextEdited}
        />
      )}

      {step === 'result' && frame.mergedImage && (
        <ResultScreen
          mergedImage={frame.mergedImage}
          isMerging={frame.isMerging}
          downloadName={downloadName}
          onEditFrame={() => setStep('frame-select')}
          onHome={handleGoHome}
          onDownload={handleDownload}
        />
      )}

      <footer className="credits">
        Created by Evan Kristian — <a href="https://www.instagram.com/evankristiannn/" target="_blank" rel="noopener noreferrer">@evankristiannn</a>
        {APP_VERSION && (
          <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontWeight: 700 }}>
            v{APP_VERSION}
          </div>
        )}
        <div style={{ marginTop: '10px' }}>
          <button className="btn-secondary" onClick={handleOpenDonate} style={{ marginTop: '8px' }}>Donate</button>
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
            <button className="donate-close" onClick={() => setDonateOpen(false)}>×</button>
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
              <button className="btn-secondary" onClick={() => setDonateOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
