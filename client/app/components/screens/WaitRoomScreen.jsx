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
    <section className="page active" id="page-room" style={{ flexDirection: 'column', padding: '20px 28px', gap: '16px' }}>
      <div className="page-title-row" style={{ marginBottom: '12px' }}>
        <div className="page-title" style={{ fontSize: '36px' }}>Waiting Room ✦</div>
        <div className="room-badge" style={{ padding: '4px 12px', fontSize: '14px' }}>
          <div className={`room-dot ${status?.startsWith?.('Connected') ? 'active' : ''}`} />
          <span>{status}</span>
        </div>
      </div>

      <div className="wr__meta" style={{ marginBottom: '10px', gap: '12px' }}>
        <div className="wr__participants squiggle" style={{ padding: '12px 16px' }}>
          <div className="wr__participants-head" style={{ fontSize: '18px', marginBottom: '8px' }}>
            <span>Crew List</span>
            <span>{participants.length} / 2</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {participants.map((p, i) => (
              <div key={i} className="wr__participant" style={{ fontSize: '16px', margin: 0 }}>
                <div className="wr__participant-dot" />
                {p.displayName} {p.isYou ? '(You)' : ''}
              </div>
            ))}
            {participants.length < 2 && (
              <div className="wr__participant" style={{ opacity: 0.4, fontSize: '16px', margin: 0 }}>
                <div className="wr__participant-dot" style={{ background: '#ccc' }} />
                Waiting...
              </div>
            )}
          </div>
        </div>

        <div className="wr__code-box">
          <div
            className="code-display"
            onClick={copyRoomCode}
            style={{ padding: '8px 16px', fontSize: '18px' }}
          >
            <div className={`copy-toast ${showToast ? 'visible' : ''}`} style={{ top: '-35px' }}>Link Copied!</div>
            Code: {roomCode || '—'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'center' }}>
        <div className="camera-frame" style={{ width: '100%', maxWidth: '440px', aspectRatio: '16/9' }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', borderRadius: '8px' }} 
          />
        </div>

        {participants.length >= 2 ? (
          <button className="btn-primary" onClick={onNext} style={{ maxWidth: '300px', padding: '12px 24px', fontSize: '18px' }}>
            Next: Pick Layout →
          </button>
        ) : (
          <div className="shutter-hint" style={{ color: 'var(--ink)', fontSize: '16px' }}>
            ⌛ Waiting for your partner...
          </div>
        )}
      </div>
    </section>
  );
}
