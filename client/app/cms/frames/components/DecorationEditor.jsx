import React from 'react';

/**
 * DecorationEditor — Property editor panel for a selected sticker/decoration.
 * Allows editing X, Y, Width, Height, and Rotation.
 */
export default function DecorationEditor({ decoration, onUpdate, onDragEnd, canvasWidth, canvasHeight }) {
  const handleChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  const handleChangeCommit = (field, value) => {
    onUpdate({ [field]: value });
    onDragEnd?.();
  };

  const numField = (label, field, min, max, step = 1) => (
    <div className="cms-field">
      <label className="cms-field__label">{label}</label>
      <input
        type="number"
        className="cms-field__input"
        value={decoration[field]}
        min={min}
        max={max}
        step={step}
        onChange={e => handleChange(field, parseFloat(e.target.value) || 0)}
        onBlur={() => onDragEnd?.()}
      />
    </div>
  );

  return (
    <div className="cms-panel-section">
      <div className="cms-panel-section__title">
        <span>🎨 Sticker Properties</span>
      </div>

      <div className="cms-field-row">
        {numField('X', 'x', 0, canvasWidth)}
        {numField('Y', 'y', 0, canvasHeight)}
      </div>

      <div className="cms-field-row">
        {numField('Width', 'width', 10, canvasWidth)}
        {numField('Height', 'height', 10, canvasHeight)}
      </div>

      <div className="cms-field">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <label className="cms-field__label">Rotation ({decoration.rotation}deg)</label>
          <button 
            className="cms-btn cms-btn--xs" 
            style={{ padding: '0 4px', fontSize: '10px' }} 
            onClick={() => handleChangeCommit('rotation', 0)}
          >
            Reset
          </button>
        </div>
        <input
          type="range"
          className="cms-slider"
          min="-180"
          max="180"
          value={decoration.rotation}
          onChange={e => handleChange('rotation', parseInt(e.target.value))}
          onMouseUp={() => onDragEnd?.()}
          onTouchEnd={() => onDragEnd?.()}
        />
      </div>
      
      <div className="cms-field">
        <label className="cms-field__label">Opacity ({Math.round((decoration.opacity !== undefined ? decoration.opacity : 1) * 100)}%)</label>
        <input
          type="range"
          className="cms-slider"
          min="0.1"
          max="1"
          step="0.1"
          value={decoration.opacity !== undefined ? decoration.opacity : 1}
          onChange={e => handleChange('opacity', parseFloat(e.target.value))}
          onMouseUp={() => onDragEnd?.()}
          onTouchEnd={() => onDragEnd?.()}
        />
      </div>

    </div>
  );
}
