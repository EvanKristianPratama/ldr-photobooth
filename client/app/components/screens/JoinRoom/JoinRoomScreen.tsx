'use client';

import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

interface JoinRoomProps {
  displayName: string;
  setDisplayName: (name: string) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  generateRoomCode: () => void;
  copyRoomCode: (size?: number) => void;
  showToast: boolean;
  onJoin: () => void;
  onBack?: () => void;
  groupSize?: number;
}

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
}: JoinRoomProps) {
  const { t } = useLanguage();

  return (
    <section className="page active" id="page-join">
      {onBack && (
        <button 
          type="button"
          onClick={onBack}
          className="btn-secondary btn-back-absolute"
          style={styles.backBtn}
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
            maxLength={30}
          />
          <p className="form-hint">{t('join.nameHint')}</p>
          <p className={`error-msg ${!displayName ? 'show' : ''}`} id="err-name">{t('join.nameError')}</p>
        </div>

        <div className="form-group">
          <label className="form-label">{t('join.roomCode')}</label>
          <div style={styles.flexGap10}>
            <input 
              className="form-input" 
              value={roomCode} 
              onChange={e => setRoomCode(e.target.value.toUpperCase())} 
              placeholder={t('join.roomPlaceholder')} 
              autoComplete="off" 
              maxLength={10} 
              style={styles.roomInput}
            />
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={generateRoomCode} 
              style={styles.diceBtn}
              title="Generate Random Code"
            >
              🎲
            </button>
          </div>
          <p className="form-hint">{t('join.roomHint')}</p>
          <p className={`error-msg ${roomCode && roomCode.length < 4 ? 'show' : ''}`} id="err-code">{t('join.roomError')}</p>
        </div>

        <button type="button" className="btn-primary" onClick={onJoin}>
          {t('join.letsGo')}
        </button>

        {roomCode && (
          <div 
            className="code-display" 
            style={styles.codeDisplay}
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

const styles = {
  backBtn: { 
    position: 'absolute' as const,
    top: '20px',
    left: '20px',
    zIndex: 100,
    padding: '8px 16px',
    fontSize: '16px',
    fontFamily: "'Gaegu', cursive",
  },
  flexGap10: {
    display: 'flex',
    gap: '10px',
  },
  roomInput: {
    textTransform: 'uppercase' as const,
    letterSpacing: '4px',
  },
  diceBtn: {
    padding: '0',
    width: '48px',
    height: '48px',
    fontSize: '24px',
  },
  codeDisplay: {
    marginTop: '20px',
    fontSize: '18px',
    cursor: 'pointer',
  },
};
