'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { v4 as uuidv4 } from 'uuid';

import useRoom from './useRoom';
import useWebRTC from './useWebRTC';
import useCapture from './useCapture';
import useFrame from './useFrame';
import useDebouncedValue from './useDebouncedValue';
import usePhotoTransfer from './usePhotoTransfer';
import { LAYOUTS, CHUNK_SIZE } from '../constants/layout';
import { convertToPaperSize } from '../services/paperService';
import { saveSessionToIndexedDb, loadSessionFromIndexedDb, clearSessionFromIndexedDb } from '../utils/indexedDb';

const SERVER_URL = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
const SOCKET_ONLY = process.env.NEXT_PUBLIC_SOCKET_ONLY === 'true';

/**
 * Orchestrator Hook that aggregates all runtime logic, web socket listeners, 
 * peer negotiations, and state synchronizations. 
 * Decouples presentation logic from business routing.
 */
export default function useAppController() {
  const [step, setStep] = useState('loading');
  const [invoiceData, setInvoiceData] = useState(null);
  const stepRef = useRef(step);
  const isMountedRef = useRef(false);

  // --- Lifecycle: Persisted Step state
  useEffect(() => {
    if (!isMountedRef.current) return;
    stepRef.current = step;
    if (typeof window !== 'undefined') {
      if (['frame-select', 'result', 'layout-select', 'room', 'join', 'checkout', 'invoice'].includes(step)) {
        sessionStorage.setItem('ldr_step', step);
      } else if (step === 'mode-select') {
        sessionStorage.removeItem('ldr_step');
      }
    }
  }, [step]);

  const [sessionMode, setSessionMode] = useState(null);

  // --- Lifecycle: Persisted Mode
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (typeof window !== 'undefined') {
      if (sessionMode) sessionStorage.setItem('ldr_session_mode', sessionMode);
      else sessionStorage.removeItem('ldr_session_mode');
    }
  }, [sessionMode]);

  const [groupSize, setGroupSize] = useState(2);
  const [capturedParticipants, setCapturedParticipants] = useState([]);

  // --- Lifecycle: Persist Captured Participants
  useEffect(() => {
    if (!isMountedRef.current) return;
    if (typeof window !== 'undefined') {
      if (capturedParticipants.length > 0) {
        sessionStorage.setItem('ldr_captured_participants', JSON.stringify(capturedParticipants));
      } else {
        sessionStorage.removeItem('ldr_captured_participants');
      }
    }
  }, [capturedParticipants]);

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

  const selectedLayoutRef = useRef(selectedLayout);

  // --- Navigation Helpers
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
      customClass: { popup: 'swal-doodle', title: 'swal2-title', htmlContainer: 'swal2-html-container' },
      didOpen: () => Swal.showLoading()
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
      customClass: { popup: 'swal-doodle', title: 'swal2-title', htmlContainer: 'swal2-html-container' }
    });
  };

  const handleLocationUpdate = ({ from, lat, lng, accuracy, city, country }) => {
    if (!from || typeof lat !== 'number' || typeof lng !== 'number') return;
    setLocationsById(prev => ({ ...prev, [from]: { lat, lng, accuracy, city, country } }));
  };

  // ── COMPONENT HOOKS INITIALIZATION ──
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
      isYou: p.isYou || (room.selfId && p.id === room.selfId)
    }));
  }, [room.participants, room.selfId]);

  const photoTransfer = usePhotoTransfer({ socketRef: room.socketRef });

  const webRTC = useWebRTC({
    socketRef: room.socketRef,
    setStatus: room.setStatus,
    onDataChannelMessage: ({ from, index, blob, isLive, frameIndex }) => {
      if (isLive) {
        capture.storeRemoteLiveFrame(from, index, frameIndex, blob);
      } else {
        capture.storeRemoteBlob(from, index, blob);
      }
    },
    onSocketPhotoReceive: (blob, index) => photoTransfer.sendPhotoViaSocket(blob, index),
    onRemoteStream: ({ from, stream }) => {
      console.log(`[AppController] Storing remote live video stream from peer ${from}`);
      capture.setRemoteStream(stream);
    }
  });

  const capture = useCapture({
    sendPhotoToPeer: webRTC.sendPhotoToPeer,
    sendLiveFramesToPeer: webRTC.sendLiveFramesToPeer,
    sessionMode,
    onProcessingComplete: ({ localBlobs, remoteBlobsByPeer, liveFrames, remoteLiveFrames }) => {
      setCapturedParticipants(participantsWithSelf);
      setStep('frame-select');
      const remoteEntries = remoteBlobsByPeer ? Array.from(remoteBlobsByPeer.entries()) : [];
      const remoteLiveEntries = remoteLiveFrames ? Array.from(remoteLiveFrames.entries()).map(([k, v]) => [k, Array.from(v.entries())]) : [];
      saveSessionToIndexedDb({ localBlobs, remoteBlobs: remoteEntries, liveFrames, remoteLiveFrames: remoteLiveEntries });
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
    participants: capturedParticipants.length > 0 ? capturedParticipants : participantsWithSelf,
    locationsById: locationsById
  });

  const captureRef = useRef(capture);
  const frameRef = useRef(frame);
  const webRTCRef = useRef(webRTC);
  const photoTransferRef = useRef(photoTransfer);

  // --- Sync persistent refs for hooks
  useEffect(() => { selectedLayoutRef.current = selectedLayout; }, [selectedLayout]);
  useEffect(() => { captureRef.current = capture; }, [capture]);
  useEffect(() => { frameRef.current = frame; }, [frame]);
  useEffect(() => { webRTCRef.current = webRTC; }, [webRTC]);
  useEffect(() => { photoTransferRef.current = photoTransfer; }, [photoTransfer]);

  // ── AUTO MERGE RE-RUN LOGIC (DEBOUNCED) ──
  const mergeDeps = useMemo(() => [
    frame.frameMode, frame.framePresetId, frame.frameSrc, frame.showFrameText,
    frame.frameColor, frame.frameTextColor, frame.locTextLeft, frame.locTextRight,
    frame.photoFilter, frame.frameFont, frame.frameLayout, frame.frameDate,
    frame.orientation, frame.frameNoise, frame.frameGlare, frame.showWeather, frame.weatherText
  ].join('|'), [
    frame.frameMode, frame.framePresetId, frame.frameSrc, frame.showFrameText,
    frame.frameColor, frame.frameTextColor, frame.locTextLeft, frame.locTextRight,
    frame.photoFilter, frame.frameFont, frame.frameLayout, frame.frameDate,
    frame.orientation, frame.frameNoise, frame.frameGlare, frame.showWeather, frame.weatherText
  ]);

  const debouncedMergeDeps = useDebouncedValue(mergeDeps, 400);

  useEffect(() => {
    if (step !== 'frame-select') { autoApplyReadyRef.current = false; }
  }, [step]);

  useEffect(() => {
    if (step !== 'frame-select' || !frame.lastMergeCount) return;
    if (!autoApplyReadyRef.current) {
      autoApplyReadyRef.current = true;
      return;
    }
    const mergeParticipants = capturedParticipants.length > 0 ? capturedParticipants : participantsWithSelf;
    frame.mergePhotos({
      count: frame.lastMergeCount,
      participants: mergeParticipants,
      localBlobs: capture.localBlobsRef.current,
      remoteBlobsByPeer: capture.remoteBlobsRef.current,
      locationsById
    });
  }, [debouncedMergeDeps, step, frame.lastMergeCount, frame.mergePhotos, capturedParticipants, participantsWithSelf, locationsById]);

  // ── DRY HELPERS FOR INVOICE LOADING ──
  const loadInvoiceData = (orderId) => {
    Swal.fire({
      title: 'Memuat Bukti Pembayaran... ⏳',
      text: 'Harap tunggu sebentar, kami sedang menyiapkan invoice Anda.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'swal-doodle' }
    });

    return fetch(`${SERVER_URL}/api/orders/${orderId}`)
      .then(res => res.json())
      .then(data => {
        Swal.close();
        if (data.error) {
          Swal.fire('Error ❌', 'Detail pesanan tidak ditemukan di database.', 'error');
          navigateToHome();
          return null;
        } else {
          setInvoiceData(data);
          setStep('invoice');
          return data;
        }
      })
      .catch(err => {
        Swal.close();
        Swal.fire('Error ❌', 'Gagal memuat invoice dari server.', 'error');
        navigateToHome();
        return null;
      });
  };

  // ── URL SYNCING EFFECTS ──
  // ── URL SYNCING EFFECTS ──
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    
    // ── MIDTRANS REDIRECT RETURN CALLBACK INTERCEPTOR ──
    const txStatus = params.get('transaction_status');
    const statusCode = params.get('status_code');
    const orderIdParam = params.get('order_id');
    const savedStep = params.get('step');
    
    if (orderIdParam && (txStatus || statusCode)) {
      setStep('loading');
      // Clear session data to prevent accidental restoring of old step
      sessionStorage.removeItem('ldr_step');
      sessionStorage.removeItem('ldr_session_mode');
      sessionStorage.removeItem('ldr_captured_participants');
      clearSessionFromIndexedDb();

      // If settlement/capture/success, fetch the order data and direct to invoice!
      if (txStatus === 'settlement' || txStatus === 'capture' || statusCode === '200') {
        loadInvoiceData(orderIdParam).then(data => {
          if (data) {
            const cleanUrl = `${window.location.origin}${window.location.pathname}?step=invoice&order_id=${orderIdParam}`;
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
          }
        });
      } else if (txStatus === 'pending') {
        Swal.fire({
          title: 'Pembayaran Menunggu 💳',
          text: 'Transaksi Anda sedang menunggu pembayaran. Silakan selesaikan pembayaran sesuai petunjuk dari Midtrans.',
          icon: 'info',
          confirmButtonColor: '#8b5cf6',
          customClass: { popup: 'swal-doodle', title: 'swal2-title', htmlContainer: 'swal2-html-container' }
        });
        navigateToHome();
      } else {
        Swal.fire({
          title: 'Pembayaran Gagal/Batal ❌',
          text: 'Transaksi Anda gagal, ditolak, atau dibatalkan. Silakan coba kembali.',
          icon: 'error',
          confirmButtonColor: '#e11d48',
          customClass: { popup: 'swal-doodle', title: 'swal2-title', htmlContainer: 'swal2-html-container' }
        });
        navigateToHome();
      }
      
      setTimeout(() => {
        isMountedRef.current = true;
      }, 50);
      return;
    }

    const view = params.get('view');
    const mode = params.get('mode');
    const sharedRoom = params.get('room');
    const sessionStep = sessionStorage.getItem('ldr_step');
    const sessionModeStored = sessionStorage.getItem('ldr_session_mode');

    let restoredStep = 'mode-select';
    let restoredMode = null;

    if (view === 'community') {
      restoredStep = 'community';
    } else if (savedStep === 'invoice') {
      restoredStep = 'loading';
      const orderId = params.get('order_id');
      if (orderId) {
        loadInvoiceData(orderId);
      } else {
        restoredStep = 'mode-select';
      }
    } else if (sharedRoom) {
      restoredMode = 'duo';
      room.setRoomCode(sharedRoom.toUpperCase());
      const sharedSize = params.get('size');
      if (sharedSize) setGroupSize(parseInt(sharedSize, 10));
      
      const stepToRestore = savedStep || sessionStep;
      if (stepToRestore && ['frame-select', 'result', 'checkout'].includes(stepToRestore)) {
        restoredStep = stepToRestore;
      } else {
        restoredStep = 'join';
      }
    } else if (sessionStep && ['frame-select', 'result', 'checkout', 'invoice'].includes(sessionStep)) {
      restoredMode = mode || sessionModeStored || 'solo';
      restoredStep = sessionStep;
      if (sessionStep === 'invoice') {
        const orderId = params.get('order_id');
        if (orderId) {
          loadInvoiceData(orderId);
        } else {
          restoredStep = 'mode-select';
        }
      }
    } else if (mode === 'solo') {
      restoredMode = 'solo';
      if (savedStep && ['layout-select', 'join', 'frame-select', 'result', 'checkout'].includes(savedStep)) {
        restoredStep = savedStep;
      }
    }

    if (restoredMode) setSessionMode(restoredMode);
    setStep(restoredStep);

    if (['frame-select', 'result', 'checkout'].includes(restoredStep)) {
      const savedParticipants = sessionStorage.getItem('ldr_captured_participants');
      if (savedParticipants) {
        try {
          const parsed = JSON.parse(savedParticipants);
          setCapturedParticipants(parsed);
        } catch (e) {
          console.error('Failed to parse captured participants:', e);
        }
      }

      loadSessionFromIndexedDb().then(({ mergedImage, localBlobs, remoteBlobs, liveFrames, remoteLiveFrames }) => {
        if (localBlobs && localBlobs.length > 0) {
          captureRef.current.localBlobsRef.current = localBlobs;
          captureRef.current.setLocalBlobs(localBlobs);
          captureRef.current.setTotalShots(localBlobs.length);
        }
        if (remoteBlobs) {
          captureRef.current.remoteBlobsRef.current = new Map(remoteBlobs);
        }
        if (liveFrames && liveFrames.length > 0) {
          captureRef.current.liveFramesRef.current = new Map(liveFrames);
          captureRef.current.setLiveFrames(liveFrames);
        }
        if (remoteLiveFrames && remoteLiveFrames.length > 0) {
          const restoredMap = new Map(remoteLiveFrames.map(([k, v]) => [k, new Map(v)]));
          captureRef.current.remoteLiveFramesRef.current = restoredMap;
          captureRef.current.setRemoteLiveFrames(restoredMap);
        }
        if (mergedImage) {
          frameRef.current.setMergedImage(mergedImage);
        }
      });
    }

    // Mark as mounted AFTER restoring the states!
    setTimeout(() => {
      isMountedRef.current = true;
    }, 50);
  }, []);

  useEffect(() => {
    if (step === 'loading') return;
    if (!['countdown', 'processing'].includes(step)) {
      const params = new URLSearchParams(window.location.search);
      if (sessionMode === 'solo') {
        params.set('mode', 'solo');
        params.delete('room');
        params.delete('size');
      } else if (sessionMode === 'duo') {
        if (room.roomCode) {
          params.set('room', room.roomCode);
          params.set('size', groupSize);
        }
        params.delete('mode');
      }
      if (['frame-select', 'result', 'layout-select', 'room', 'join', 'checkout', 'invoice'].includes(step)) {
        params.set('step', step);
        if (step === 'invoice' && invoiceData) {
          params.set('order_id', invoiceData.id);
        } else {
          params.delete('order_id');
        }
      } else {
        params.delete('step');
        params.delete('order_id');
      }
      const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  }, [step, sessionMode, room.roomCode, groupSize, invoiceData]);

  // ── ORCHESTRATION LOGIC ──
  const handleFinishCapture = async (shots) => {
    captureRef.current.stopSessionTimer();
    setStep('processing');
    await captureRef.current.transmitAllLocalData(CHUNK_SIZE);
    await captureRef.current.checkProcessingComplete(sessionMode, participantsWithSelf.length, shots);
  };

  const handleRetakeSession = async () => {
    const shots = LAYOUTS[selectedLayoutRef.current]?.shots || 1;
    await captureRef.current.startCaptureSequence(shots, CHUNK_SIZE);
  };

  const handleRetakeSingle = async (index) => {
    await captureRef.current.startSingleShotRetake(index, CHUNK_SIZE);
  };

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
    await new Promise(r => setTimeout(r, 300));
    captureRef.current.attachStream();
    captureRef.current.startSessionTimer(60); // Tidak otomatis finish saat waktu habis
    await captureRef.current.startCaptureSequence(shots, CHUNK_SIZE);
  };

  useEffect(() => {
    capture.attachStream();
  }, [step, capture.attachStream]);

  // ── SOCKET SUBSCRIPTIONS ──
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
      } catch { }
    };
    const handleSessionLayout = (layout) => { setSelectedLayout(layout); setStep('layout-select'); };
    const handleSessionStart = (payload) => startBoothSession(payload);
    const handleGroupSizeSync = (size) => { if (typeof size === 'number') setGroupSize(size); };
    const handleRoomState = (state) => { if (state?.groupSize) setGroupSize(state.groupSize); };
    
    const handleSessionReset = () => {
      if (stepRef.current === 'frame-select' || stepRef.current === 'result') return;
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

  useEffect(() => {
    if (step === 'layout-select' && sessionMode !== 'solo' && participantsWithSelf.length > 1) {
      webRTC.connectPeers(participantsWithSelf, SOCKET_ONLY);
    }
  }, [step, sessionMode, participantsWithSelf, SOCKET_ONLY]);

  useEffect(() => {
    if (step === 'result' && frame.mergedImage) {
      setDownloadName(`ldr-photo-${Date.now()}.jpg`);
    }
  }, [step, frame.mergedImage]);

  // ── COMPONENT EVENT HANDLERS ──
  const handleModeSelect = (mode, size = 2) => {
    if (mode === 'community') { navigateToCommunity(); return; }
    setSessionMode(mode);
    setGroupSize(size);
    if (mode === 'solo') {
      const params = new URLSearchParams(window.location.search);
      params.set('mode', 'solo');
      params.set('step', 'layout-select');
      const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      capture.startCamera();
      room.setParticipants([{ id: room.selfId || 'solo-user', displayName: '', isYou: true }]);
      setStep('layout-select');
    } else {
      setStep('join');
    }
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
    setCapturedParticipants([]);
    sessionStorage.removeItem('ldr_step');
    sessionStorage.removeItem('ldr_session_mode');
    sessionStorage.removeItem('ldr_captured_participants');
    clearSessionFromIndexedDb();
  };

  const handleDownload = async (format = 'AUTO') => {
    if (!frame.mergedImage) return;
    try {
      const processedDataUrl = await convertToPaperSize(frame.mergedImage, {
        targetPaper: format,
        sessionMode: sessionMode,
        layout: frame.frameLayout,
        count: frame.lastMergeCount,
        orientation: frame.orientation,
        frameColor: frame.frameColor
      });
      const link = document.createElement('a');
      link.href = processedDataUrl;
      link.download = downloadName || `ldr-photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      const link = document.createElement('a');
      link.href = frame.mergedImage;
      link.download = downloadName || `ldr-photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReapply = () => {
    if (!frame.lastMergeCount) return;
    const mergeParticipants = capturedParticipants.length > 0 ? capturedParticipants : participantsWithSelf;
    frame.mergePhotos({
      count: frame.lastMergeCount,
      participants: mergeParticipants,
      localBlobs: capture.localBlobsRef.current,
      remoteBlobsByPeer: capture.remoteBlobsRef.current,
      locationsById
    });
  };

  const handleOpenDonate = () => {
    setDonateQrMissing(false);
    setDonateOpen(true);
  };

  const stepsToDisplay = sessionMode === 'solo' 
    ? [
        { id: 'layout-select', label: 'Layout', icon: '🎨' },
        { id: 'countdown', label: 'Capture', icon: '📸' },
        { id: 'processing', label: 'Processing', icon: '⏳' },
        { id: 'frame-select', label: 'Frame', icon: '🖼' },
        { id: 'result', label: 'Download', icon: '💾' }
      ]
    : [
        { id: 'join', label: 'Join', icon: '👋' },
        { id: 'room', label: 'Room', icon: '🏠' },
        { id: 'layout-select', label: 'Layout', icon: '🎨' },
        { id: 'countdown', label: 'Capture', icon: '📸' },
        { id: 'processing', label: 'Processing', icon: '⏳' },
        { id: 'frame-select', label: 'Frame', icon: '🖼' },
        { id: 'result', label: 'Download', icon: '💾' }
      ];

  return {
    step, setStep,
    invoiceData, setInvoiceData,
    SERVER_URL,
    sessionMode, setSessionMode,
    groupSize, setGroupSize,
    capturedParticipants,
    selectedLayout, setSelectedLayout,
    progress, setProgress,
    isFlash, setIsFlash,
    donateOpen, setDonateOpen,
    donateQrMissing, setDonateQrMissing,
    locationsById,
    downloadName,
    showHowTo, setShowHowTo,
    activeTab, setActiveTab,
    showUpload, setShowUpload,
    participantsWithSelf,
    room,
    capture,
    frame,
    webRTC,
    photoTransfer,
    stepsToDisplay,
    
    // Actions
    handleModeSelect,
    handleJoin,
    handleGoLayout,
    handleLayoutSelect,
    handleStartBooth,
    handleFinishCapture,
    handleRetakeSession,
    handleRetakeSingle,
    handleGoHome,
    handleDownload,
    handleReapply,
    handleOpenDonate
  };
}
