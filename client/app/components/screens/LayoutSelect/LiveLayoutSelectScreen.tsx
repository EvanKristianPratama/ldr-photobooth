'use client';

import React, { useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

interface LayoutSlot {
  w: string;
  h: string;
}

interface LayoutConfig {
  id: string;
  name: string;
  count: number;
  slots: LayoutSlot[];
  direction?: 'row' | 'column';
  gap?: string;
}

interface LiveLayoutSelectProps {
  selectedLayout: string;
  onSelectLayout: (layoutId: string) => void;
  onStart: () => void;
  onBack?: () => void;
  groupSize?: number;
}

const LIVE_LAYOUTS: LayoutConfig[] = [
  { id: 'layout1', name: '1 Foto Bareng', count: 1, slots: [{ w: '120px', h: '90px' }] },
  { id: 'layout2', name: '2 Foto Strip', count: 2, slots: [{ w: '120px', h: '64px' }, { w: '120px', h: '64px' }], direction: 'column' },
  { id: 'layout3', name: '3 Foto Strip', count: 3, slots: [{ w: '110px', h: '46px' }, { w: '110px', h: '46px' }, { w: '110px', h: '46px' }], direction: 'column', gap: '5px' },
  { id: 'layout4', name: '4 Foto Strip', count: 4, slots: [{ w: '90px', h: '34px' }, { w: '90px', h: '34px' }, { w: '90px', h: '34px' }, { w: '90px', h: '34px' }], direction: 'column', gap: '5px' },
];

export default function LiveLayoutSelectScreen({
  selectedLayout,
  onSelectLayout,
  onStart,
  onBack
}: LiveLayoutSelectProps) {
  const { t } = useLanguage();

  return (
    <section className="page active" id="page-layout" style={styles.section}>
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
      
      <div className="page-title-row" style={styles.titleRow}>
        <div className="page-title" style={{ fontSize: '32px' }}>{t('liveLayout.title')}</div>
      </div>

      <div className="layout-grid" style={styles.grid}>
        {LIVE_LAYOUTS.map((layout) => (
          <div 
            key={layout.id}
            className={`layout-card squiggle ${selectedLayout === layout.id ? 'selected' : ''}`} 
            onClick={() => onSelectLayout(layout.id)}
            style={styles.card}
          >
            <div className="layout-preview" style={{ ...styles.preview, flexDirection: layout.direction || 'row', gap: layout.gap || '6px' }}>
              {layout.slots.map((slot, i) => (
                <div key={i} className="preview-slot" style={{ width: slot.w, height: slot.h }}></div>
              ))}
            </div>
            <div className="layout-info">
              <span className="layout-name" style={{ fontWeight: 'bold' }}>{layout.name}</span>
              <span className="layout-count">
                {layout.count} {layout.count > 1 ? t('liveLayout.poses') : t('liveLayout.pose')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedLayout === 'layout1' && (
        <div style={styles.warningBanner}>
          <span style={{ fontSize: '24px' }}>📱</span>
          <div style={{ textAlign: 'left' }}>
            {t('liveLayout.warning')}
          </div>
        </div>
      )}

      <div className="layout-start-container" style={styles.startContainer}>
        <button 
          type="button"
          className="btn-primary layout-start-btn" 
          disabled={!selectedLayout}
          onClick={onStart}
          style={{
            ...styles.startBtn,
            background: selectedLayout ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : '#ccc',
            color: 'white',
            borderColor: 'var(--ink)'
          }}
        >
          {selectedLayout ? t('liveLayout.start') : t('liveLayout.selectFirst')}
        </button>
      </div>
    </section>
  );
}

const styles = {
  section: {
    alignItems: 'center',
    textAlign: 'center' as const,
    position: 'relative' as const,
  },
  backBtn: { 
    position: 'absolute' as const,
    top: '20px',
    left: '20px',
    zIndex: 100,
    padding: '8px 16px',
    fontSize: '16px',
    fontFamily: "'Gaegu', cursive",
  },
  titleRow: {
    justifyContent: 'center',
    marginBottom: '36px',
  },
  grid: {
    justifyContent: 'center',
    gap: '24px',
  },
  card: {
    minWidth: '220px',
  },
  preview: {
    display: 'flex',
  },
  warningBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '540px',
    margin: '24px auto -12px auto',
    padding: '12px 18px',
    background: '#fffbeb',
    border: '2.5px solid var(--ink)',
    borderRadius: '12px',
    boxShadow: '4px 4px 0 var(--ink)',
    color: '#854d0e',
    fontFamily: "'Gaegu', cursive",
    fontSize: '16px',
    lineHeight: '1.4',
  },
  startContainer: {
    marginTop: '60px',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  startBtn: {
    width: 'auto',
    minWidth: '320px',
    padding: '20px 40px',
    fontSize: '24px',
    boxShadow: '6px 6px 0 var(--ink)',
  },
};
