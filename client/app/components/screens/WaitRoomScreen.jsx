import React from 'react';

export default function WaitRoomScreen({
  participants,
  roomCode,
  copyRoomCode,
  showToast,
  status,
  videoRef,
  onNext
}) {
  return (
    <div className="screen-card glass-panel">
      <div className="screen-card__header">
        <div className="screen-card__icon">🏠</div>
        <div>
          <h2 className="screen-card__title">Wait Room</h2>
          <p className="screen-card__subtitle">Tunggu partner bergabung</p>
        </div>
        <span className="status-indicator" style={{ marginLeft: 'auto' }}>
          <span className={`status-dot ${status?.startsWith?.('Connected') ? 'active' : ''}`} />
          {status}
        </span>
      </div>

      <div className="screen-card__body">
        {/* Participants + Room Code side-by-side on wider, stacked on mobile */}
        <div className="wr__meta">
          <div className="wr__participants">
            <div className="wr__participants-head">
              <span>Participants</span>
              <strong>{participants.length} / 2</strong>
            </div>
            {participants.map((p, i) => (
              <div key={i} className="wr__participant">
                <span className="wr__participant-dot" />
                {p.displayName} {p.isYou ? '(You)' : ''}
              </div>
            ))}
          </div>

          <div className="wr__code-box">
            <div className="wr__code-label">Room Code</div>
            <div
              className="code-display"
              style={{ cursor: roomCode ? 'pointer' : 'default', position: 'relative' }}
              onClick={copyRoomCode}
            >
              <div className={`copy-toast ${showToast ? 'visible' : ''}`}>Link Copied!</div>
              {roomCode || '—'}
            </div>
          </div>
        </div>

        {/* Camera preview */}
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} />
        </div>
      </div>

      <div className="screen-card__footer">
        {participants.length < 2 ? (
          <p className="wr__waiting">⏳ Waiting for partner…</p>
        ) : (
          <button className="btn-primary screen-card__cta" onClick={onNext}>
            Next: Select Layout →
          </button>
        )}
      </div>
    </div>
  );
}
