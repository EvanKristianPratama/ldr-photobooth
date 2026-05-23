'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

interface CaptureScreenProps {
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
  sessionMode?: string;
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
   MAIN SCREEN COMPONENT
   ────────────────────────────────────────────────────────── */
export default function CaptureScreen({
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
  sessionMode = 'duo'
}: CaptureScreenProps) {
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

  if (isProcessing) {
    return <ProcessingSubScreen progress={progress} t={t} />;
  }

  const isTimeOut = sessionTimeLeft !== null && sessionTimeLeft <= 0;

  return (
    <section className="page active" id="page-capture">
      <div className="capture-full">
        
        {/* Camera Display Box */}
        <div className="camera-card" style={styles.relative}>
          
          {/* Pro Session Timer */}
          {sessionTimeLeft !== null && (
            <div
              className="session-timer-badge"
              style={{
                background: sessionTimeLeft <= 10 ? 'rgba(255, 82, 82, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                animation: sessionTimeLeft <= 10 ? 'pulse 1s infinite' : 'none'
              }}
            >
              {sessionTimeLeft}s
            </div>
          )}

          {/* LIVE Photo Toggle */}
          <button
            type="button"
            onClick={() => setLivePhotoEnabled(prev => !prev)}
            disabled={isFinishedAllShots}
            className={`live-toggle-btn ${livePhotoEnabled ? 'active' : ''}`}
            style={{
              cursor: isFinishedAllShots ? 'default' : 'pointer',
              opacity: isFinishedAllShots ? 0.5 : 1,
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: livePhotoEnabled ? '#ff6b9d' : '#888',
                boxShadow: livePhotoEnabled ? '0 0 8px #ff6b9d' : 'none'
              }}
            />
            {livePhotoEnabled ? 'LIVE: ON' : 'LIVE: OFF'}
          </button>

          {/* Standard Fullscreen Local Video Preview (Mirrored) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              ...styles.video,
              transform: 'scaleX(-1)', // Mirrored for intuitive local user posing
            }}
          />

          {/* Guide Grid overlay */}
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

          {/* Countdown indicator */}
          {countdown !== null && (
            <div className="cam-countdown-overlay">
              <span className="cam-countdown-num">{countdown}</span>
            </div>
          )}

          {/* Action Overlay */}
          {isFinishedAllShots && countdown === null && (
             <div className="capture-action-overlay">
               <div className="capture-action-text">
                 {t('capture.niceShots')}<br/>
                 <span>
                   {isTimeOut 
                     ? "⏳ Waktu habis, kamu sudah tidak bisa retake lagi."
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
   CENTRALIZED STYLING OBJECT
   ────────────────────────────────────────────────────────── */
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
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    borderRadius: '10px',
    display: 'block',
    background: '#000',
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
