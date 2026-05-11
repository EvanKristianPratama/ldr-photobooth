import React, { useMemo } from 'react';
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
  setLivePhotoEnabled
}) {
  const { t } = useLanguage();

  // Membuat URL untuk preview foto agar bisa ditampilkan
  const photoPreviews = useMemo(() => {
    return Array.from({ length: totalShots }).map((_, i) => {
      const blob = localBlobs[i];
      return blob ? URL.createObjectURL(blob) : null;
    });
  }, [localBlobs, totalShots]);

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
          
          {/* Live Photo Toggle Button */}
          <button
            onClick={() => setLivePhotoEnabled(prev => !prev)}
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
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
            {livePhotoEnabled ? 'LIVE PHOTO: ON' : 'LIVE PHOTO: OFF'}
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

        </div>

        {/* ── Progress strip (Tanpa tombol bulat kiri) ── */}
        <div className="capture-strip-bar" style={{ justifyContent: 'center' }}>
          <div className="strip-bar-slots" style={{ justifyContent: 'center', flex: 'none' }}>
            {Array.from({ length: totalShots }).map((_, i) => (
              <div
                key={i}
                className={`strip-thumb ${i < currentShotIndex ? 'taken' : i === currentShotIndex ? 'current' : ''}`}
                style={{ width: '100px', height: '75px', overflow: 'hidden', background: '#000' }}
              >
                {photoPreviews[i] ? (
                  <img 
                    src={photoPreviews[i]} 
                    alt={`Shot ${i+1}`} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <>
                    <span className="strip-thumb-num">{i + 1}</span>
                    <span className="strip-thumb-label">{i === currentShotIndex ? 'READY' : ''}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

