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
  badge?: string;
  badgeColor?: 'lime' | 'dark' | 'gray';
  onClick: () => void;
  comingSoon?: boolean;
  theme?: 'solo' | 'duo' | 'live' | 'community' | 'default';
  style?: React.CSSProperties;
}

const ModeOptionCard = React.memo(({
  icon,
  title,
  desc,
  badge,
  badgeColor = 'gray',
  onClick,
  comingSoon = false,
  theme = 'default',
  style
}: ModeOptionCardProps) => {
  const cardStyle = useMemo(() => {
    return {
      opacity: comingSoon ? 0.6 : 1,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div className="mode-icon">{icon}</div>
        {badge && (
          <span 
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              padding: '3px 8px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              background: badgeColor === 'lime' ? '#ccff00' : badgeColor === 'dark' ? '#111827' : '#f1f5f9',
              color: badgeColor === 'lime' ? '#0f172a' : badgeColor === 'dark' ? '#ffffff' : '#64748b',
              border: badgeColor === 'lime' ? '1px solid #bbf7d0' : 'none',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="mode-details">
        <div className="mode-title">
          <span>{title}</span>
          {comingSoon && <span className="soon-badge">SOON</span>}
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
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{t('mode.howToPhoto') || 'Mau foto gimana hari ini?'}</h2>
        <p style={styles.sectionSub}>Pilih mode pemotretan yang kamu inginkan untuk memulai sesi.</p>
      </div>

      <div className="mode-main-grid">
        {/* Duo Live Mode (Featured Hero Mode) */}
        <ModeOptionCard 
          icon="⚡"
          title={t('mode.live') || 'Duo Live Mode'}
          desc="Hubungkan 2 kamera live secara real-time dari mana saja."
          badge="POPULAR • LIVE"
          badgeColor="lime"
          onClick={() => onSelectMode('live', 2)}
          theme="live"
        />

        {/* Solo Mode */}
        <ModeOptionCard 
          icon="👤"
          title={t('mode.solo') || 'Solo Mode'}
          desc="Foto sendiri dengan strip ala photobooth Korea Life4Cuts."
          badge="PORTRAIT"
          badgeColor="gray"
          onClick={() => onSelectMode('solo')}
          theme="solo"
        />

        {/* LDR Surprise Mode */}
        <ModeOptionCard 
          icon="👥"
          title={t('mode.group') || 'LDR Surprise Mode'}
          desc="Pose bergantian secara rahasia dan lihat hasilnya di akhir."
          badge="TURN-BASED"
          badgeColor="gray"
          onClick={() => setShowGroupOptions(true)}
          theme="duo"
        />

        {/* Community Showcase */}
        <ModeOptionCard 
          icon="✨"
          title={t('mode.community') || 'Komunitas'}
          desc="Lihat hasil strip foto manis dan template frame buatan kreator."
          badge="SHOWCASE"
          badgeColor="gray"
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
        className="btn-secondary"
        style={styles.backBtn}
      >
        ← {t('common.back') || 'Kembali'}
      </button>
      
      <div style={{ ...styles.sectionHeader, marginTop: '40px' }}>
        <h2 style={styles.sectionTitle}>{t('mode.selectSize') || 'Berapa Orang?'}</h2>
        <p style={styles.sectionSub}>Pilih jumlah orang untuk sesi foto bersama ini.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {groupOptions.map(opt => (
          <ModeOptionCard
            key={opt.id}
            icon={opt.icon}
            title={opt.label}
            desc={opt.desc}
            badge={opt.comingSoon ? 'SOON' : 'READY'}
            badgeColor={opt.comingSoon ? 'gray' : 'dark'}
            onClick={() => {
              if (opt.comingSoon) {
                handleComingSoonClick();
                return;
              }
              onSelectMode('duo', opt.id);
            }}
            comingSoon={!!opt.comingSoon}
          />
        ))}
      </div>
    </>
  );

  return (
    <section className="page active" id="page-mode-select">
      {/* Left Sidebar: Clean Studio Showcase (LensBooth / Angie inspired) */}
      <div className="mode-left">
        {/* Top Tag Pill */}
        <div style={styles.brandPill}>
          <span style={{ color: '#059669', fontSize: '11px' }}>✦</span>
          <span style={styles.brandPillText}>THE ORIGINAL LDR PHOTOBOOTH</span>
        </div>

        {/* Big Studio Headline */}
        <h1 style={styles.heroHeadline}>
          The online<br />
          photobooth for<br />
          <span style={styles.cursiveAccent}>moments</span> together.
        </h1>

        <p style={styles.heroSubtitle}>
          The free online photo booth for long-distance couples, best friends, or solo cute shots to create beautiful Korean Life4Cuts strips.
        </p>

        {/* Interactive Couple Connection Card */}
        <div style={styles.connectionCard}>
          <div style={styles.connectionTop}>
            <span style={styles.livePulseDot} />
            <span style={styles.connectionStatusText}>Live Dual Camera Sync</span>
            <span style={styles.webrtcBadge}>WebRTC</span>
          </div>

          <div style={styles.connectionCities}>
            {/* City 1 */}
            <div style={styles.cityItem}>
              <div style={styles.cityAvatar}>
                <span style={{ fontSize: '18px' }}>📸</span>
              </div>
              <div style={styles.cityName}>You</div>
              <div style={styles.citySub}>📍 Local Cam</div>
            </div>

            {/* Connecting Arc Line */}
            <div style={styles.connectorLineWrap}>
              <div style={styles.connectorLine} />
              <div style={styles.connectorHeart}>♥</div>
            </div>

            {/* City 2 */}
            <div style={styles.cityItem}>
              <div style={styles.cityAvatar}>
                <span style={{ fontSize: '18px' }}>🌍</span>
              </div>
              <div style={styles.cityName}>Partner</div>
              <div style={styles.citySub}>📍 Across Distance</div>
            </div>
          </div>

          <div style={styles.connectionFooter}>
            <span>⚡ 1-Click Start • Sub-second Sync • 100% Free</span>
          </div>
        </div>
      </div>

      {/* Right Option Column */}
      <div className="mode-right">
        {/* Clean Help Button */}
        <button 
          type="button" 
          onClick={onShowHelp} 
          title={t('common.help') || 'Bantuan'}
          style={styles.cleanHelpBtn}
        >
          <span style={{ fontSize: '12px', opacity: 0.7 }}>💡</span>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Bantuan</span>
        </button>

        {showGroupOptions ? renderGroupOptions() : renderMainOptions()}
      </div>
    </section>
  );
}

const styles = {
  brandPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 14px',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '999px',
    marginBottom: '20px',
  },
  brandPillText: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#065f46',
    letterSpacing: '0.8px',
  },
  heroHeadline: {
    fontSize: 'clamp(32px, 4vw, 44px)',
    fontWeight: 900,
    lineHeight: 1.15,
    color: '#0f172a',
    margin: '0 0 16px 0',
    letterSpacing: '-1px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  cursiveAccent: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontStyle: 'italic',
    color: '#f43f5e',
    fontWeight: 800,
  },
  heroSubtitle: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#64748b',
    margin: '0 0 32px 0',
    maxWidth: '460px',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  connectionCard: {
    width: '100%',
    maxWidth: '440px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '20px',
    padding: '20px 22px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
  },
  connectionTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  livePulseDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  connectionStatusText: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0f172a',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  webrtcBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    background: '#f1f5f9',
    color: '#64748b',
    borderRadius: '6px',
    marginLeft: 'auto',
  },
  connectionCities: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0 16px',
  },
  cityItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
  },
  cityAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#0f172a',
  },
  citySub: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  connectorLineWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    margin: '0 12px',
  },
  connectorLine: {
    width: '100%',
    height: '2px',
    background: 'repeating-linear-gradient(to right, #cbd5e1 0, #cbd5e1 6px, transparent 6px, transparent 12px)',
  },
  connectorHeart: {
    position: 'absolute' as const,
    color: '#f43f5e',
    fontSize: '14px',
    background: '#ffffff',
    padding: '0 4px',
  },
  connectionFooter: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '12px',
    textAlign: 'center' as const,
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
  },
  sectionHeader: {
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 6px 0',
    letterSpacing: '-0.5px',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  sectionSub: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  cleanHelpBtn: {
    position: 'absolute' as const,
    top: '24px',
    right: '28px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '999px',
    color: '#475569',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.15s ease',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: '16px',
  },
};
