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
          title={t('common.help') || 'Help'}
          className="mode-btn-pill"
          style={{ marginLeft: onBack ? 'auto' : '0' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{t('common.help') || 'Help'}</span>
        </button>
      </div>

      <h2 className="mode-section-title">{t('home.activities.title')}</h2>

      <div className="mode-cards-grid">
        {/* Duo Live Mode */}
        <div className="mode-card popular" onClick={() => onSelectMode('live', 2)}>
          <div className="mode-card-top">
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
              <span style={{ fontSize: '14px', fontWeight: 800 }}>{opt.id}P</span>
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
      </div>

      {/* Right Option Column */}
      <div className="mode-right">
        {showGroupOptions ? renderGroupOptions() : renderMainOptions()}
      </div>
    </section>
  );
}
