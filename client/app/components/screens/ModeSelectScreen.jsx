import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { useLanguage } from '../../context/LanguageContext';

export default function ModeSelectScreen({ onSelectMode, onShowHelp }) {
  const { t } = useLanguage();
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  const groupOptions = [
    { id: 2, label: t('mode.duo'), desc: t('mode.duoDesc'), icon: '👥' },
    { id: 3, label: t('mode.trio'), desc: t('mode.trioDesc'), icon: '👪', comingSoon: true },
    { id: 4, label: t('mode.quad'), desc: t('mode.quadDesc'), icon: '👨‍👩‍👧‍👦', comingSoon: true },
  ];

  if (showGroupOptions) {
    return (
      <section className="page active" id="page-mode-select">
        <button className="btn-help" onClick={onShowHelp} title={t('common.help') || 'Help'}>?</button>
        <div className="mode-left vibe-bg">
          <div className="big-doodle">
            {t('mode.howMany')}
            <span className="outline">{t('mode.people')}</span>
          </div>
        </div>

        <div className="mode-right">
          <button 
            onClick={() => setShowGroupOptions(false)}
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
          <div className="form-section-title">{t('mode.selectSize')}</div>

          {groupOptions.map(opt => (
            <div 
              key={opt.id}
              className={`mode-option-card duo ${opt.comingSoon ? 'coming-soon' : ''}`} 
              onClick={() => {
                if (opt.comingSoon) {
                  Swal.fire({
                    title: t('mode.soonTitle'),
                    text: t('mode.soonDesc'),
                    icon: 'info',
                    confirmButtonText: 'Oke!',
                    confirmButtonColor: 'var(--ink)',
                    customClass: {
                      popup: 'swal-doodle'
                    }
                  });
                  return;
                }
                onSelectMode('duo', opt.id);
              }}
              style={{ marginBottom: '16px', opacity: opt.comingSoon ? 0.7 : 1, cursor: opt.comingSoon ? 'not-allowed' : 'pointer' }}
            >
              <div className="mode-icon">{opt.icon}</div>
              <div className="mode-details">
                <div className="mode-title">
                  {opt.label}
                  {opt.comingSoon && <span style={{ fontSize: '12px', marginLeft: '10px', background: 'var(--ink)', color: 'var(--yellow)', padding: '2px 8px', borderRadius: '10px', verticalAlign: 'middle', fontWeight: 'bold' }}>SOON!</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="page active" id="page-mode-select">
      <div className="help-hint-container" style={{ position: 'absolute', top: '22px', right: '75px', display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
        <span style={{ 
          fontFamily: "'Gaegu', cursive", 
          fontSize: '16px', 
          color: 'var(--ink)', 
          background: 'white',
          padding: '4px 10px',
          borderRadius: '12px 12px 0 12px',
          border: '2px solid var(--ink)',
          boxShadow: '2px 2px 0 var(--ink)',
          whiteSpace: 'nowrap',
          animation: 'float-x 2s ease-in-out infinite'
        }}>
          {t('mode.helpHint')}
        </span>
      </div>
      <button className="btn-help" onClick={onShowHelp} title={t('common.help') || 'Help'}>?</button>
      <div className="mode-left vibe-bg">
        <div className="big-doodle">
          {t('mode.pickYour')}
          <span className="outline">{t('mode.vibe')}</span>
        </div>
      </div>

      <div className="mode-right">
        <div className="form-section-title">{t('mode.howToPhoto')}</div>

        <div 
          className="mode-option-card solo" 
          onClick={() => onSelectMode('solo')}
        >
          <div className="mode-icon">👤</div>
          <div className="mode-details">
            <div className="mode-title">{t('mode.solo')}</div>
          </div>
        </div>

        <div 
          className="mode-option-card duo" 
          onClick={() => setShowGroupOptions(true)}
        >
          <div className="mode-icon">👥</div>
          <div className="mode-details">
            <div className="mode-title">{t('mode.group')}</div>
          </div>
        </div>

        <div 
          className="mode-option-card community" 
          onClick={() => onSelectMode('community')}
        >
          <div className="mode-icon" style={{ background: '#eee' }}>✨</div>
          <div className="mode-details">
            <div className="mode-title">{t('mode.community')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

