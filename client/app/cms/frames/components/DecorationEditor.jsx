import React from 'react';
import NumField from './NumField';

/**
 * DecorationEditor — Property editor panel for a selected sticker/decoration.
 * Allows editing X, Y, Width, Height, Rotation, and Opacity.
 */
export default function DecorationEditor({ decoration, onUpdate, onDragEnd, canvasWidth, canvasHeight }) {
  const handleChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  const handleChangeCommit = (field, value) => {
    onUpdate({ [field]: value });
    onDragEnd?.();
  };

  return (
    <div className="cms-panel-section">
      <div className="cms-panel-section__title">
        <span>🎨 Sticker Properties</span>
      </div>

      <div className="cms-field-row">
        <NumField label="X" value={decoration.x} min={0} max={canvasWidth} onChange={v => handleChange('x', v)} onBlur={() => onDragEnd?.()} />
        <NumField label="Y" value={decoration.y} min={0} max={canvasHeight} onChange={v => handleChange('y', v)} onBlur={() => onDragEnd?.()} />
      </div>

      <div className="cms-field-row">
        <NumField label="Width" value={decoration.width} min={10} max={canvasWidth} onChange={v => handleChange('width', v)} onBlur={() => onDragEnd?.()} />
        <NumField label="Height" value={decoration.height} min={10} max={canvasHeight} onChange={v => handleChange('height', v)} onBlur={() => onDragEnd?.()} />
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
