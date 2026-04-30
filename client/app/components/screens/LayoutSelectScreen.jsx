import React from 'react';

export default function LayoutSelectScreen({
  selectedLayout,
  onSelectLayout,
  onStart
}) {
  const layouts = [
    { id: 'layout1', name: 'Single', count: 1, slots: [{ w: '120px', h: '90px' }] },
    { id: 'layout2', name: 'Duo Strip', count: 2, slots: [{ w: '120px', h: '64px' }, { w: '120px', h: '64px' }], direction: 'column' },
    { id: 'layout3', name: 'Classic Strip', count: 3, slots: [{ w: '110px', h: '46px' }, { w: '110px', h: '46px' }, { w: '110px', h: '46px' }], direction: 'column', gap: '5px' },
  ];

  return (
    <section className="page active" id="page-layout" style={{ alignItems: 'center', textAlign: 'center' }}>
      <div className="page-title-row" style={{ justifyContent: 'center', marginBottom: '48px' }}>
        <div className="page-title">Pick a layout ✦</div>
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
              <span className="layout-count">{layout.count} photo{layout.count > 1 ? 's' : ''}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '60px', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button 
          className="btn-primary" 
          disabled={!selectedLayout}
          onClick={onStart}
          style={{ width: 'auto', minWidth: '300px', padding: '20px 40px', fontSize: '24px' }}
        >
          {selectedLayout ? 'Start Capture →' : 'Pilih Layout Dulu ✨'}
        </button>
      </div>
    </section>
  );
}
