'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

interface LiveCaptureScreenProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  countdown: number | null;
  totalShots: number;
  currentShotIndex: number;
  progress: number;
  isProcessing: boolean;
  localBlobs?: Blob[];
  livePhotoEnabled: boolean;
  setLivePhotoEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  sessionTimeLeft: number | null;
  onRetake: () => void;
  onRetakeSingle: (index: number) => void;
  onCaptureNextShot: () => void | Promise<void>;
  onFinish: () => void;
  participants?: any[];
  isLiveVCActive?: boolean;
  liveVCTimeLeft?: number;
  hasRemoteStream?: boolean;
  compositeCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  startLiveVC?: () => void | Promise<void>;
  stopLiveVC?: () => void | Promise<void>;
}

interface ProcessingScreenProps {
  progress: number;
  t: (key: string) => string;
}

const ProcessingSubScreen = React.memo(({ progress, t }: ProcessingScreenProps) => (
  <section className="page active" id="page-processing">
    <div className="proc-title">
      {t('capture.developing')}<br />
      <span className="outline">{t('capture.yourFilm')}</span>
    </div>

    <div style={styles.processingBarContainer}>
      <div className="progress-track" style={styles.w100}>
        <div className="progress-fill" id="p-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="progress-label" id="p-pct">{progress}%</p>
    </div>

    <div className="processing-steps">
      {[
        { threshold: 10, key: 'capture.scanning' },
        { threshold: 40, key: 'capture.adding' },
        { threshold: 70, key: 'capture.syncing' },
        { threshold: 100, key: 'capture.finalising', exact: true }
      ].map((step, idx) => {
        const isDone = step.exact ? progress === 100 : progress > step.threshold;
        return (
          <div key={idx} className={`p-step ${isDone ? 'done' : ''}`} id={`ps${idx + 1}`}>
            <div className="p-dot" />
            <span>{t(step.key)}</span>
          </div>
        );
      })}
    </div>
  </section>
));
ProcessingSubScreen.displayName = 'ProcessingSubScreen';

