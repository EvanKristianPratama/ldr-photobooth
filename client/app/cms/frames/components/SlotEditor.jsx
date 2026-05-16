import React from 'react';

/**
 * SlotEditor — Property editor panel for a selected photo slot.
 * Includes aspect ratio lock toggle and all position/size/rotation controls.
 */
export default function SlotEditor({ slot, onUpdate, onDragEnd, canvasWidth, canvasHeight, frameMode }) {
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
        value={slot[field]}
        min={min}
        max={max}
        step={step}
        onChange={e => handleChange(field, parseFloat(e.target.value) || 0)}
        onBlur={() => onDragEnd?.()}
      />
    </div>
  );

  const currentRatio = slot.width / slot.height;

  return (
    <div className="cms-panel-section">
      <div className="cms-panel-section__title">
        <span>⚙️ Slot Properties</span>
        <span className="cms-panel-section__subtitle">{slot.label}</span>
      </div>

      <div className="cms-field">
        <label className="cms-field__label">Label</label>
        <input
          type="text"
          className="cms-field__input"
          value={slot.label}
          onChange={e => handleChange('label', e.target.value)}
          placeholder="Photo 1"
        />
      </div>

      {/* ── Aspect Ratio Lock ── */}
      <div className="cms-field">
        <label className="cms-toggle">
          <input
            type="checkbox"
            checked={slot.aspectRatioLocked || false}
            onChange={e => handleChangeCommit('aspectRatioLocked', e.target.checked)}
          />
          <span className="cms-toggle__slider" />
          <span className="cms-toggle__label">
            🔒 Lock Aspect Ratio {slot.aspectRatioLocked ? `(${currentRatio.toFixed(2)})` : ''}
          </span>
        </label>
      </div>

      {/* ── Owner Assignment (Duo mode) ── */}
      {frameMode === 'duo' && (
        <div className="cms-field">
          <label className="cms-field__label">Photo Owner</label>
          <div className="cms-slot-presets__btns">
            <button
              className={`cms-btn cms-btn--xs ${slot.owner === 'userA' ? 'cms-btn--user-a' : ''}`}
              onClick={() => { handleChangeCommit('owner', 'userA'); }}
            >
              🔵 User A
            </button>
            <button
              className={`cms-btn cms-btn--xs ${slot.owner === 'userB' ? 'cms-btn--user-b' : ''}`}
              onClick={() => { handleChangeCommit('owner', 'userB'); }}
            >
              🟣 User B
            </button>
            <button
              className={`cms-btn cms-btn--xs ${slot.owner === 'any' ? 'cms-btn--active' : ''}`}
              onClick={() => { handleChangeCommit('owner', 'any'); }}
            >
              ⚪ Any
            </button>
          </div>
        </div>
      )}

      {/* ── Photo Shape ── */}
      <div className="cms-field">
        <label className="cms-field__label">Photo Shape</label>
        <div className="cms-slot-presets__btns" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {[
            { id: 'rect', label: 'Square', icon: '⬜' },
            { id: 'rounded', label: 'Rounded', icon: '🔲' },
            { id: 'oval', label: 'Oval', icon: '⭕' },
            { id: 'heart', label: 'Heart', icon: '❤️' },
            { id: 'star', label: 'Star', icon: '⭐' },
            { id: 'cloud', label: 'Cloud', icon: '☁️' }
          ].map(sh => (
            <button
              key={sh.id}
              title={sh.label}
              className={`cms-btn cms-btn--xs ${(slot.shape || 'rect') === sh.id ? 'cms-btn--active' : ''}`}
              onClick={() => { 
                handleChangeCommit('shape', sh.id); 
                // Set reasonable default radius for rounded
                if (sh.id === 'rounded' && (!slot.borderRadius || slot.borderRadius === 0)) {
                  handleChangeCommit('borderRadius', 24);
                } else if (sh.id !== 'rounded' && sh.id !== 'rect') {
                  handleChangeCommit('borderRadius', 0);
                }
              }}
              style={{ padding: '4px 8px', fontSize: '14px' }}
            >
              {sh.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="cms-field-row">
        {numField('X', 'x', 0, canvasWidth)}
        {numField('Y', 'y', 0, canvasHeight)}
      </div>

      <div className="cms-field-row">
        <div className="cms-field">
          <label className="cms-field__label">Width</label>
          <input
            type="number"
            className="cms-field__input"
            value={slot.width}
            min={50}
            max={canvasWidth}
            onChange={e => {
              const w = parseFloat(e.target.value) || 50;
              if (slot.aspectRatioLocked) {
                onUpdate({ width: w, height: Math.round(w / currentRatio) });
              } else {
                onUpdate({ width: w });
              }
            }}
            onBlur={() => onDragEnd?.()}
          />
        </div>
        <div className="cms-field">
          <label className="cms-field__label">Height</label>
          <input
            type="number"
            className="cms-field__input"
            value={slot.height}
            min={50}
            max={canvasHeight}
            onChange={e => {
              const h = parseFloat(e.target.value) || 50;
              if (slot.aspectRatioLocked) {
                onUpdate({ height: h, width: Math.round(h * currentRatio) });
              } else {
                onUpdate({ height: h });
              }
            }}
            onBlur={() => onDragEnd?.()}
          />
        </div>
      </div>

      <div className="cms-field-row">
        {numField('Rotation (°)', 'rotation', -180, 180, 1)}
        {numField('Radius (px)', 'borderRadius', 0, 200)}
      </div>

      <div className="cms-field-row">
        {numField('Z-Index', 'zIndex', 0, 100)}
      </div>

      <div className="cms-slot-presets">
        <span className="cms-field__label">Quick Size</span>
        <div className="cms-slot-presets__btns">
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ width: 500, height: 750 }); onDragEnd?.(); }}>
            3:2 Portrait
          </button>
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ width: 500, height: 500 }); onDragEnd?.(); }}>
            1:1 Square
          </button>
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ width: 500, height: 375 }); onDragEnd?.(); }}>
            4:3 Landscape
          </button>
          <button className="cms-btn cms-btn--xs" onClick={() => {
            const w = Math.round(canvasWidth * 0.86);
            onUpdate({ width: w, height: Math.round(w * 1.5), x: Math.round((canvasWidth - w) / 2) });
            onDragEnd?.();
          }}>
            Full Width
          </button>
        </div>
      </div>

      <div className="cms-slot-presets">
        <span className="cms-field__label">Alignment</span>
        <div className="cms-slot-presets__btns">
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ x: Math.round((canvasWidth - slot.width) / 2) }); onDragEnd?.(); }}>
            ↔ Center H
          </button>
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ y: Math.round((canvasHeight - slot.height) / 2) }); onDragEnd?.(); }}>
            ↕ Center V
          </button>
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ x: 0 }); onDragEnd?.(); }}>
            ⇐ Left
          </button>
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ x: canvasWidth - slot.width }); onDragEnd?.(); }}>
            ⇒ Right
          </button>
        </div>
      </div>
    </div>
  );
}
