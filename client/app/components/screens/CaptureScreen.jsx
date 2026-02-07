import React from 'react';

export default function CaptureScreen({
  videoRef,
  countdown,
  totalShots,
  currentShotIndex,
  progress,
  isProcessing
}) {
  return (
    <div className="screen-card glass-panel">
      <div className="screen-card__header">
        <div className="screen-card__icon">{isProcessing ? '⏳' : '📸'}</div>
        <div>
          <h2 className="screen-card__title">{isProcessing ? 'Processing' : 'Capture'}</h2>
          <p className="screen-card__subtitle">
            {isProcessing ? 'Menyinkronkan foto…' : 'Senyum dan jangan bergerak!'}
          </p>
        </div>
      </div>

      <div className="screen-card__body">
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} />
          {countdown !== null && (
            <div className="countdown-overlay">
              <div className="countdown-number">{countdown}</div>
              {totalShots > 1 && (
                <div className="cap__shot-badge">
                  Shot {currentShotIndex} / {totalShots}
                </div>
              )}
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="cap__progress">
            <div className="cap__progress-head">
              <span>Processing Photos…</span>
              <span>{progress}%</span>
            </div>
            <div className="cap__progress-bar">
              <div className="cap__progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="cap__progress-hint">Syncing high-quality images with partner…</p>
          </div>
        )}
      </div>
    </div>
  );
}
