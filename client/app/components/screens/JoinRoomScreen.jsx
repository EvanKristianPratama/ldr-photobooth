import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function JoinRoomScreen({
  displayName,
  setDisplayName,
  roomCode,
  setRoomCode,
  generateRoomCode,
  copyRoomCode,
  showToast,
  onJoin,
  onBack,
  groupSize
}) {
  const { t } = useLanguage();

  return (
    <section className="page active" id="page-join">
      {onBack && (
        <button 
          onClick={onBack}
          className="btn-secondary btn-back-absolute"
          style={{ 
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 100,
            padding: '8px 16px',
            fontSize: '16px',
            fontFamily: "'Gaegu', cursive"
          }}
        >
          {t('common.back')}
        </button>
      )}
      <div className="join-left">
        <div className="big-doodle">
          LDR
          <span className="outline">Photobooth</span>
        </div>
      </div>

      <div className="join-right">
        <div className="form-section-title">{t('join.whoAreYou')}</div>

        <div className="form-group">
          <label className="form-label">{t('join.yourName')}</label>
          <input 
            className="form-input" 
            value={displayName} 
            onChange={e => setDisplayName(e.target.value)} 
            placeholder={t('join.namePlaceholder')} 
            autoComplete="off" 
            maxLength="30"
          />
          <p className="form-hint">{t('join.nameHint')}</p>
          <p className={`error-msg ${!displayName ? 'show' : ''}`} id="err-name">{t('join.nameError')}</p>
        </div>

        <div className="form-group">
          <label className="form-label">{t('join.roomCode')}</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              className="form-input" 
              value={roomCode} 
              onChange={e => setRoomCode(e.target.value.toUpperCase())} 
              placeholder={t('join.roomPlaceholder')} 
              autoComplete="off" 
              maxLength="10" 
              style={{ textTransform: 'uppercase', letterSpacing: '4px' }}
            />
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={generateRoomCode} 
              style={{ padding: '0', width: '48px', height: '48px', fontSize: '24px' }}
              title="Generate Random Code"
            >
              🎲
            </button>
          </div>
          <p className="form-hint">{t('join.roomHint')}</p>
          <p className={`error-msg ${roomCode && roomCode.length < 4 ? 'show' : ''}`} id="err-code">{t('join.roomError')}</p>
        </div>

        <button className="btn-primary" onClick={onJoin}>
          {t('join.letsGo')}
        </button>

        {roomCode && (
          <div 
            className="code-display" 
            style={{ marginTop: '20px', fontSize: '18px' }}
            onClick={() => copyRoomCode(groupSize)}
          >
            <div className={`copy-toast ${showToast ? 'visible' : ''}`}>{t('join.linkCopied')}</div>
            {t('join.inviteLink')} {roomCode}
          </div>
        )}
      </div>
    </section>
  );
}

