import React, { useRef } from 'react';

/**
 * ToolBar — Template metadata, canvas settings, and action buttons.
 * Controls name, author, canvas dimensions, background, overlay upload,
 * add slot/text/decoration, and publish toggle.
 */
export default function ToolBar({
  templateName, setTemplateName,
  author, setAuthor,
  canvasWidth, setCanvasWidth,
  canvasHeight, setCanvasHeight,
  orientation, setOrientation,
  backgroundColor, setBackgroundColor,
  frameMode, setFrameMode,
  isPublished, setIsPublished,
  onAddSlot,
  onAddText,
  onAddDeco,
  onOverlayUpload,
  overlayPreview,
  onRemoveOverlay,
  photoCount,
  maxSlots
}) {
  const decoInputRef = useRef(null);

  const bgColors = [
    '#1a1a2e', '#ffffff', '#000000', '#ffd93d', '#ff6b9d',
    '#06d6a0', '#c77dff', '#2d3436', '#fab1a0', '#74b9ff'
  ];

  const canvasPresets = [
    { label: 'Strip 2×6"', w: 580, h: 1740 },
    { label: '4R Portrait', w: 1200, h: 1800 },
    { label: '4R Landscape', w: 1800, h: 1200 },
    { label: 'Square', w: 1200, h: 1200 },
    { label: 'Instax Mini', w: 600, h: 760 },
  ];

  const handleDecoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) onAddDeco(file);
    e.target.value = '';
  };

  return (
    <div className="cms-panel-section">
      <div className="cms-panel-section__title">🛠️ Template Settings</div>

      <div className="cms-field">
        <label className="cms-field__label">Template Name</label>
        <input type="text" className="cms-field__input" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Classic Strip 3-Photo" />
      </div>

      <div className="cms-field">
        <label className="cms-field__label">Author</label>
        <input type="text" className="cms-field__input" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Admin" />
      </div>

      <div className="cms-field">
        <label className="cms-field__label">Canvas Preset</label>
        <div className="cms-preset-row">
          {canvasPresets.map(p => (
            <button
              key={p.label}
              className={`cms-btn cms-btn--xs ${canvasWidth === p.w && canvasHeight === p.h ? 'cms-btn--active' : ''}`}
              onClick={() => { setCanvasWidth(p.w); setCanvasHeight(p.h); setOrientation(p.h > p.w ? 'portrait' : 'landscape'); }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cms-field-row">
        <div className="cms-field">
          <label className="cms-field__label">Width (px)</label>
          <input type="number" className="cms-field__input" value={canvasWidth} min={200} max={3000} onChange={e => setCanvasWidth(parseInt(e.target.value) || 580)} />
        </div>
        <div className="cms-field">
          <label className="cms-field__label">Height (px)</label>
          <input type="number" className="cms-field__input" value={canvasHeight} min={200} max={5000} onChange={e => setCanvasHeight(parseInt(e.target.value) || 1740)} />
        </div>
      </div>

      <div className="cms-field">
        <label className="cms-field__label">Background Color</label>
        <div className="cms-color-row">
          {bgColors.map(c => (
            <button key={c} className={`cms-color-swatch ${backgroundColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setBackgroundColor(c)} />
          ))}
          <input type="color" className="cms-color-picker" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
        </div>
      </div>

      <div className="cms-field">
        <label className="cms-field__label">Overlay Frame (PNG)</label>
        {overlayPreview ? (
          <div className="cms-overlay-preview">
            <img src={overlayPreview} alt="overlay" />
            <button className="cms-btn cms-btn--xs cms-btn--danger" onClick={onRemoveOverlay}>Remove</button>
          </div>
        ) : (
          <label className="cms-btn cms-btn--ghost cms-upload-btn">
            <input type="file" accept="image/png" onChange={onOverlayUpload} style={{ display: 'none' }} />
            📁 Upload Overlay PNG
          </label>
        )}
      </div>

      {/* ── Frame Mode ── */}
      <div className="cms-field">
        <label className="cms-field__label">Frame Mode</label>
        <div className="cms-slot-presets__btns">
          <button
            className={`cms-btn cms-btn--xs ${frameMode === 'solo' ? 'cms-btn--active' : ''}`}
            onClick={() => setFrameMode('solo')}
          >
            🧑 Solo (1 user)
          </button>
          <button
            className={`cms-btn cms-btn--xs ${frameMode === 'duo' ? 'cms-btn--user-duo' : ''}`}
            onClick={() => setFrameMode('duo')}
          >
            👫 Duo / LDR (2 users)
          </button>
        </div>
        {frameMode === 'duo' && (
          <p className="cms-field__hint">Setiap slot bisa di-assign ke User A atau User B. Foto dari masing-masing user akan masuk ke slot yang sesuai.</p>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="cms-action-group">
        <button
          className="cms-btn cms-btn--accent"
          onClick={onAddSlot}
          disabled={photoCount >= maxSlots}
          style={{ flex: 1 }}
        >
          📷 + Photo Slot ({photoCount}/{maxSlots})
        </button>
        <button className="cms-btn cms-btn--ghost" onClick={onAddText} style={{ flex: 1 }}>
          ✏️ + Text
        </button>
      </div>

      <div className="cms-action-group" style={{ marginTop: '6px' }}>
        <input ref={decoInputRef} type="file" accept="image/*" onChange={handleDecoUpload} style={{ display: 'none' }} />
        <button className="cms-btn cms-btn--ghost" onClick={() => decoInputRef.current?.click()} style={{ flex: 1 }}>
          🎨 + Sticker / Decoration
        </button>
      </div>

      <div className="cms-field" style={{ marginTop: '12px' }}>
        <label className="cms-toggle">
          <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
          <span className="cms-toggle__slider" />
          <span className="cms-toggle__label">Published (visible to users)</span>
        </label>
      </div>
    </div>
  );
}
