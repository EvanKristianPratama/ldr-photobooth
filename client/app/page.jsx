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
import HowToUseScreen from './components/screens/HowToUseScreen';
import ModeSelectScreen from './components/screens/ModeSelectScreen';
import CommunityScreen from './components/screens/CommunityScreen';

import useRoom from './hooks/useRoom';
import useWebRTC from './hooks/useWebRTC';
import useCapture from './hooks/useCapture';
import useFrame from './hooks/useFrame';
import useDebouncedValue from './hooks/useDebouncedValue';
import usePhotoTransfer from './hooks/usePhotoTransfer';
import { LAYOUTS, STEP_LABELS, CHUNK_SIZE } from './constants/layout';

const SERVER_URL = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
const SOCKET_ONLY = process.env.NEXT_PUBLIC_SOCKET_ONLY === 'true';

export default function Page() {
  const [step, setStep] = useState('mode-select');
  const [sessionMode, setSessionMode] = useState(null); // 'solo' or 'duo'
  const [groupSize, setGroupSize] = useState(2);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const [isFlash, setIsFlash] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateQrMissing, setDonateQrMissing] = useState(false);
  const [locationsById, setLocationsById] = useState({});
  const [downloadName, setDownloadName] = useState('');
  const autoApplyReadyRef = useRef(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [activeTab, setActiveTab] = useState('photos');
  const [showUpload, setShowUpload] = useState(false);

  const iconBase = "/doodle icons/SVG/interface";

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
      customClass: {
        popup: 'swal-doodle',
        title: 'swal2-title',
        htmlContainer: 'swal2-html-container'
      },
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
      showConfirmButton: false,
      customClass: {
        popup: 'swal-doodle',
        title: 'swal2-title',
        htmlContainer: 'swal2-html-container'
      }
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const mode = params.get('mode');
    const savedStep = params.get('step');
    const sharedRoom = params.get('room');

    if (view === 'community') {
      setStep('community');
    } else if (sharedRoom) {
      // Auto-join from shared link
      setSessionMode('duo');
      setStep('join');
      room.setRoomCode(sharedRoom.toUpperCase());
      const sharedSize = params.get('size');
      if (sharedSize) setGroupSize(parseInt(sharedSize, 10));
    } else if (mode === 'solo') {
      setSessionMode('solo');
      if (savedStep && ['layout-select', 'join'].includes(savedStep)) {
        setStep(savedStep);
      }
    }
  }, []);

  // Sync state to URL for Solo Mode
  useEffect(() => {
    if (sessionMode === 'solo' && !['countdown', 'processing'].includes(step)) {
      const params = new URLSearchParams(window.location.search);
      params.set('mode', 'solo');
      params.set('step', step);
      const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  }, [step, sessionMode]);

  const navigateToCommunity = () => {
    const newUrl = `${window.location.origin}${window.location.pathname}?view=community`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setStep('community');
  };

  const navigateToHome = () => {
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    setStep('mode-select');
    setSessionMode(null);
  };

  const participantsWithSelf = useMemo(() => {
    return room.participants.map(p => ({
      ...p,
      isYou: p.isYou || (room.selfId && p.id === room.selfId)
    }));
  }, [room.participants, room.selfId]);

  const photoTransfer = usePhotoTransfer({ socketRef: room.socketRef });

  const webRTC = useWebRTC({
    socketRef: room.socketRef,
    setStatus: room.setStatus,
    onDataChannelMessage: ({ from, index, blob }) => capture.storeRemoteBlob(from, index, blob),
    onSocketPhotoReceive: (blob, index) => photoTransfer.sendPhotoViaSocket(blob, index)
  });

  const capture = useCapture({
    sendPhotoToPeer: webRTC.sendPhotoToPeer,
    onProcessingComplete: ({ localBlobs, remoteBlobsByPeer }) => {
      setStep('frame-select');
      frame.mergePhotos({
        count: capture.totalShots,
        participants: participantsWithSelf,
        localBlobs,
        remoteBlobsByPeer,
        locationsById
      });
    },
    onProgress: setProgress,
    onFlash: setIsFlash,
    pauseRef: pausedRef,
    participantsCount: participantsWithSelf.length
  });

  const frame = useFrame({ 
    participants: participantsWithSelf,
    locationsById: locationsById
  });

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
    frame.locTextRight,
    frame.photoFilter
  ].join('|'), [
    frame.frameMode,
    frame.framePresetId,
    frame.frameSrc,
    frame.showFrameText,
    frame.frameColor,
    frame.frameTextColor,
    frame.locTextLeft,
    frame.locTextRight,
    frame.photoFilter
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

  const startBoothSession = async ({ startTime, layout }) => {
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
    // Wait for React to mount the video element in CaptureScreen
    await new Promise(r => setTimeout(r, 300));
    captureRef.current.attachStream();
    await captureRef.current.startCaptureSequence(shots, CHUNK_SIZE);
    setStep('processing');
    await captureRef.current.checkProcessingComplete(sessionMode, participantsWithSelf.length);
  };

  useEffect(() => {
    if (!room.socket) return;

    const socket = room.socket;

    const handleOffer = (payload) => webRTCRef.current.handleOffer(payload);
    const handleAnswer = (payload) => webRTCRef.current.handleAnswer(payload);
    const handleCandidate = (payload) => webRTCRef.current.handleCandidate(payload);

    const handlePhotoReceive = async (payload) => {
      try {
        const { index, blob, from } = await photoTransferRef.current.handleSocketReceive(payload);
        captureRef.current.storeRemoteBlob(from, index, blob);
      } catch {
        // ignore
      }
    };

    const handleSessionLayout = (layout) => {
      setSelectedLayout(layout);
      setStep('layout-select');
    };

    const handleSessionStart = (payload) => startBoothSession(payload);
    
    const handleGroupSizeSync = (size) => {
      if (typeof size === 'number') setGroupSize(size);
    };
    
    const handleRoomState = (state) => {
      if (state?.groupSize) setGroupSize(state.groupSize);
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
    socket.on('room:group-size', handleGroupSizeSync);
    socket.on('room:state', handleRoomState);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:candidate', handleCandidate);
      socket.off('photo:receive', handlePhotoReceive);
      socket.off('session:layout', handleSessionLayout);
      socket.off('session:start', handleSessionStart);
      socket.off('session:reset', handleSessionReset);
      socket.off('room:group-size', handleGroupSizeSync);
      socket.off('room:state', handleRoomState);
    };
  }, [room.socket]);

  // Sync WebRTC connections for all participants when entering layout step
  useEffect(() => {
    if (step === 'layout-select' && sessionMode !== 'solo' && participantsWithSelf.length > 1) {
      webRTC.connectPeers(participantsWithSelf, SOCKET_ONLY);
    }
  }, [step, sessionMode, participantsWithSelf, SOCKET_ONLY]);

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
      remoteBlobsByPeer: capture.remoteBlobsRef.current,
      locationsById
    });
  }, [debouncedMergeDeps, step, frame.lastMergeCount, frame.mergePhotos, participantsWithSelf, locationsById]);

  useEffect(() => {
    if (step === 'result' && frame.mergedImage) {
      setDownloadName(`ldr-photo-${Date.now()}.jpg`);
    }
  }, [step, frame.mergedImage]);

  const handleModeSelect = (mode, size = 2) => {
    if (mode === 'community') {
      navigateToCommunity();
      return;
    }
    setSessionMode(mode);
    setGroupSize(size);
    if (mode === 'solo') {
      // Sync URL immediately
      const params = new URLSearchParams(window.location.search);
      params.set('mode', 'solo');
      params.set('step', 'layout-select');
      const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      window.history.pushState({ path: newUrl }, '', newUrl);

      capture.startCamera();
      room.setParticipants([{ id: room.selfId || 'solo-user', displayName: 'You', isYou: true }]);
      setStep('layout-select');
    } else {
      setStep('join');
    }
    // Default group size is 2, but it might have been changed by sub-menu
    room.emitGroupSize(size);
  };

  const handleJoin = () => {
    const ok = room.joinRoom(groupSize);
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
    if (sessionMode === 'solo') {
      startBoothSession({ layout: selectedLayout });
    } else {
      room.emitSessionStart(selectedLayout);
    }
  };

  const handleGoHome = () => {
    navigateToHome();
    room.leaveRoom();
    setSessionMode(null);
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
    if (!frame.mergedImage) return;
    const link = document.createElement('a');
    link.href = frame.mergedImage;
    link.download = downloadName || `ldr-photo-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReapply = () => {
    if (!frame.lastMergeCount) return;
    frame.mergePhotos({
      count: frame.lastMergeCount,
      participants: participantsWithSelf,
      localBlobs: capture.localBlobsRef.current,
      remoteBlobsByPeer: capture.remoteBlobsRef.current,
      locationsById
    });
  };

  const handleOpenDonate = () => {
    setDonateQrMissing(false);
    setDonateOpen(true);
  };

  return (
    <div className={step === 'community' ? 'comm-pin-root' : ''} style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', flexDirection: 'row' }}>
      {isFlash && <div className="flash-effect" />}

      {/* ── GLOBAL EXPANDABLE SIDEBAR (for Community) ── */}
      {step === 'community' && (
        <aside className="comm-pin-sidebar expandable">
          <div className="pin-sidebar-top">
            <div className="pin-logo" onClick={handleGoHome}>
              <img src={`${iconBase}/camera.svg`} className="logo-img" alt="logo" />
              <span className="logo-text">LDR Gallery</span>
            </div>
            <nav className="pin-nav">
              <button className={`pin-nav-item ${activeTab === 'photos' ? 'active' : ''}`} onClick={() => setActiveTab('photos')}>
                <span className="nav-icon"><img src="/doodle icons/SVG/misc/rocket.svg" alt="showcase" /></span>
                <span className="nav-label">Showcase</span>
              </button>
              <button className={`pin-nav-item ${activeTab === 'frames' ? 'active' : ''}`} onClick={() => setActiveTab('frames')}>
                <span className="nav-icon"><img src={`${iconBase}/grid.svg`} alt="frames" /></span>
                <span className="nav-label">Frames</span>
              </button>
              <button className="pin-nav-item" onClick={() => setShowUpload(true)}>
                <span className="nav-icon"><img src={`${iconBase}/upload.svg`} alt="upload" /></span>
                <span className="nav-label">Publish Frame</span>
              </button>
            </nav>
          </div>
          <div className="pin-sidebar-bottom">
            <button className="pin-nav-item" onClick={handleGoHome}>
              <span className="nav-icon"><img src={`${iconBase}/home.svg`} alt="back" /></span>
              <span className="nav-label">Back Home</span>
            </button>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {step !== 'community' && (
        <header className="topbar" style={{ flexShrink: 0 }}>
          <div className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <img src="/doodle icons/SVG/interface/camera.svg" alt="Camera" style={{ width: '32px', height: '32px' }} />
            <span>LDR Photobooth</span>
          </div>
        </header>
      )}

      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {step === 'mode-select' && (
          <ModeSelectScreen onSelectMode={handleModeSelect} onShowHelp={() => setShowHowTo(true)} />
        )}

        {step === 'community' && (
          <CommunityScreen 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showUpload={showUpload}
            setShowUpload={setShowUpload}
            onBack={handleGoHome} 
          />
        )}

        {step === 'join' && (
          <>
            <button className="btn-help" onClick={() => setShowHowTo(true)} title="Cara Pakai">?</button>
            <JoinRoomScreen
              displayName={room.displayName}
              setDisplayName={room.setDisplayName}
              roomCode={room.roomCode}
              setRoomCode={room.setRoomCode}
              generateRoomCode={() => room.generateRoomCode(uuidv4)}
              copyRoomCode={room.copyRoomCode}
              showToast={room.showToast}
              onJoin={handleJoin}
              onBack={() => { setStep('mode-select'); setSessionMode(null); }}
              groupSize={groupSize}
            />
          </>
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
            onBack={handleGoHome}
            groupSize={groupSize}
          />
        )}

        {step === 'layout-select' && (
          <LayoutSelectScreen
            selectedLayout={selectedLayout}
            onSelectLayout={handleLayoutSelect}
            onStart={handleStartBooth}
            groupSize={groupSize}
            onBack={() => {
              if (sessionMode === 'solo') {
                setStep('mode-select');
                setSessionMode(null);
              } else {
                setStep('room');
              }
            }}
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
            localBlobs={capture.localBlobs}
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
            photoFilter={frame.photoFilter}
            setPhotoFilter={frame.setPhotoFilter}
            userData={room}
            stickers={frame.stickers}
            addSticker={frame.addSticker}
            addRandomSticker={frame.addRandomSticker}
            clearStickers={frame.clearStickers}
            sessionMode={sessionMode}
            orientation={frame.orientation}
            setOrientation={frame.setOrientation}
            participants={participantsWithSelf}
            frameFont={frame.frameFont}
            setFrameFont={frame.setFrameFont}
            frameLayout={frame.frameLayout}
            setFrameLayout={frame.setFrameLayout}
            frameDate={frame.frameDate}
            setFrameDate={frame.setFrameDate}
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
            onDonate={handleOpenDonate}
            photoFilter={frame.photoFilter}
            sessionMode={sessionMode}
            selectedFrameId={frame.framePresetId}
          />
        )}
      </main>


      {donateOpen && (
        <div className="frame-modal">
          <div className="frame-modal__backdrop" onClick={() => setDonateOpen(false)} />
          <div className="frame-modal__content">
            <div className="frame-modal__header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                <div>
                  <h3 className="frame-modal__title">Donate</h3>
                  <p className="frame-modal__subtitle">Pwiiss untuk bayar server hehhe..</p>
                </div>
                <button 
                  onClick={() => setDonateOpen(false)} 
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '20px', 
                    opacity: 0.3, 
                    cursor: 'pointer',
                    padding: '5px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              {!donateQrMissing ? (
                <img
                  src="/donate-qr.png"
                  alt="Donate QR"
                  style={{ width: '100%', maxWidth: '280px', borderRadius: '12px', border: '3px solid var(--ink)' }}
                  onError={() => setDonateQrMissing(true)}
                />
              ) : (
                <div style={{ textAlign: 'center', fontFamily: 'Caveat', fontSize: '20px' }}>
                  QR belum tersedia.
                </div>
              )}
            </div>

            <div className="frame-modal__footer" style={{ gap: '10px' }}>
              {!donateQrMissing && (
                <a className="btn-primary" href="/donate-qr.png" download style={{ textDecoration: 'none', width: '100%', textAlign: 'center' }}>
                  Download QR
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      {showHowTo && <HowToUseScreen onClose={() => setShowHowTo(false)} />}
      </div>
    </div>
  );
}
