import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function CaptureScreen({
  videoRef,
  countdown,
  totalShots,
  currentShotIndex,
  progress,
  isProcessing,
  localBlobs = [], // Mengambil data foto yang sudah diambil
  livePhotoEnabled,
  setLivePhotoEnabled,
  sessionTimeLeft,
  onRetake,
  onRetakeSingle,
  onFinish,
  isTransmitting
}) {
  const { t } = useLanguage();
  const [selectedRetakeIdx, setSelectedRetakeIdx] = useState(null);

  const handleRetakeClick = () => {
    if (selectedRetakeIdx !== null) {
      onRetakeSingle(selectedRetakeIdx);
      setSelectedRetakeIdx(null); // Reset
    } else {
      onRetake(); // Retake ALL
    }
  };

  // Membuat URL untuk preview foto agar bisa ditampilkan
  const photoPreviews = useMemo(() => {
    return Array.from({ length: totalShots }).map((_, i) => {
      const blob = localBlobs[i];
      return blob ? URL.createObjectURL(blob) : null;
    });
  }, [localBlobs, totalShots]);

  const isFinishedAllShots = useMemo(() => {
    return totalShots > 0 && localBlobs.filter(Boolean).length === totalShots;
  }, [localBlobs, totalShots]);

  const isCurrentlyCapturing = countdown !== null || (currentShotIndex < totalShots && !isFinishedAllShots);

  if (isProcessing) {
    return (
      <section className="page active" id="page-processing">
        <div className="proc-title">
          {t('capture.developing')}<br />
          <span className="outline">{t('capture.yourFilm')}</span>
        </div>

        <div style={{ width: '480px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div className="progress-track" style={{ width: '100%' }}>
            <div className="progress-fill" id="p-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-label" id="p-pct">{progress}%</p>
        </div>

        <div className="processing-steps">
          <div className={`p-step ${progress > 10 ? 'done' : ''}`} id="ps1"><div className="p-dot"></div><span>{t('capture.scanning')}</span></div>
          <div className={`p-step ${progress > 40 ? 'done' : ''}`} id="ps2"><div className="p-dot"></div><span>{t('capture.adding')}</span></div>
          <div className={`p-step ${progress > 70 ? 'done' : ''}`} id="ps3"><div className="p-dot"></div><span>{t('capture.syncing')}</span></div>
          <div className={`p-step ${progress === 100 ? 'done' : ''}`} id="ps4"><div className="p-dot"></div><span>{t('capture.finalising')}</span></div>
        </div>
      </section>
    );
  }

  return (
    <section className="page active" id="page-capture">
      <div className="capture-full">


        {/* ── Camera frame full card ── */}
        <div className="camera-card" style={{ position: 'relative' }}>
          
          {/* Session Timer Display (Pro Style) */}
          {sessionTimeLeft !== null && (
            <div
              style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                zIndex: 20,
                background: sessionTimeLeft <= 10 ? 'rgba(255, 82, 82, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                color: '#1a1a2e',
                border: '2px solid #1a1a2e',
                borderRadius: '10px',
                padding: '8px 12px',
                fontFamily: "'Gaegu', cursive",
                fontSize: '20px',
                fontWeight: 'bold',
                boxShadow: '4px 4px 0 #1a1a2e',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: sessionTimeLeft <= 10 ? 'pulse 1s infinite' : 'none'
              }}
            >
              ⏱️ {sessionTimeLeft}s left
            </div>
          )}

          {/* Live Photo Toggle Button */}
          <button
            onClick={() => setLivePhotoEnabled(prev => !prev)}
            disabled={isFinishedAllShots} // Lock options after finishing unless they retake
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              zIndex: 20,
              background: livePhotoEnabled ? 'rgba(255, 217, 61, 0.95)' : 'rgba(0, 0, 0, 0.65)',
              color: livePhotoEnabled ? '#1a1a2e' : '#fff',
              border: livePhotoEnabled ? '2px solid #1a1a2e' : '2px solid rgba(255,255,255,0.4)',
              borderRadius: '25px',
              padding: '6px 14px',
              fontFamily: "'Gaegu', cursive",
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isFinishedAllShots ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: isFinishedAllShots ? 0.5 : 1,
              transition: 'all 0.2s ease-in-out'
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

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              borderRadius: '10px',
              display: 'block',
              
            }}
          />

          {/* Guide overlay */}
          <div className="cam-guide-overlay">
            <div className="guide-box">
              <div className="guide-corner tl"></div>
              <div className="guide-corner tr"></div>
              <div className="guide-corner bl"></div>
              <div className="guide-corner br"></div>
              <div className="guide-lines-v"></div>
              <div className="guide-lines-h"></div>
            </div>
          </div>

          {/* Countdown overlay inside camera */}
          {countdown !== null && (
            <div className="cam-countdown-overlay">
              <span className="cam-countdown-num">{countdown}</span>
            </div>
          )}

          {/* ACTION OVERLAY (Appears when all photos captured but timer is still running) */}
          {isFinishedAllShots && countdown === null && (
             <div 
               style={{
                 position: 'absolute',
                 inset: 0,
                 background: 'rgba(0,0,0,0.6)',
                 zIndex: 30,
                 display: 'flex',
                 flexDirection: 'column',
                 alignItems: 'center',
                 justifyContent: 'center',
                 borderRadius: '10px',
                 gap: '20px',
                 backdropFilter: 'blur(4px)',
                 animation: 'fadeIn 0.3s ease'
               }}
             >
               <div style={{ color: '#fff', fontSize: '28px', fontFamily: "'Gaegu', cursive", textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                 ✨ Nice Shots! ✨<br/>
                 <span style={{ fontSize: '18px', opacity: 0.9 }}>
                   {selectedRetakeIdx !== null 
                     ? `You selected Photo #${selectedRetakeIdx + 1}.` 
                     : 'Would you like to use these or retake?'}
                 </span>
               </div>

               <div style={{ display: 'flex', gap: '16px', width: '80%', maxWidth: '380px' }}>
                 {/* Retake Button - disabled if no time left or actively captures */}
                 <button
                   onClick={handleRetakeClick}
                   disabled={sessionTimeLeft <= 0}
                   className="btn-share"
                   style={{
                     flex: 1,
                     background: '#fff',
                     color: '#1a1a2e',
                     border: '3px solid #1a1a2e',
                     boxShadow: selectedRetakeIdx !== null ? '4px 4px 0 #FF5252' : '4px 4px 0 #1a1a2e',
                     borderColor: selectedRetakeIdx !== null ? '#FF5252' : '#1a1a2e',
                     opacity: sessionTimeLeft <= 0 ? 0.5 : 1,
                     cursor: sessionTimeLeft <= 0 ? 'not-allowed' : 'pointer',
                     fontSize: '18px',
                     padding: '14px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: '6px',
                     transition: 'all 0.2s ease',
                     transform: selectedRetakeIdx !== null ? 'scale(1.05)' : 'none'
                   }}
                 >
                   🔄 {selectedRetakeIdx !== null ? `Retake #${selectedRetakeIdx + 1}` : t('action.retake') || 'Retake All'}
                 </button>

                 <button
                   onClick={onFinish}
                   className="btn-dl"
                   style={{
                     flex: 1,
                     fontSize: '18px',
                     padding: '14px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: '6px'
                   }}
                 >
                   ✅ {t('action.done') || 'Done & Send'}
                 </button>
               </div>
             </div>
          )}

        </div>

        {/* ── Progress strip (Tanpa tombol bulat kiri) ── */}
        <div className="capture-strip-bar" style={{ justifyContent: 'center' }}>
          <div className="strip-bar-slots" style={{ justifyContent: 'center', flex: 'none' }}>
            {Array.from({ length: totalShots }).map((_, i) => {
              const isPhotoTaken = !!photoPreviews[i];
              const canRetakeThis = isFinishedAllShots && isPhotoTaken && countdown === null && sessionTimeLeft > 0;
              const isThisSelected = selectedRetakeIdx === i;

              return (
                <div
                  key={i}
                  className={`strip-thumb ${i < currentShotIndex ? 'taken' : i === currentShotIndex ? 'current' : ''}`}
                  style={{ 
                    width: '100px', 
                    height: '75px', 
                    overflow: 'hidden', 
                    background: '#000',
                    position: 'relative',
                    cursor: canRetakeThis ? 'pointer' : 'default',
                    border: isThisSelected 
                      ? '4px dashed #FFD700' // Cute yellow dashed line for selected
                      : canRetakeThis 
                        ? '2px solid rgba(255, 255, 255, 0.5)' 
                        : 'none',
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isThisSelected ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: isThisSelected ? '0 0 15px rgba(255, 215, 0, 0.6)' : 'none',
                    zIndex: isThisSelected ? 10 : 1
                  }}
                  onClick={() => {
                    if (canRetakeThis) {
                      // Toggle selection instead of firing immediately
                      setSelectedRetakeIdx(isThisSelected ? null : i);
                    }
                  }}
                >
                  {photoPreviews[i] ? (
                    <>
                      <img 
                        src={photoPreviews[i]} 
                        alt={`Shot ${i+1}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: canRetakeThis ? 0.8 : 1 }} 
                      />
                      {canRetakeThis && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isThisSelected ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0,0,0,0.3)',
                          color: '#fff',
                          fontFamily: "'Gaegu', cursive",
                          fontSize: '14px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                        }}>
                          {isThisSelected ? '⭐ Selected' : '🔄 Select'}
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

