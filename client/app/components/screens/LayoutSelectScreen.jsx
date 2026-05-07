import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function LayoutSelectScreen({
  selectedLayout,
  onSelectLayout,
  onStart,
  onBack,
  groupSize = 2
}) {
  const { t } = useLanguage();

  const allLayouts = [
    { id: 'layout1', name: 'Single', count: 1, slots: [{ w: '120px', h: '90px' }] },
    { id: 'layout2', name: 'Duo Strip', count: 2, slots: [{ w: '120px', h: '64px' }, { w: '120px', h: '64px' }], direction: 'column' },
    { id: 'layout3', name: 'Classic Strip', count: 3, slots: [{ w: '110px', h: '46px' }, { w: '110px', h: '46px' }, { w: '110px', h: '46px' }], direction: 'column', gap: '5px' },
    { id: 'layout4', name: 'Quad Strip', count: 4, slots: [{ w: '90px', h: '34px' }, { w: '90px', h: '34px' }, { w: '90px', h: '34px' }, { w: '90px', h: '34px' }], direction: 'column', gap: '5px' },
  ];

  const layouts = React.useMemo(() => {
    if (groupSize === 3) {
      return [
        { id: 'layout1', name: 'Single Stack', count: 1, slots: [{ w: '120px', h: '40px' }, { w: '120px', h: '40px' }, { w: '120px', h: '40px' }], direction: 'column', gap: '4px' },
        { id: 'layout2', name: 'Double Stack', count: 2, slots: Array(6).fill({ w: '120px', h: '25px' }), direction: 'column', gap: '2px' },
      ];
    }
    if (groupSize === 4) {
      return [
        { id: 'layout1', name: 'Quad 2x2', count: 1, slots: [{ w: '60px', h: '45px' }, { w: '60px', h: '45px' }, { w: '60px', h: '45px' }, { w: '60px', h: '45px' }], direction: 'row', gap: '4px' },
      ];
    }
    // Default duo/solo
    return allLayouts;
  }, [groupSize, allLayouts]);

  return (
    <section className="page active" id="page-layout" style={{ alignItems: 'center', textAlign: 'center', position: 'relative' }}>
      {onBack && (
        <button 
          onClick={onBack}
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
      )}
      <div className="page-title-row" style={{ justifyContent: 'center', marginBottom: '48px' }}>
        <div className="page-title">{t('layout.title')}</div>
      </div>

      <div className="layout-grid" style={{ justifyContent: 'center', gap: '24px' }}>
        {layouts.map((layout) => (
          <div 
            key={layout.id}
            className={`layout-card squiggle ${selectedLayout === layout.id ? 'selected' : ''}`} 
            onClick={() => onSelectLayout(layout.id)}
            style={{ minWidth: '220px' }}
          >
            <div className="layout-preview" style={{ flexDirection: layout.direction || 'row', gap: layout.gap || '6px' }}>
              {layout.slots.map((slot, i) => (
                <div key={i} className="preview-slot" style={{ width: slot.w, height: slot.h }}></div>
              ))}
            </div>
            <div className="layout-info">
              <span className="layout-name">{layout.name}</span>
              <span className="layout-count">{layout.count} {layout.count > 1 ? t('layout.photosPlural') : t('layout.photos')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="layout-start-container" style={{ marginTop: '60px', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button 
          className="btn-primary layout-start-btn" 
          disabled={!selectedLayout}
          onClick={onStart}
          style={{ width: 'auto', minWidth: '300px', padding: '20px 40px', fontSize: '24px' }}
        >
          {selectedLayout ? t('layout.start') : t('layout.selectFirst')}
        </button>
      </div>
    </section>
  );
}

