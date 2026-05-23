'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  onFinish: () => void;
  isTransmitting?: boolean;
  sessionMode?: string;
  participants?: any[];

  // Video Call & Background removal props
  isLiveVCActive?: boolean;
  liveVCTimeLeft?: number;
  backgroundRemovalEnabled?: boolean;
  setBackgroundRemovalEnabled?: (val: boolean) => void;
  selfieModelLoaded?: boolean;
  compositeCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  startLiveVC?: (addLocalStreamCallback: any) => void;
  stopLiveVC?: (addLocalStreamCallback: any) => void;
  addLocalStream?: (stream: any) => void;
  selfieCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

/* ──────────────────────────────────────────────────────────
   SUB-COMPONENT: PROCESSING / DEVELOPING SCREEN
   ────────────────────────────────────────────────────────── */
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
        <div className="progress-fill" id="p-fill" style={{ width: `${progress}%` }}></div>
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


/* ──────────────────────────────────────────────────────────
   MAIN LIVE SCREEN COMPONENT
   ────────────────────────────────────────────────────────── */
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
  onFinish,
  sessionMode = 'live',
  participants = [],

  // Destructure Video Call & Background removal APIs
  isLiveVCActive = false,
  liveVCTimeLeft = 60,
  backgroundRemovalEnabled = true,
  setBackgroundRemovalEnabled,
  selfieModelLoaded = false,
  compositeCanvasRef,
  remoteVideoRef,
  startLiveVC,
  stopLiveVC,
  addLocalStream,
  selfieCanvasRef
}: LiveCaptureScreenProps) {
  const { t } = useLanguage();
  const [selectedRetakeIdx, setSelectedRetakeIdx] = useState<number | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([]);

  // Safe object URL preview management
  useEffect(() => {
    const urls = Array.from({ length: totalShots }).map((_, i) => {
      const blob = localBlobs[i];
      return blob ? URL.createObjectURL(blob) : null;
    });

    setPhotoPreviews(urls);

    return () => {
      urls.forEach(url => {
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

  // Extract names for Google Meet-like badges
  const names = useMemo(() => {
    const local = participants.find(p => p.isYou)?.displayName || 'Anda';
    const remote = participants.find(p => !p.isYou)?.displayName || 'Partner';
    return { local, remote };
  }, [participants]);

  if (isProcessing) {
    return <ProcessingSubScreen progress={progress} t={t} />;
  }

  const isTimeOut = sessionTimeLeft !== null && sessionTimeLeft <= 0;

  return (
    <section className="page active" id="page-capture">
      <div className="capture-full">
        
        {/* Google Meet styled video dashboard container */}
        <div style={styles.meetLayoutContainer}>
          
          {/* Pro Session Timer */}
          {sessionTimeLeft !== null && (
            <div
              className="session-timer-badge"
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                zIndex: 100,
                background: sessionTimeLeft <= 10 ? 'rgba(255, 82, 82, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                animation: sessionTimeLeft <= 10 ? 'pulse 1s infinite' : 'none'
              }}
            >
              Session: {sessionTimeLeft}s
            </div>
          )}

          {/* Central Countdown Overlay (Visible in the center of the video grid) */}
          {countdown !== null && (
            <div style={styles.countdownOverlay}>
              <span style={styles.countdownNumber}>{countdown}</span>
            </div>
          )}

          {/* Action Overlay (When finished) */}
          {isFinishedAllShots && countdown === null && (
             <div className="capture-action-overlay" style={styles.actionOverlay}>
               <div className="capture-action-text">
                 {t('capture.niceShots')}<br/>
                 <span style={{ fontSize: '18px', opacity: 0.9 }}>
                   {isTimeOut 
                     ? "⏳ Waktu habis, kamu sudah tidak bisa retake lagi."
                     : selectedRetakeIdx !== null 
                       ? t('capture.selectedPhoto', { num: selectedRetakeIdx + 1 }) 
                       : t('capture.useOrRetake')}
                 </span>
               </div>

               <div className="capture-action-buttons" style={{ marginTop: '20px' }}>
                 <button
                   type="button"
                   onClick={handleRetakeClick}
                   disabled={isTimeOut}
                   className="btn-share retake-btn"
                   style={{
                     boxShadow: selectedRetakeIdx !== null ? '4px 4px 0 #FF5252' : '4px 4px 0 #1a1a2e',
                     borderColor: selectedRetakeIdx !== null ? '#FF5252' : '#1a1a2e',
                     opacity: isTimeOut ? 0.5 : 1,
                     cursor: isTimeOut ? 'not-allowed' : 'pointer',
                     transform: selectedRetakeIdx !== null ? 'scale(1.05)' : 'none'
                   }}
                 >
                   {selectedRetakeIdx !== null 
                     ? `RETAKE #${selectedRetakeIdx + 1}` 
                     : (t('action.retake') || 'RETAKE ALL').toUpperCase()}
                 </button>

                 <button
                   type="button"
                   onClick={onFinish}
                   className="btn-dl finish-btn"
                 >
                   {(t('action.done') || 'Done & Send').toUpperCase()}
                 </button>
               </div>
             </div>
          )}

          {/* ── GOOGLE MEET STYLE DUAL VIDEO CARDS ── */}
          <div style={styles.meetGrid}>
            
            {/* LEFT CARD: Local User (Kamu) */}
            <div className="squiggle" style={styles.meetCard}>
              <div style={styles.meetCardInner}>
                
                {/* AI Transparent Selfie Canvas or fallbacks */}
                {backgroundRemovalEnabled && selfieModelLoaded ? (
                  <canvas
                    ref={selfieCanvasRef}
                    style={styles.meetVideoMirrored}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={styles.meetVideoMirrored}
                  />
                )}

                {/* Glassmorphic Name Tag */}
                <div style={styles.nameBadge}>
                  <span style={styles.badgeName}>{names.local} (Anda)</span>
                </div>

                {/* AI Active Indicator */}
                {backgroundRemovalEnabled && selfieModelLoaded && (
                  <div style={styles.aiBadge}>
                    <span>✨ AI Active</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT CARD: Remote Partner */}
            <div className="squiggle" style={styles.meetCard}>
              <div style={styles.meetCardInner}>
                
                {/* Remote WebRTC video or offline placeholder */}
                {isLiveVCActive && remoteVideoRef ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={styles.meetVideo}
                  />
                ) : (
                  <div style={styles.offlinePlaceholder}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Menunggu Panggilan Live...</div>
                    <div style={{ fontSize: '14px', opacity: 0.6, marginTop: '4px' }}>Klik tombol "Mulai VC Live" di bawah</div>
                  </div>
                )}

                {/* Glassmorphic Name Tag */}
                <div style={styles.nameBadge}>
                  <span style={styles.badgeName}>{names.remote}</span>
                </div>

                {/* Connection Live/Offline Indicator */}
                <div style={{
                  ...styles.statusBadge,
                  background: isLiveVCActive ? 'rgba(6, 214, 160, 0.85)' : 'rgba(0,0,0,0.6)'
                }}>
                  <div style={{
                    ...styles.statusDot,
                    background: isLiveVCActive ? '#06d6a0' : '#888',
                    animation: isLiveVCActive ? 'blink 1.5s infinite' : 'none'
                  }} />
                  <span>{isLiveVCActive ? '🟢 Live' : '⏳ Offline'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Off-screen / Hidden Composite Canvas for Joint photo captures */}
          <canvas
            ref={compositeCanvasRef}
            style={{ display: 'none' }}
          />
        </div>

        {/* ── LIVE VIDEO CALL & AI SEGMENTATION CONTROL PANEL ── */}
        <div style={styles.vcControlPanel}>
          {/* AI Background removal toggle */}
          <div style={styles.controlRow}>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={backgroundRemovalEnabled}
                onChange={(e) => setBackgroundRemovalEnabled && setBackgroundRemovalEnabled(e.target.checked)}
                style={styles.checkboxInput}
              />
              <span style={{ fontSize: '15px', fontWeight: 'bold' }}>✨ Live Background Removal</span>
            </label>
            {backgroundRemovalEnabled && !selfieModelLoaded && (
              <span style={styles.loadingSpinner}>
                <div style={styles.spinner} />
                Memuat AI...
              </span>
            )}
            {backgroundRemovalEnabled && selfieModelLoaded && (
              <span style={styles.modelLoadedBadge}>✓ AI Active</span>
            )}
          </div>

          {/* WebRTC Video Call limits */}
          <div style={styles.vcRow}>
            {isLiveVCActive ? (
              <>
                <div style={styles.activeVCTime}>
                  <span style={styles.liveIndicator} />
                  🟢 VC AKTIF: <strong>{liveVCTimeLeft}s</strong>
                </div>
                <button
                  type="button"
                  onClick={() => stopLiveVC && stopLiveVC(addLocalStream)}
                  style={styles.stopVCBtn}
                >
                  🔴 Matikan VC
                </button>
              </>
            ) : (
              <>
                <div style={styles.inactiveVCText}>
                  🎥 Sesi Live Video Call (P2P stream • Batas 60s)
                </div>
                <button
                  type="button"
                  disabled={isFinishedAllShots}
                  onClick={() => startLiveVC && startLiveVC(addLocalStream)}
                  style={{
                    ...styles.startVCBtn,
                    opacity: isFinishedAllShots ? 0.5 : 1,
                    cursor: isFinishedAllShots ? 'not-allowed' : 'pointer'
                  }}
                >
                  ⚡ Mulai VC Live
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thumbnail Preview Strip */}
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
                        ? '2px solid rgba(255, 255, 255, 0.5)' 
                        : 'none',
                    transform: isThisSelected ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isThisSelected ? '0 4px 12px rgba(255, 215, 0, 0.4)' : 'none',
                    zIndex: isThisSelected ? 10 : 1,
                    cursor: canRetakeThis ? 'pointer' : 'default',
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
                        alt={`Shot ${i+1}`} 
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
                            background: isThisSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0,0,0,0.3)',
                          }}
                        >
                          {isThisSelected ? 'Selected' : 'Select'}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="strip-thumb-num">{i + 1}</span>
                      <span className="strip-thumb-label">{i === currentShotIndex ? 'READY' : ''}</span>
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

/* ──────────────────────────────────────────────────────────
   STYLES FOR MEET DUAL VIDEO GRID
   ────────────────────────────────────────────────────────── */
const styles = {
  meetLayoutContainer: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center'
  },
  meetGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    width: '100%',
    aspectRatio: '16/9',
  },
  meetCard: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: '16px',
    background: '#1a1a2e',
  },
  meetCardInner: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff9e6', // Cream Studios matching backplate
  },
  meetVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block'
  },
  meetVideoMirrored: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
    transform: 'scaleX(-1)', // Mirrored for intuitive local user posing
  },
  offlinePlaceholder: {
    textAlign: 'center' as const,
    fontFamily: "'Gaegu', cursive",
    color: 'var(--ink)',
    zIndex: 1,
    padding: '24px',
  },
  nameBadge: {
    position: 'absolute' as const,
    bottom: '16px',
    left: '16px',
    zIndex: 10,
    background: 'rgba(26, 26, 46, 0.65)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1.5px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '6px 14px',
  },
  badgeName: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    fontFamily: "'Gaegu', cursive",
    letterSpacing: '0.5px'
  },
  aiBadge: {
    position: 'absolute' as const,
    top: '16px',
    right: '16px',
    zIndex: 10,
    background: 'var(--ink)',
    border: '2px solid var(--yellow)',
    borderRadius: '20px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: 'var(--yellow)',
    fontFamily: "'Gaegu', cursive",
  },
  statusBadge: {
    position: 'absolute' as const,
    top: '16px',
    right: '16px',
    zIndex: 10,
    border: '1.5px solid rgba(255,255,255,0.15)',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    color: '#ffffff',
    fontFamily: "'Gaegu', cursive",
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  countdownOverlay: {
    position: 'absolute' as const,
    inset: 0,
    zIndex: 50,
    background: 'rgba(26, 26, 46, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const,
    borderRadius: '16px',
    animation: 'popIn 0.3s ease'
  },
  countdownNumber: {
    fontSize: '140px',
    fontWeight: '900' as const,
    color: '#ffffff',
    textShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily: "'VT323', monospace",
  },
  actionOverlay: {
    position: 'absolute' as const,
    inset: 0,
    zIndex: 60,
    background: 'rgba(26, 26, 46, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    padding: '24px',
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
  thumbnail: {
    width: '160px', 
    height: '120px', 
    overflow: 'hidden', 
    background: '#000',
    position: 'relative' as const,
    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  vcControlPanel: {
    margin: '16px auto',
    width: '100%',
    maxWidth: '1200px',
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(8px)',
    border: '2px solid var(--ink)',
    borderRadius: '16px',
    padding: '12px 18px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: "'Gaegu', cursive",
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    color: 'var(--ink)',
  },
  checkboxInput: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: 'var(--pink)',
  },
  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#888',
  },
  spinner: {
    width: '12px',
    height: '12px',
    border: '2px solid var(--ink)',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  modelLoadedBadge: {
    background: 'var(--ink)',
    color: 'var(--yellow)',
    fontSize: '12px',
    fontWeight: 'bold' as const,
    padding: '2px 8px',
    borderRadius: '10px',
  },
  vcRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: "'Gaegu', cursive",
    borderTop: '1px dashed rgba(0,0,0,0.1)',
    paddingTop: '10px',
  },
  activeVCTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    color: 'var(--ink)',
  },
  liveIndicator: {
    width: '8px',
    height: '8px',
    background: '#ff5252',
    borderRadius: '50%',
    animation: 'pulse 1s infinite',
  },
  stopVCBtn: {
    background: '#ff5252',
    color: 'white',
    border: '2px solid var(--ink)',
    borderRadius: '10px',
    padding: '4px 12px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    cursor: 'pointer',
    boxShadow: '2px 2px 0 var(--ink)',
  },
  inactiveVCText: {
    fontSize: '15px',
    opacity: 0.8,
    color: 'var(--ink)',
  },
  startVCBtn: {
    background: 'var(--yellow)',
    color: 'var(--ink)',
    border: '2px solid var(--ink)',
    borderRadius: '10px',
    padding: '4px 12px',
    fontSize: '14px',
    fontWeight: 'bold' as const,
    boxShadow: '2px 2px 0 var(--ink)',
  },
};
