import React, { useMemo } from 'react';

export default function CaptureScreen({
  videoRef,
  countdown,
  totalShots,
  currentShotIndex,
  progress,
  isProcessing,
  localBlobs = [] // Mengambil data foto yang sudah diambil
}) {
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
          Developing<br />
          <span className="outline">Your Film!</span>
        </div>

        <div style={{ width: '480px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div className="progress-track" style={{ width: '100%' }}>
            <div className="progress-fill" id="p-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="progress-label" id="p-pct">{progress}%</p>
        </div>

        <div className="processing-steps">
          <div className={`p-step ${progress > 10 ? 'done' : ''}`} id="ps1"><div className="p-dot"></div><span>Scanning frames...</span></div>
          <div className={`p-step ${progress > 40 ? 'done' : ''}`} id="ps2"><div className="p-dot"></div><span>Adding grain &amp; contrast...</span></div>
          <div className={`p-step ${progress > 70 ? 'done' : ''}`} id="ps3"><div className="p-dot"></div><span>Composing strip layout...</span></div>
          <div className={`p-step ${progress === 100 ? 'done' : ''}`} id="ps4"><div className="p-dot"></div><span>Finalising print — almost there!</span></div>
        </div>
      </section>
    );
  }

  return (
    <section className="page active" id="page-capture">
      <div className="capture-full">

        {/* ── Timer row ── */}
        <div className="capture-timer-row">
          <div className="capture-shot-badge">
            <span className="shot-badge-num">{currentShotIndex + 1}</span>
            <span className="shot-badge-sep">/</span>
            <span className="shot-badge-total">{totalShots}</span>
          </div>

          <div className={`capture-countdown-box ${countdown !== null ? 'active' : ''}`} id="countdown">
            {countdown !== null ? countdown : '✦'}
          </div>

          <div style={{ width: '120px' }}></div>
        </div>

        {/* ── Camera frame full card ── */}
        <div className="camera-card">
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

          {/* Countdown overlay inside camera */}
          {countdown !== null && (
            <div className="cam-countdown-overlay">
              <span className="cam-countdown-num">{countdown}</span>
            </div>
          )}

          {/* Bottom info bar inside card */}
          <div className="cam-info-bar">
            <span className="cam-info-left">📸 Shot {currentShotIndex + 1} of {totalShots}</span>
            <span className="cam-info-right">Auto timer ✦</span>
          </div>
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
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                  />
                ) : (
                  <>
                    <span className="strip-thumb-num">0{i + 1}</span>
                    <span className="strip-thumb-label">{i === currentShotIndex ? '📸' : '—'}</span>
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
