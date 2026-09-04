'use client';

import React, { useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';

import './LayoutSelectScreen.css';

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
    <section className="layout-select-section" id="page-layout">
      {onBack && (
        <button 
          type="button"
          onClick={onBack}
          className="layout-back-btn"
          aria-label={t('common.back')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>{t('common.back')}</span>
        </button>
      )}

      <div className="layout-title-row">
        <h1 className="layout-title">{t('layout.title')}</h1>
      </div>

      <div className="layout-grid-modern">
        {layouts.map((layout) => {
          const isSelected = selectedLayout === layout.id;
          return (
            <div 
              key={layout.id}
              className={`layout-card-modern ${isSelected ? 'selected' : ''}`} 
              onClick={() => onSelectLayout(layout.id)}
            >
              {isSelected && (
                <div className="layout-check-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}

              <div 
                className="layout-preview-modern" 
                style={{ 
                  flexDirection: layout.direction || 'row', 
                  gap: layout.gap || '6px' 
                }}
              >
                {layout.slots.map((slot, i) => (
                  <div 
                    key={i} 
                    className="preview-slot-modern" 
                    style={{ width: slot.w, height: slot.h }}
                  />
                ))}
              </div>

              <div className="layout-info-modern">
                <span className="layout-name-modern">{layout.name}</span>
                <span className="layout-count-modern">
                  {layout.count} {layout.count > 1 ? t('layout.photosPlural') : t('layout.photos')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedLayout === 'layout1' && (
        <div className="layout-warning-banner">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#ca8a04" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="layout-warning-icon"
          >
            <rect x="5" y="2" width="14" height="20" rx="3" ry="3"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
          <div className="layout-warning-text">
            <strong>Rekomendasi Orientasi:</strong> Jika memilih <strong>1 Foto Bareng</strong>, disarankan menggunakan HP posisi tegak (<strong>Portrait</strong>) agar badan & wajah pas dan tidak terpotong ekstrem di frame!
          </div>
        </div>
      )}

      <div className="layout-start-container-modern">
        <button 
          type="button"
          className="layout-start-btn-modern" 
          disabled={!selectedLayout}
          onClick={onStart}
        >
          <span>{selectedLayout ? t('layout.start') : t('layout.selectFirst')}</span>
        </button>
      </div>
    </section>
  );
}
