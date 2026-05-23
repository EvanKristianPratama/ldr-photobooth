'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

interface ModeSelectProps {
  onSelectMode: (mode: 'solo' | 'duo' | 'community', sizeId?: number) => void;
  onShowHelp: () => void;
}

interface GroupOption {
  id: number;
  labelKey: string;
  descKey: string;
  icon: string;
  comingSoon?: boolean;
}

const STATIC_GROUP_OPTIONS: GroupOption[] = [
  { id: 2, labelKey: 'mode.duo', descKey: 'mode.duoDesc', icon: '👥' },
  { id: 3, labelKey: 'mode.trio', descKey: 'mode.trioDesc', icon: '👪', comingSoon: true },
  { id: 4, labelKey: 'mode.quad', descKey: 'mode.quadDesc', icon: '👨‍👩‍👧‍👦', comingSoon: true },
];

export default function ModeSelectScreen({ onSelectMode, onShowHelp }: ModeSelectProps) {
  const { t } = useLanguage();
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  const groupOptions = useMemo(() => {
    return STATIC_GROUP_OPTIONS.map(opt => ({
      ...opt,
      label: t(opt.labelKey),
      desc: t(opt.descKey),
    }));
  }, [t]);

  const handleComingSoonClick = async () => {
    try {
      const { default: Swal } = await import('sweetalert2');
      Swal.fire({
        title: t('mode.soonTitle') || 'Segera Hadir!',
        text: t('mode.soonDesc') || 'Fitur ini sedang dalam pengembangan.',
        icon: 'info',
        confirmButtonText: 'Oke!',
        confirmButtonColor: 'var(--ink)',
        customClass: {
          popup: 'swal-doodle',
        },
      });
    } catch (error) {
      console.error('Failed to load SweetAlert2:', error);
    }
  };

  if (showGroupOptions) {
    return (
      <section className="page active" id="page-mode-select">
        <button 
          type="button" 
          className="btn-help" 
          onClick={onShowHelp} 
          title={t('common.help') || 'Help'}
        >
          ?
        </button>
        <div className="mode-left vibe-bg">
          <div className="big-doodle">
            {t('mode.howMany')}
            <span className="outline">{t('mode.people')}</span>
          </div>
        </div>

        <div className="mode-right">
          <button 
            type="button"
            onClick={() => setShowGroupOptions(false)}
            className="btn-secondary btn-back-absolute"
            style={styles.backBtn}
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
                  handleComingSoonClick();
                  return;
                }
                onSelectMode('duo', opt.id);
              }}
              style={{ 
                ...styles.optionCard(!!opt.comingSoon),
                marginBottom: '16px',
              }}
            >
              <div className="mode-icon">{opt.icon}</div>
              <div className="mode-details">
                <div className="mode-title">
                  {opt.label}
                  {opt.comingSoon && <span style={styles.soonBadge}>SOON!</span>}
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
      <div className="help-hint-container" style={styles.hintContainer}>
        <span style={styles.hintText}>
          {t('mode.helpHint')}
        </span>
      </div>

      <button 
        type="button" 
        className="btn-help" 
        onClick={onShowHelp} 
        title={t('common.help') || 'Help'}
      >
        ?
      </button>
      
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
          <div className="mode-icon" style={styles.communityIcon}>✨</div>
          <div className="mode-details">
            <div className="mode-title">{t('mode.community')}</div>
          </div>
        </div>
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
  optionCard: (comingSoon: boolean) => ({
    opacity: comingSoon ? 0.7 : 1, 
    cursor: comingSoon ? 'not-allowed' : 'pointer',
  }),
  soonBadge: { 
    fontSize: '12px', 
    marginLeft: '10px', 
    background: 'var(--ink)', 
    color: 'var(--yellow)', 
    padding: '2px 8px', 
    borderRadius: '10px', 
    verticalAlign: 'middle', 
    fontWeight: 'bold' as const,
  },
  hintContainer: { 
    position: 'absolute' as const, 
    top: '22px', 
    right: '75px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    pointerEvents: 'none' as const,
  },
  hintText: { 
    fontFamily: "'Gaegu', cursive", 
    fontSize: '16px', 
    color: 'var(--ink)', 
    background: 'white',
    padding: '4px 10px',
    borderRadius: '12px 12px 0 12px',
    border: '2px solid var(--ink)',
    boxShadow: '2px 2px 0 var(--ink)',
    whiteSpace: 'nowrap' as const,
    animation: 'float-x 2s ease-in-out infinite',
  },
  communityIcon: { 
    background: '#eee',
  },
};
