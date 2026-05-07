import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function WaitRoomScreen({
  participants,
  roomCode,
  copyRoomCode,
  showToast,
  status,
  videoRef,
  onNext,
  onBack,
  groupSize = 2
}) {
  const { t } = useLanguage();
  const isReady = participants.length >= groupSize;

  return (
    <section className="page active" id="page-room" style={{ flexDirection: 'column', padding: '40px 48px' }}>
      <div className="page-title-row" style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        {onBack && (
          <button 
            onClick={onBack}
            className="btn-secondary"
            style={{ 
              padding: '8px 16px', 
              fontSize: '16px', 
              fontFamily: "'Gaegu', cursive",
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {t('common.back')}
          </button>
        )}
        <h1 className="page-title" style={{ fontSize: '72px', fontFamily: "'Gaegu', cursive", margin: 0 }}>
          {t('room.title')}
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
        
        {/* ── LEFT: CAMERA ── */}
        <div style={{ flex: 1.2 }}>
          <div className="camera-frame squiggle" style={{ width: '100%', height: 'auto', aspectRatio: '16/9', margin: 0, position: 'relative' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', borderRadius: '8px' }} 
            />
            {/* Teks dipindah ke dalam preview */}
            <div className="cam-info-bar" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)', padding: '15px' }}>
              <span className="cam-info-left" style={{ color: 'white', fontSize: '18px' }}>
                {t('room.dandan')}
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: PARTNER & NEXT ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="wr__participants squiggle" style={{ margin: 0, padding: '24px' }}>
            <div className="wr__participants-head" style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '22px' }}>{t('room.crewList')}</span>
              <span style={{ fontSize: '18px', opacity: 0.6 }}>{participants.length} / {groupSize}</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {participants.map((p, i) => (
                <div key={i} className="wr__participant" style={{ margin: 0, padding: '8px 16px', fontSize: '18px' }}>
                  <div className="wr__participant-dot" />
                  {p.displayName} {p.isYou ? `(${t('common.you') || 'You'})` : ''}
                </div>
              ))}
              {participants.length < groupSize && (
                <div className="wr__participant" style={{ opacity: 0.4, margin: 0, padding: '8px 16px', fontSize: '18px' }}>
                  <div className="wr__participant-dot" style={{ background: '#ccc' }} />
                  {t('common.waiting')}
                </div>
              )}
            </div>
          </div>

          <div className="wr__code-box" style={{ margin: 0 }}>
            <span style={{ 
              fontFamily: "'Pastel Crayon', cursive", 
              fontSize: '16px', 
              color: '#888', 
              marginBottom: '8px', 
              display: 'block' 
            }}>
              {t('room.shareLink')}
            </span>
            <div className="code-display squiggle" onClick={() => copyRoomCode(groupSize)} style={{ cursor: 'pointer', position: 'relative', fontSize: '24px' }}>
              <div className={`copy-toast ${showToast ? 'visible' : ''}`}>{t('room.copied')}</div>
              {roomCode || '—'}
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
            {isReady ? (
              <button className="btn-primary" onClick={onNext} style={{ width: '100%', padding: '18px' }}>
                {t('room.chooseLayout')}
              </button>
            ) : (
              <div style={{ 
                fontFamily: "'Pastel Crayon', cursive", 
                color: 'var(--ink)', 
                fontSize: '18px', 
                textAlign: 'center',
                opacity: 0.7 
              }}>
              <div className="waiting-status">
                <span className="rotating-icon">⌛</span> {t('room.waitingPartner')}<span className="dots-anim"></span>
              </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

