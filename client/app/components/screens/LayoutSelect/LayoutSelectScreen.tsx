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
      <div className="layout-header-row">
        {onBack && (
          <button 
            type="button"
            onClick={onBack}
            className="layout-back-btn"
            aria-label={t('common.back')}
          >
            <span>{t('common.back')}</span>
          </button>
        )}
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}

              <div className="layout-preview-modern">
                <div 
                  className={`layout-preview-slots layout-slots-count-${layout.slots.length}`}
                  style={{ 
                    flexDirection: layout.direction || 'row', 
                    gap: layout.gap || '5px' 
                  }}
                >
                  {layout.slots.map((_, i) => (
                    <div key={i} className="preview-slot-modern" />
                  ))}
                </div>
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
