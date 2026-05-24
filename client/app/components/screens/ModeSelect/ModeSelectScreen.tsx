'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

interface ModeSelectProps {
  onSelectMode: (mode: 'solo' | 'duo' | 'live' | 'community', sizeId?: number) => void;
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

interface ModeOptionCardProps {
  icon: string;
  title: string;
  desc?: string;
  onClick: () => void;
  comingSoon?: boolean;
  theme?: 'solo' | 'duo' | 'live' | 'community' | 'default';
  style?: React.CSSProperties;
}

/**
 * Reusable ModeOptionCard sub-component for high modularity, DRY principles,
 * and high developer experience (DX).
 */
const ModeOptionCard = React.memo(({
  icon,
  title,
  desc,
  onClick,
  comingSoon = false,
  theme = 'default',
  style
}: ModeOptionCardProps) => {
  const cardStyle = useMemo(() => {
    return {
      opacity: comingSoon ? 0.7 : 1,
      cursor: comingSoon ? 'not-allowed' : 'pointer',
      ...style
    };
  }, [comingSoon, style]);

  return (
    <div 
      className={`mode-option-card ${theme} ${comingSoon ? 'coming-soon' : ''}`}
      onClick={onClick}
      style={cardStyle}
    >
      <div className="mode-icon">{icon}</div>
      <div className="mode-details">
        <div className="mode-title">
          {title}
          {comingSoon && <span className="soon-badge">SOON!</span>}
        </div>
        {desc && <div className="mode-desc">{desc}</div>}
      </div>
    </div>
  );
});

ModeOptionCard.displayName = 'ModeOptionCard';

export default function ModeSelectScreen({ onSelectMode, onShowHelp }: ModeSelectProps) {
  const { t } = useLanguage();
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  // Map translations for group options
  const groupOptions = useMemo(() => {
    return STATIC_GROUP_OPTIONS.map(opt => ({
      ...opt,
      label: t(opt.labelKey),
      desc: t(opt.descKey),
    }));
  }, [t]);

  // Handle click on coming soon cards
  const handleComingSoonClick = useCallback(async () => {
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
  }, [t]);

  // Renders the main photo taking options
  const renderMainOptions = () => (
    <>
      <div className="form-section-title">{t('mode.howToPhoto')}</div>

      <div className="mode-main-grid">
        <ModeOptionCard 
          icon="👤"
          title={t('mode.solo')}
          onClick={() => onSelectMode('solo')}
          theme="solo"
        />

        <ModeOptionCard 
          icon="👥"
          title={t('mode.group')}
          onClick={() => setShowGroupOptions(true)}
          theme="duo"
        />

        <ModeOptionCard 
          icon="⚡"
          title={t('mode.live')}
          onClick={() => onSelectMode('live', 2)}
          theme="live"
        />

        <ModeOptionCard 
          icon="✨"
          title={t('mode.community')}
          onClick={() => onSelectMode('community')}
          theme="community"
        />
      </div>
    </>
  );

  // Renders the sub-screen options for group sizes
  const renderGroupOptions = () => (
    <>
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
        <ModeOptionCard
          key={opt.id}
          icon={opt.icon}
          title={opt.label}
          onClick={() => {
            if (opt.comingSoon) {
              handleComingSoonClick();
              return;
            }
            onSelectMode('duo', opt.id);
          }}
          comingSoon={!!opt.comingSoon}
          style={{ marginBottom: '16px' }}
        />
      ))}
    </>
  );

  return (
    <section className="page active" id="page-mode-select">
      {/* Help Hint Bubble (only visible on main selection screen) */}
      {!showGroupOptions && (
        <div className="help-hint-container" style={styles.hintContainer}>
          <span style={styles.hintText}>
            {t('mode.helpHint')}
          </span>
        </div>
      )}

      {/* Reusable Help Button */}
      <button 
        type="button" 
        className="btn-help" 
        onClick={onShowHelp} 
        title={t('common.help') || 'Help'}
      >
        ?
      </button>
      
      {/* Left Sidebar Brand/Title */}
      <div className="mode-left vibe-bg">
        <div className="big-doodle">
          {showGroupOptions ? t('mode.howMany') : t('mode.pickYour')}
          <span className="outline">
            {showGroupOptions ? t('mode.people') : t('mode.vibe')}
          </span>
        </div>
      </div>

      {/* Right Option Column */}
      <div className="mode-right">
        {showGroupOptions ? renderGroupOptions() : renderMainOptions()}
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
  optionCard: {
    // Shared defaults (transferred to CSS / dynamic calculation)
  },
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
  liveDesc: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '13px',
    marginTop: '4px',
    fontFamily: "'Gaegu', cursive",
  },
  communityIcon: { 
    background: '#eee',
  },
};
