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

interface LayoutSelectProps {
  selectedLayout: string;
  onSelectLayout: (layoutId: string) => void;
  onStart: () => void;
  onBack?: () => void;
  groupSize?: number;
}

const ALL_LAYOUTS: LayoutConfig[] = [
  { id: 'layout1', name: 'Single', count: 1, slots: [{ w: '120px', h: '90px' }] },
  { id: 'layout2', name: 'Duo Strip', count: 2, slots: [{ w: '120px', h: '64px' }, { w: '120px', h: '64px' }], direction: 'column' },
  { id: 'layout3', name: 'Classic Strip', count: 3, slots: [{ w: '110px', h: '46px' }, { w: '110px', h: '46px' }, { w: '110px', h: '46px' }], direction: 'column', gap: '5px' },
  { id: 'layout4', name: 'Quad Strip', count: 4, slots: [{ w: '90px', h: '34px' }, { w: '90px', h: '34px' }, { w: '90px', h: '34px' }, { w: '90px', h: '34px' }], direction: 'column', gap: '5px' },
];

export default function LayoutSelectScreen({
  selectedLayout,
  onSelectLayout,
  onStart,
  onBack,
  groupSize = 2
}: LayoutSelectProps) {
  const { t } = useLanguage();

  const layouts = useMemo(() => {
    if (groupSize === 3) {
      return [
        { id: 'layout1', name: 'Single Stack', count: 1, slots: [{ w: '120px', h: '40px' }, { w: '120px', h: '40px' }, { w: '120px', h: '40px' }], direction: 'column' as const, gap: '4px' },
        { id: 'layout2', name: 'Double Stack', count: 2, slots: Array(6).fill({ w: '120px', h: '25px' }), direction: 'column' as const, gap: '2px' },
      ];
    }
    if (groupSize === 4) {
      return [
        { id: 'layout1', name: 'Quad 2x2', count: 1, slots: [{ w: '60px', h: '45px' }, { w: '60px', h: '45px' }, { w: '60px', h: '45px' }, { w: '60px', h: '45px' }], direction: 'row' as const, gap: '4px' },
      ];
    }
    return ALL_LAYOUTS;
  }, [groupSize]);

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
        <div className="page-title">{t('layout.title')}</div>
      </div>

      <div className="layout-grid" style={styles.grid}>
        {layouts.map((layout) => (
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
              <span className="layout-name">{layout.name}</span>
              <span className="layout-count">
                {layout.count} {layout.count > 1 ? t('layout.photosPlural') : t('layout.photos')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="layout-start-container" style={styles.startContainer}>
        <button 
          type="button"
          className="btn-primary layout-start-btn" 
          disabled={!selectedLayout}
          onClick={onStart}
          style={styles.startBtn}
        >
          {selectedLayout ? t('layout.start') : t('layout.selectFirst')}
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
    marginBottom: '48px',
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
  startContainer: {
    marginTop: '60px',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  startBtn: {
    width: 'auto',
    minWidth: '300px',
    padding: '20px 40px',
    fontSize: '24px',
  },
};
