'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import './ModeSelectScreen.css';

interface ModeSelectProps {
  onSelectMode: (mode: 'solo' | 'duo' | 'live' | 'community', sizeId?: number) => void;
  onShowHelp: () => void;
  onBack?: () => void;
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

export default function ModeSelectScreen({ onSelectMode, onShowHelp, onBack }: ModeSelectProps) {
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
        confirmButtonColor: '#111827',
        customClass: {
          popup: 'swal-clean',
        },
      });
    } catch (error) {
      console.error('Failed to load SweetAlert2:', error);
    }
  }, [t]);

  // Renders the main photo taking options
  const renderMainOptions = () => (
    <>
      <div className="mode-header-actions">
        {onBack && (
          <button 
            type="button" 
            onClick={onBack} 
            title={t('common.home') || 'Home'}
            className="mode-btn-pill"
          >
            <span>←</span>
            <span>Home</span>
          </button>
        )}
        <button 
          type="button" 
          onClick={onShowHelp} 
          title={t('common.help') || 'Bantuan'}
          className="mode-btn-pill"
          style={{ marginLeft: onBack ? 'auto' : '0' }}
        >
          <span>💡</span>
          <span>{t('common.help') || 'Bantuan'}</span>
        </button>
      </div>

      <h2 className="mode-section-title">{t('home.activities.title')}</h2>

      <div className="mode-cards-grid">
        {/* Duo Live Mode */}
        <div className="mode-card popular" onClick={() => onSelectMode('live', 2)}>
          <div className="mode-card-top">
            <span className="mode-card-icon live-icon">⚡</span>
            <span className="mode-badge lime">{t('home.mode.live.badge')}</span>
          </div>
          <h3 className="mode-card-title">{t('home.mode.live.title')}</h3>
          <p className="mode-card-desc">{t('home.mode.live.desc')}</p>
          <div className="mode-card-action">
            <span>{t('home.mode.live.cta')}</span>
          </div>
        </div>

        {/* Solo Mode */}
        <div className="mode-card" onClick={() => onSelectMode('solo')}>
          <div className="mode-card-top">
            <span className="mode-card-icon solo-icon">👤</span>
            <span className="mode-badge solo-badge">{t('home.mode.solo.badge')}</span>
          </div>
          <h3 className="mode-card-title">{t('home.mode.solo.title')}</h3>
          <p className="mode-card-desc">{t('home.mode.solo.desc')}</p>
          <div className="mode-card-action">
            <span>{t('home.mode.solo.cta')}</span>
          </div>
        </div>

        {/* LDR Surprise Mode */}
        <div className="mode-card" onClick={() => setShowGroupOptions(true)}>
          <div className="mode-card-top">
            <span className="mode-card-icon surprise-icon">👥</span>
            <span className="mode-badge surprise-badge">{t('home.mode.group.badge')}</span>
          </div>
          <h3 className="mode-card-title">{t('home.mode.group.title')}</h3>
          <p className="mode-card-desc">{t('home.mode.group.desc')}</p>
          <div className="mode-card-action">
            <span>{t('home.mode.group.cta')}</span>
          </div>
        </div>

        {/* Community Showcase */}
        <div className="mode-card" onClick={() => onSelectMode('community')}>
          <div className="mode-card-top">
            <span className="mode-card-icon community-icon">✨</span>
            <span className="mode-badge gallery-badge">{t('home.mode.community.badge')}</span>
          </div>
          <h3 className="mode-card-title">{t('home.mode.community.title')}</h3>
          <p className="mode-card-desc">{t('home.mode.community.desc')}</p>
          <div className="mode-card-action">
            <span>{t('home.mode.community.cta')}</span>
          </div>
        </div>
      </div>
    </>
  );

  // Renders the sub-screen options for group sizes
  const renderGroupOptions = () => (
    <>
      <div className="mode-header-actions">
        <button 
          type="button"
          onClick={() => setShowGroupOptions(false)}
          className="mode-btn-pill"
        >
          <span>←</span>
          <span>{t('common.back') || 'Kembali'}</span>
        </button>
      </div>
      
      <h2 className="mode-section-title">{t('mode.selectSize')}</h2>

      <div className="mode-group-container">
        {groupOptions.map(opt => (
          <div
            key={opt.id}
            className={`mode-group-card ${opt.comingSoon ? 'disabled' : ''}`}
            onClick={() => {
              if (opt.comingSoon) {
                handleComingSoonClick();
                return;
              }
              onSelectMode('duo', opt.id);
            }}
          >
            <div className="mode-card-icon surprise-icon">
              {opt.icon}
            </div>
            <div className="mode-group-info">
              <div className="mode-group-title">
                <span>{opt.label}</span>
                {opt.comingSoon && <span className="mode-soon-tag">SOON</span>}
              </div>
              <div className="mode-group-desc">{opt.desc}</div>
            </div>
            <span style={{ fontSize: '18px', color: '#94a3b8' }}>→</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <section className="mode-select-page">
      {/* Left Sidebar: Clean Studio Showcase */}
      <div className="mode-left">
        {/* Big Studio Headline */}
        <h1 className="mode-left-headline">
          The online<br />
          photobooth for<br />
          <span className="mode-cursive-accent">moments</span> together.
        </h1>

        <p className="mode-left-desc">
          {t('home.footer.tagline') || 'The Original LDR Photobooth in the World'}
        </p>

        {/* Interactive Couple Connection Card */}
        <div className="mode-connection-card">
          <div className="mode-conn-top">
            <span className="mode-live-dot" />
            <span className="mode-conn-status">Live Dual Camera Sync</span>
            <span className="mode-conn-badge">WebRTC</span>
          </div>

          <div className="mode-conn-nodes">
            {/* You */}
            <div className="mode-node">
              <div className="mode-node-avatar">📸</div>
              <div className="mode-node-name">You</div>
              <div className="mode-node-sub">📍 Local Cam</div>
            </div>

            {/* Connecting Arc Line */}
            <div className="mode-conn-line-wrap">
              <div className="mode-conn-line" />
              <div className="mode-conn-heart">♥</div>
            </div>

            {/* Partner */}
            <div className="mode-node">
              <div className="mode-node-avatar">🌍</div>
              <div className="mode-node-name">Partner</div>
              <div className="mode-node-sub">📍 Across Distance</div>
            </div>
          </div>

          <div className="mode-conn-footer">
            <span>⚡ 1-Click Start • Sub-second Sync • 100% Free</span>
          </div>
        </div>
      </div>

      {/* Right Option Column */}
      <div className="mode-right">
        {showGroupOptions ? renderGroupOptions() : renderMainOptions()}
      </div>
    </section>
  );
}
