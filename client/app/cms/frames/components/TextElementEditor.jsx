import React from 'react';

/**
 * TextElementEditor — Property editor for a selected text element.
 * Edit content, font family, font size, color, alignment, and position.
 */

const FONT_OPTIONS = [
  { id: "'Quicksand', sans-serif", label: 'Modern' },
  { id: "'Gaegu', cursive", label: 'Doodle' },
  { id: "'Caveat', cursive", label: 'Script' },
  { id: "'Playfair Display', serif", label: 'Elegant' },
  { id: "'Pacifico', cursive", label: 'Retro' },
  { id: "'VT323', monospace", label: 'LCD' },
  { id: "'Silkscreen', monospace", label: 'Pixel' },
  { id: "'Special Elite', cursive", label: 'Typewriter' },
];

const TEXT_TYPES = [
  { id: 'name', label: '{{name}}', desc: 'User name' },
  { id: 'date', label: '{{date}}', desc: 'Date' },
  { id: 'location', label: '{{location}}', desc: 'Location' },
  { id: 'custom', label: 'Custom', desc: 'Free text' },
];

export default function TextElementEditor({ element, onUpdate, onDragEnd, canvasWidth, canvasHeight }) {
  const handleChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="cms-panel-section">
      <div className="cms-panel-section__title">
        <span>✏️ Text Properties</span>
      </div>

      {/* Content */}
      <div className="cms-field">
        <label className="cms-field__label">Content</label>
        <input
          type="text"
          className="cms-field__input"
          value={element.content}
          onChange={e => handleChange('content', e.target.value)}
          onBlur={() => onDragEnd?.()}
          placeholder="Enter text..."
        />
      </div>

      {/* Quick template variables */}
      <div className="cms-field">
        <label className="cms-field__label">Template Variables</label>
        <div className="cms-slot-presets__btns">
          {TEXT_TYPES.map(tt => (
            <button
              key={tt.id}
              className={`cms-btn cms-btn--xs ${element.type === tt.id ? 'cms-btn--active' : ''}`}
              onClick={() => {
                if (tt.id === 'custom') {
                  handleChange('type', 'custom');
                } else {
                  onUpdate({ type: tt.id, content: tt.label });
                }
                onDragEnd?.();
              }}
              title={tt.desc}
            >
              {tt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div className="cms-field">
        <label className="cms-field__label">Font</label>
        <div className="cms-font-row">
          {FONT_OPTIONS.map(f => (
            <button
              key={f.id}
              className={`cms-btn cms-btn--xs ${element.fontFamily === f.id ? 'cms-btn--active' : ''}`}
              style={{ fontFamily: f.id, fontSize: '12px' }}
              onClick={() => { handleChange('fontFamily', f.id); onDragEnd?.(); }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="cms-field-row">
        <div className="cms-field">
          <label className="cms-field__label">Size (px)</label>
          <input
            type="number"
            className="cms-field__input"
            value={element.fontSize}
            min={8}
            max={200}
            onChange={e => handleChange('fontSize', parseInt(e.target.value) || 24)}
            onBlur={() => onDragEnd?.()}
          />
        </div>
        <div className="cms-field">
          <label className="cms-field__label">Color</label>
          <div className="cms-color-row">
            {['#ffffff', '#000000', '#ffd93d', '#ff6b9d', '#06d6a0', '#c77dff'].map(c => (
              <button
                key={c}
                className={`cms-color-swatch cms-color-swatch--sm ${element.color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => { handleChange('color', c); onDragEnd?.(); }}
              />
            ))}
            <input
              type="color"
              className="cms-color-picker"
              value={element.color}
              onChange={e => handleChange('color', e.target.value)}
              onBlur={() => onDragEnd?.()}
            />
          </div>
        </div>
      </div>

      {/* Position */}
      <div className="cms-field-row">
        <div className="cms-field">
          <label className="cms-field__label">X</label>
          <input
            type="number"
            className="cms-field__input"
            value={element.x}
            onChange={e => handleChange('x', parseInt(e.target.value) || 0)}
            onBlur={() => onDragEnd?.()}
          />
        </div>
        <div className="cms-field">
          <label className="cms-field__label">Y (neg = from bottom)</label>
          <input
            type="number"
            className="cms-field__input"
            value={element.y}
            onChange={e => handleChange('y', parseInt(e.target.value) || 0)}
            onBlur={() => onDragEnd?.()}
          />
        </div>
      </div>

      {/* Text Align */}
      <div className="cms-field">
        <label className="cms-field__label">Align</label>
        <div className="cms-slot-presets__btns">
          {['left', 'center', 'right'].map(a => (
            <button
              key={a}
              className={`cms-btn cms-btn--xs ${element.textAlign === a ? 'cms-btn--active' : ''}`}
              onClick={() => { handleChange('textAlign', a); onDragEnd?.(); }}
            >
              {a === 'left' ? '⇐' : a === 'center' ? '⇔' : '⇒'} {a}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Positioning */}
      <div className="cms-slot-presets">
        <span className="cms-field__label">Quick Position</span>
        <div className="cms-slot-presets__btns">
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ x: Math.round(canvasWidth / 2), y: 70, textAlign: 'center' }); onDragEnd?.(); }}>
            Top Center
          </button>
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ x: Math.round(canvasWidth / 2), y: Math.round(canvasHeight / 2), textAlign: 'center' }); onDragEnd?.(); }}>
            Middle
          </button>
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ x: Math.round(canvasWidth / 2), y: -80, textAlign: 'center' }); onDragEnd?.(); }}>
            Bottom
          </button>
        </div>
      </div>
    </div>
  );
}
