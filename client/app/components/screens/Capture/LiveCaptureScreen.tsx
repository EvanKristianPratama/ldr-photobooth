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
  const captureDisabled = isFinishedAllShots || countdown !== null || !isLiveVCActive || !hasRemoteStream || isTimeOut;

  const activeTimeLeft = sessionTimeLeft !== null ? sessionTimeLeft : (isLiveVCActive && hasRemoteStream ? liveVCTimeLeft : null);

  return (
    <section className="page active" id="page-capture">
      <div className="capture-full">
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px',
          minWidth: '0',
          position: 'relative'
        }}>
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

            {/* LIVE Photo Toggle */}
            <button
              type="button"
              onClick={() => setLivePhotoEnabled((prev) => !prev)}
              disabled={isFinishedAllShots}
              className={`live-toggle-btn ${livePhotoEnabled ? 'active' : ''}`}
              style={{
                cursor: isFinishedAllShots ? 'default' : 'pointer',
                opacity: isFinishedAllShots ? 0.5 : 1,
                background: livePhotoEnabled ? 'var(--pink)' : 'rgba(26, 26, 46, 0.75)',
                color: '#fff',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: livePhotoEnabled ? '#fff' : '#888',
                  boxShadow: livePhotoEnabled ? '0 0 8px #fff' : 'none'
                }}
              />
              {livePhotoEnabled ? 'LIVE: ON' : 'LIVE: OFF'}
            </button>

            {/* Status Row */}
            <div style={styles.statusRow}>
              <div style={styles.statusPill}>{t('live.taken', { taken: shotsTaken, total: safeTotalShots })}</div>
              <div style={styles.statusPill}>
                {!isLiveVCActive ? t('live.vcOff') : hasRemoteStream ? t('live.vcOn') : t('live.connecting')}
              </div>
            </div>

            {/* Local Video Card */}
            <div className="camera-card live-video-card" style={styles.relative}>
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
              <div style={styles.cardLabel}>{names.local}</div>
            </div>

            {/* Remote Video Card */}
            <div className="camera-card live-video-card" style={styles.relative}>
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

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="cam-countdown-overlay">
                <span className="cam-countdown-num">{countdown}</span>
              </div>
            )}

            {/* Finished / Retake Overlay */}
            {isFinishedAllShots && countdown === null && (
              <div className="capture-action-overlay">
                <div className="capture-action-text">
                  {t('capture.niceShots')}<br />
                  <span>
                    {isTimeOut
                      ? '⏳ Waktu habis, kamu sudah tidak bisa retake lagi.'
                      : selectedRetakeIdx !== null
                        ? t('capture.selectedPhoto', { num: selectedRetakeIdx + 1 })
                        : t('capture.useOrRetake')}
                  </span>
                </div>

                <div className="capture-action-buttons">
                  <button
                    type="button"
                    onClick={handleRetakeClick}
                    disabled={isTimeOut}
                    className="btn-share retake-btn"
                    style={{
                      flex: 1,
                      padding: '14px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      fontFamily: "'Gaegu', cursive",
                      boxShadow: selectedRetakeIdx !== null ? '4px 4px 0 #FF5252' : '4px 4px 0 #1a1a2e',
                      borderColor: selectedRetakeIdx !== null ? '#FF5252' : '#1a1a2e',
                      opacity: isTimeOut ? 0.5 : 1,
                      cursor: isTimeOut ? 'not-allowed' : 'pointer',
                      transform: selectedRetakeIdx !== null ? 'scale(1.05)' : 'none',
                      background: '#fff',
                      color: '#1a1a2e',
                      borderWidth: '2.5px',
                      borderRadius: '12px',
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
                      boxShadow: '4px 4px 0 var(--ink)',
                      cursor: 'pointer',
                    }}
                  >
                    {(t('action.done') || 'Done & Send').toUpperCase()}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Button - Center Aligned */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '16px',
            zIndex: 50,
          }}>
            {!isLiveVCActive ? (
              <button
                type="button"
                onClick={() => startLiveVC && startLiveVC()}
                className="btn-dl"
                style={{
                  ...styles.actionBtn,
                  background: 'var(--yellow)',
                  color: 'var(--ink)',
                  boxShadow: '4px 4px 0 var(--ink)',
                  border: '3px solid var(--ink)',
                  borderRadius: '14px',
                }}
              >
                {t('live.startVc')}
              </button>
            ) : (
              <button
                type="button"
                disabled={captureDisabled}
                onClick={() => onCaptureNextShot()}
                className="btn-dl"
                style={{
                  ...styles.actionBtn,
                  opacity: captureDisabled ? 0.55 : 1,
                  cursor: captureDisabled ? 'not-allowed' : 'pointer',
                  background: 'var(--yellow)',
                  color: 'var(--ink)',
                  boxShadow: '4px 4px 0 var(--ink)',
                  border: '3px solid var(--ink)',
                  borderRadius: '14px',
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

        <canvas ref={compositeCanvasRef} style={{ display: 'none' }} />

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

const styles = {
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
  videoPlaceholder: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Gaegu', cursive",
    fontSize: '18px',
    textAlign: 'center' as const,
    padding: '20px',
    width: '100%',
    height: '100%',
  },
  cardLabel: {
    position: 'absolute' as const,
    bottom: '10px',
    left: '10px',
    background: 'rgba(0, 0, 0, 0.55)',
    color: '#fff',
    borderRadius: '8px',
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: 'bold' as const,
    fontFamily: "'Gaegu', cursive",
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 5,
  },
  statusRow: {
    position: 'absolute' as const,
    top: '18px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 16,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  statusPill: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '20px',
    padding: '5px 14px',
    fontSize: '13px',
    fontWeight: 'bold' as const,
    fontFamily: "'Gaegu', cursive",
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  },
  bottomBtnWrap: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    marginBottom: '8px',
  },
  actionBtn: {
    padding: '14px 32px',
    fontSize: '18px',
    fontWeight: 'bold' as const,
    fontFamily: "'Gaegu', cursive",
    minWidth: '200px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  thumbnail: {
    width: '160px',
    height: '120px',
    overflow: 'hidden',
    background: '#000',
    position: 'relative' as const,
    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};
