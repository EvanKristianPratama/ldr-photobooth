import React from 'react';

export default function LayoutSelectScreen({
  selectedLayout,
  onSelectLayout,
  onStart
}) {
  return (
    <div className="screen-card glass-panel">
      <div className="screen-card__header">
        <div className="screen-card__icon">🎨</div>
        <div>
          <h2 className="screen-card__title">Select Layout</h2>
          <p className="screen-card__subtitle">Pilih gaya foto kamu</p>
        </div>
      </div>

      <div className="screen-card__body">
        <div className="layout-selection-container">
          <div
            className={`layout-card ${selectedLayout === 'layout1' ? 'selected' : ''}`}
            onClick={() => onSelectLayout('layout1')}
          >
            <div className="layout-preview">
              <div className="layout-mini-1"><div /><div /></div>
            </div>
            <div className="strip-label">1 Shot</div>
          </div>

          <div
            className={`layout-card ${selectedLayout === 'layout2' ? 'selected' : ''}`}
            onClick={() => onSelectLayout('layout2')}
          >
            <div className="layout-preview">
              <div className="layout-mini-2"><div /><div /><div /><div /></div>
            </div>
            <div className="strip-label">2 Shots</div>
          </div>

          <div
            className={`layout-card ${selectedLayout === 'layout3' ? 'selected' : ''}`}
            onClick={() => onSelectLayout('layout3')}
          >
            <div className="layout-preview">
              <div className="layout-mini-3"><div /><div /><div /><div /><div /><div /></div>
            </div>
            <div className="strip-label">3 Shots</div>
          </div>
        </div>
      </div>

      <button
        className={`btn-primary screen-card__cta ${!selectedLayout ? 'disabled' : ''}`}
        onClick={onStart}
        disabled={!selectedLayout}
      >
        START BOOTH 📸
      </button>
    </div>
  );
}