export default function LiveCaptureScreen({
  videoRef,
  countdown,
  totalShots,
  currentShotIndex,
  progress,
  isProcessing,
  localBlobs = [],
  livePhotoEnabled,
  setLivePhotoEnabled,
  sessionTimeLeft,
  onRetake,
  onRetakeSingle,
  onCaptureNextShot,
  onFinish,
  participants = [],
  isLiveVCActive = false,
  liveVCTimeLeft = 60,
  hasRemoteStream = false,
  compositeCanvasRef,
  remoteVideoRef,
  startLiveVC,
  stopLiveVC
}: LiveCaptureScreenProps) {
  const { t } = useLanguage();
  const [selectedRetakeIdx, setSelectedRetakeIdx] = useState<number | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([]);

  useEffect(() => {
    const urls = Array.from({ length: totalShots }).map((_, i) => {
      const blob = localBlobs[i];
      return blob ? URL.createObjectURL(blob) : null;
    });

    setPhotoPreviews(urls);
    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [localBlobs, totalShots]);

  const handleRetakeClick = () => {
    if (selectedRetakeIdx !== null) {
      onRetakeSingle(selectedRetakeIdx);
      setSelectedRetakeIdx(null);
    } else {
      onRetake();
    }
  };

  const isFinishedAllShots = useMemo(() => {
    return totalShots > 0 && localBlobs.filter(Boolean).length === totalShots;
  }, [localBlobs, totalShots]);

  const names = useMemo(() => {
    const local = participants.find((p) => p.isYou)?.displayName || 'Anda';
    const remote = participants.find((p) => !p.isYou)?.displayName || 'Partner';
    return { local, remote };
  }, [participants]);

  if (isProcessing) {
    return <ProcessingSubScreen progress={progress} t={t} />;
  }

  const isTimeOut = sessionTimeLeft !== null && sessionTimeLeft <= 0;
  const shotsTaken = localBlobs.filter(Boolean).length;
  const safeTotalShots = Math.max(totalShots, 1);
  const nextShotNumber = Math.min(shotsTaken + 1, safeTotalShots);
  const isWaitingPartner = isLiveVCActive && !hasRemoteStream;
  const captureDisabled = isFinishedAllShots || countdown !== null || !isLiveVCActive || !hasRemoteStream || isTimeOut;

  const activeTimeLeft = sessionTimeLeft !== null ? sessionTimeLeft : (isLiveVCActive && hasRemoteStream ? liveVCTimeLeft : null);

  return (
    <section className="page active" id="page-capture" style={{ flexDirection: 'column', alignItems: 'center', background: 'var(--cream)', minHeight: 'calc(100vh - 60px)', padding: '24px 0' }}>
      
      {/* Handdrawn Header Title Row */}
      <div className="page-title-row" style={{ justifyContent: 'center', marginBottom: '24px', textAlign: 'center', fontFamily: "'Gaegu', cursive" }}>
        <div className="page-title" style={{ fontSize: '36px', fontWeight: 'bold' }}>{t('live.title')}</div>
        <p style={{ fontSize: '18px', opacity: 0.7, marginTop: '6px' }}>
          {t('live.subtitle')}
        </p>
      </div>

      <div className="capture-full" style={{ background: 'transparent', width: '100%', flex: 1, padding: '0 40px', boxSizing: 'border-box' }}>
        <div style={styles.mainContent}>
          
          <div className="live-videos-container">
             {/* Pro Session Timer */}
             {activeTimeLeft !== null && (
               <div
                 className="session-timer-badge"
                 style={{
                   background: activeTimeLeft <= 10 ? '#ff5252' : '#ffffff',
                   color: activeTimeLeft <= 10 ? '#ffffff' : 'var(--ink)',
                   animation: activeTimeLeft <= 10 ? 'pulse 1s infinite' : 'none',
                 }}
               >
                 {activeTimeLeft}s
               </div>
             )}
             <button
               type="button"
               onClick={() => setLivePhotoEnabled((prev) => !prev)}
               disabled={isFinishedAllShots}
               className={`live-toggle-btn ${livePhotoEnabled ? 'active' : ''}`}
               style={{
                 cursor: isFinishedAllShots ? 'default' : 'pointer',
                 opacity: isFinishedAllShots ? 0.5 : 1,
                 position: 'absolute',
                 top: '18px',
                 right: '20px',
                 zIndex: 20,
                 display: 'flex',
                 alignItems: 'center',
                 gap: '8px',
                 fontFamily: "'Gaegu', cursive",
                 fontWeight: 'bold',
                 fontSize: '16px',
                 padding: '8px 16px',
                 borderRadius: '20px',
                 border: '2.5px solid var(--ink)',
                 background: livePhotoEnabled ? 'var(--pink)' : '#fff',
                 color: 'var(--ink)',
                 boxShadow: '2.5px 2.5px 0 var(--ink)',
               }}
             >
               <div
                 style={{
                   width: '10px',
                   height: '10px',
                   borderRadius: '50%',
                   background: livePhotoEnabled ? '#fff' : '#888',
                   border: '1.5px solid var(--ink)',
                   boxShadow: livePhotoEnabled ? '0 0 8px #fff' : 'none'
                 }}
               />
               {livePhotoEnabled ? 'LIVE: ON' : 'LIVE: OFF'}
             </button>

             <div style={styles.statusRow}>
               <div style={styles.statusPill}>{t('live.taken', { taken: shotsTaken, total: safeTotalShots })}</div>
               <div style={styles.statusPill}>
                 {!isLiveVCActive ? t('live.vcOff') : hasRemoteStream ? t('live.vcOn') : t('live.connecting')}
               </div>
             </div>

             {/* Local Video Card */}
             <div style={styles.videoCard}>
               <video 
                 ref={videoRef} 
                 autoPlay 
                 playsInline 
                 muted 
                 style={{
                   width: '100%',
                   height: '100%',
                   objectFit: 'cover',
                   transform: 'scaleX(-1)'
                 }} 
               />
               <div className="cam-guide-overlay">
                 <div className="guide-box">
                   <div className="guide-corner tl" />
                   <div className="guide-corner tr" />
                   <div className="guide-corner bl" />
                   <div className="guide-corner br" />
                   <div className="guide-lines-v" />
                   <div className="guide-lines-h" />
                 </div>
               </div>
               <div style={styles.cardLabel}>{names.local} (Anda)</div>
             </div>

             {/* Remote Video Card */}
             <div style={styles.videoCard}>
               {hasRemoteStream ? (
                 <video 
                   ref={remoteVideoRef} 
                   autoPlay 
                   playsInline 
                   muted 
                   style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                   }} 
                 />
               ) : (
                 <div style={styles.videoPlaceholder}>
                   {!isLiveVCActive ? t('live.vcNotEnabled') : t('live.connectingPartner')}
                 </div>
               )}
              
              <div style={styles.cardLabel}>{names.remote}</div>
            </div>

            {/* Big Countdown Overlay (covers video area) */}
            {countdown !== null && (
              <div 
                className="cam-countdown-overlay" 
                style={{ 
                  borderRadius: '16px', 
                  zIndex: 30, 
                  background: 'rgba(255, 253, 245, 0.6)', 
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)'
                }}
              >
                <span 
                  className="cam-countdown-num"
                  style={{
                    color: 'var(--pink)',
                    textShadow: '4px 4px 0 var(--ink)',
                    WebkitTextStroke: '2px var(--ink)',
                    fontSize: '180px'
                  }}
                >
                  {countdown}
                </span>
              </div>
            )}

            {/* Finished / Retake Overlay (covers video area) */}
            {isFinishedAllShots && countdown === null && (
              <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255, 253, 245, 0.9)',
                  zIndex: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '18px',
                  border: '3.5px solid var(--ink)',
                  gap: '24px',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  padding: '24px',
                  animation: 'fadeIn 0.3s ease'
                }}
              >
                <div 
                  style={{
                    color: 'var(--ink)',
                    fontSize: '32px',
                    fontFamily: "'Gaegu', cursive",
                    textAlign: 'center',
                    fontWeight: 'bold',
                    lineHeight: '1.3'
                  }}
                >
                  {t('capture.niceShots')}<br />
                  <span style={{ fontSize: '18px', opacity: 0.8, display: 'block', marginTop: '8px' }}>
                    {isTimeOut
                      ? '⏳ Waktu habis, kamu sudah tidak bisa retake lagi.'
                      : selectedRetakeIdx !== null
                        ? t('capture.selectedPhoto', { num: selectedRetakeIdx + 1 })
                        : t('capture.useOrRetake')}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '16px', width: '90%', maxWidth: '400px' }}>
                  <button
                    type="button"
                    onClick={handleRetakeClick}
                    disabled={isTimeOut}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      padding: '14px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      fontFamily: "'Gaegu', cursive",
                      boxShadow: selectedRetakeIdx !== null ? '4px 4px 0 #FF5252' : '4px 4px 0 var(--ink)',
                      borderColor: selectedRetakeIdx !== null ? '#FF5252' : 'var(--ink)',
                      borderWidth: '2.5px',
                      borderRadius: '12px',
                      opacity: isTimeOut ? 0.5 : 1,
                      cursor: isTimeOut ? 'not-allowed' : 'pointer',
                      transform: selectedRetakeIdx !== null ? 'scale(1.05)' : 'none',
                      background: '#fff',
                      color: 'var(--ink)'
                    }}
                  >
                    {selectedRetakeIdx !== null
                      ? `RETAKE #${selectedRetakeIdx + 1}`
                      : (t('action.retake') || 'RETAKE ALL').toUpperCase()}
                  </button>

                  <button 
                    type="button" 
                    onClick={onFinish} 
                    className="btn-primary"
                    style={{
                      flex: 1,
                      padding: '14px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      fontFamily: "'Gaegu', cursive",
                      background: 'var(--yellow)',
                      color: 'var(--ink)',
                      borderWidth: '2.5px',
                      borderColor: 'var(--ink)',
                      borderRadius: '12px',
                      boxShadow: '4px 4px 0 var(--ink)'
                    }}
                  >
                    {(t('action.done') || 'Done & Send').toUpperCase()}
                  </button>
                </div>
              </div>
            )}
          </div>

          <canvas ref={compositeCanvasRef} style={{ display: 'none' }} />

          <div style={styles.bottomControls}>
            {!isLiveVCActive ? (
              <button 
                type="button" 
                onClick={() => startLiveVC && startLiveVC()} 
                style={styles.startVCBtn}
              >
                {t('live.startVc')}
              </button>
            ) : (
              <button
                type="button"
                disabled={captureDisabled}
                onClick={() => onCaptureNextShot()}
                style={{
                  ...styles.takeBtn,
                  opacity: captureDisabled ? 0.55 : 1,
                  cursor: captureDisabled ? 'not-allowed' : 'pointer'
                }}
              >
                {!hasRemoteStream
                  ? t('live.waitingPartnerButton')
                  : countdown !== null
                    ? t('live.timerRunning')
                    : `Take ${nextShotNumber}/${safeTotalShots}`}
              </button>
            )}
          </div>
        </div>

        <div className="capture-strip-bar">
          <div className="strip-bar-slots">
            {Array.from({ length: totalShots }).map((_, i) => {
              const isPhotoTaken = !!photoPreviews[i];
              const canRetakeThis = isFinishedAllShots && isPhotoTaken && countdown === null && !isTimeOut;
              const isThisSelected = selectedRetakeIdx === i;

              return (
                <div
                  key={i}
                  className={`strip-thumb ${i < currentShotIndex ? 'taken' : i === currentShotIndex ? 'current' : ''}`}
                  style={{
                    ...styles.thumbnail,
                    border: isThisSelected
                      ? '4px solid #FFD700'
                      : canRetakeThis
                        ? '3px solid var(--ink)'
                        : '3px solid var(--ink)',
                    transform: isThisSelected ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isThisSelected ? '0 4px 12px rgba(255, 215, 0, 0.4)' : '4px 4px 0 var(--ink)',
                    zIndex: isThisSelected ? 10 : 1,
                    cursor: canRetakeThis ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (canRetakeThis) {
                      setSelectedRetakeIdx(isThisSelected ? null : i);
                    }
                  }}
                >
                  {photoPreviews[i] ? (
                    <>
                      <img
                        src={photoPreviews[i]!}
                        alt={`Shot ${i + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: canRetakeThis ? 0.8 : 1
                        }}
                      />
                      {canRetakeThis && (
                        <div
                          className="strip-thumb-retake-overlay"
                          style={{
                            background: isThisSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0,0,0,0.3)'
                          }}
                        >
                          {isThisSelected ? 'Selected' : 'Select'}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="strip-thumb-num" style={{ color: 'var(--ink)' }}>{i + 1}</span>
                      <span className="strip-thumb-label" style={{ color: 'var(--pink)' }}>{i === currentShotIndex ? 'READY' : ''}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const styles = {
  mainContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    height: '100%',
    justifyContent: 'space-between',
    padding: '20px',
    boxSizing: 'border-box' as const,
    position: 'relative' as const,
    minWidth: '0',
  },
  videoCard: {
    flex: 1,
    aspectRatio: '16/9',
    width: '100%',
    maxHeight: '90%',
    background: '#fff',
    border: '3.5px solid var(--ink)',
    borderRadius: '18px',
    boxShadow: '6px 6px 0 var(--ink)',
    overflow: 'hidden',
    position: 'relative' as const,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink)',
    opacity: 0.7,
    fontFamily: "'Gaegu', cursive",
    fontSize: '22px',
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
    padding: '20px',
    height: '100%',
    width: '100%',
    background: 'var(--cream-dk, #eedec9)',
  },
  cardLabel: {
    position: 'absolute' as const,
    bottom: '12px',
    left: '12px',
    background: 'var(--yellow)',
    color: 'var(--ink)',
    border: '2.5px solid var(--ink)',
    borderRadius: '10px',
    padding: '6px 14px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    fontFamily: "'Gaegu', cursive",
    boxShadow: '2.5px 2.5px 0 var(--ink)',
    zIndex: 5,
  },
  relative: {
    position: 'relative' as const,
  },
  w100: {
    width: '100%',
  },
  processingBarContainer: {
    width: '480px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    alignItems: 'center',
  },
  compositeCanvas: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    borderRadius: '10px',
    display: 'block',
    background: '#000',
  },
  hiddenMedia: {
    display: 'none',
  },
  statusRow: {
    position: 'absolute' as const,
    top: '18px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 16,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  statusPill: {
    background: '#fff',
    color: 'var(--ink)',
    border: '2.5px solid var(--ink)',
    borderRadius: '12px',
    padding: '7px 14px',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    fontFamily: "'Gaegu', cursive",
    boxShadow: '2.5px 2.5px 0 var(--ink)',
  },
  nameRow: {
    position: 'absolute' as const,
    left: '20px',
    right: '20px',
    bottom: '18px',
    zIndex: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  namePill: {
    background: 'rgba(26, 26, 46, 0.72)',
    color: '#fff',
    borderRadius: '999px',
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    fontFamily: "'Gaegu', cursive",
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  helperOverlay: {
    position: 'absolute' as const,
    inset: 0,
    zIndex: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const,
    padding: '28px',
  },
  helperCard: {
    maxWidth: '420px',
    textAlign: 'center' as const,
    background: 'rgba(255, 249, 230, 0.88)',
    color: 'var(--ink)',
    border: '2px solid rgba(26, 26, 46, 0.12)',
    borderRadius: '18px',
    padding: '18px 22px',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    fontFamily: "'Gaegu', cursive",
  },
  helperTitle: {
    fontSize: '28px',
    fontWeight: 'bold' as const,
    lineHeight: 1.05,
  },
  helperText: {
    marginTop: '8px',
    fontSize: '18px',
    lineHeight: 1.25,
    opacity: 0.85,
  },
  bottomControls: {
    margin: '-25px auto 0', // Overlaps the bottom border elegantly
    position: 'relative' as const,
    zIndex: 50,
    width: 'fit-content',
    maxWidth: '96%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
    fontFamily: "'Gaegu', cursive",
  },
  startVCBtn: {
    background: 'var(--teal)',
    color: 'var(--ink)',
    border: '3px solid var(--ink)',
    borderRadius: '16px',
    padding: '20px 40px',
    fontSize: '24px',
    fontWeight: 'bold' as const,
    boxShadow: '6px 6px 0 var(--ink)',
    minWidth: '320px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: "'Gaegu', cursive",
  },
  stopVCBtn: {
    background: '#ff5252',
    color: '#fff',
    border: '2px solid var(--ink)',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    boxShadow: '2px 2px 0 var(--ink)',
  },
  takeBtn: {
    background: 'var(--yellow)',
    color: 'var(--ink)',
    border: '3px solid var(--ink)',
    borderRadius: '16px',
    padding: '20px 40px',
    fontSize: '24px',
    fontWeight: 'bold' as const,
    boxShadow: '6px 6px 0 var(--ink)',
    minWidth: '320px',
    textAlign: 'center' as const,
    transition: 'all 0.15s ease',
    fontFamily: "'Gaegu', cursive",
  },
  thumbnail: {
    width: '160px',
    height: '120px',
    overflow: 'hidden',
    background: '#fff',
    border: '3px solid var(--ink)',
    borderRadius: '12px',
    boxShadow: '4px 4px 0 var(--ink)',
    position: 'relative' as const,
    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};
