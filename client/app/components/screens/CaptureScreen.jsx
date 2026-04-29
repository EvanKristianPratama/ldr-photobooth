import React from 'react';

export default function CaptureScreen({
  videoRef,
  countdown,
  totalShots,
  currentShotIndex,
  progress,
  isProcessing
}) {
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
          <div className={`p-step ${progress > 40 ? 'done' : ''}`} id="ps2"><div className="p-dot"></div><span>Adding grain & contrast...</span></div>
          <div className={`p-step ${progress > 70 ? 'done' : ''}`} id="ps3"><div className="p-dot"></div><span>Composing strip layout...</span></div>
          <div className={`p-step ${progress === 100 ? 'done' : ''}`} id="ps4"><div className="p-dot"></div><span>Finalising print — almost there!</span></div>
        </div>
      </section>
    );
  }

  return (
    <section className="page active" id="page-capture">
      <div className="capture-main">
        {countdown !== null && <div className="countdown" id="countdown">{countdown}</div>}
        <div className="camera-frame">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', borderRadius: '8px' }} 
          />
          {!videoRef.current?.srcObject && !countdown && (
            <div className="camera-placeholder">
              <div className="cam-icon"><div className="cam-lens"></div></div>
              <div className="cam-text">CAMERA READY</div>
            </div>
          )}
        </div>
        <div className="capture-bar">
          <span className="shutter-hint" id="shot-label">
            Shot {currentShotIndex + 1} of <span id="total-shots">{totalShots}</span>
          </span>
          <div className="btn-shutter" style={{ cursor: 'default' }}></div>
          <span className="shutter-hint">Auto timer</span>
        </div>
      </div>

      <aside className="capture-sidebar">
        <div className="sidebar-title">Your Strip ✦</div>
        <div className="shot-strip" id="shot-strip">
          {Array.from({ length: totalShots }).map((_, i) => (
            <div key={i} className={`shot-slot ${i < currentShotIndex ? 'taken' : ''}`} id={`slot-${i}`}>
              <span className="shot-num">0{i + 1}</span>
              <span>{i < currentShotIndex ? '✓ Taken!' : 'empty'}</span>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
