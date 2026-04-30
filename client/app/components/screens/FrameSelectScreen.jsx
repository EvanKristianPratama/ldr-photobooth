import React, { useState } from 'react';

export default function FrameSelectScreen({
  mergedImage,
  isMerging,
  onContinue,
  onReapply,
  framePresets,
  framePresetId,
  selectFramePreset,
  frameSrc,
  setFrameSrc,
  setFrameName,
  setFrameMode,
  setFramePresetId,
  handleFrameUpload,
  frameName,
  frameError,
  frameMode,
  frameColor,
  setFrameColor,
  frameTextColor,
  setFrameTextColor,
  showFrameText,
  setShowFrameText,
  getDefaultFrameNames,
  locTextLeft,
  setLocTextLeft,
  locTextRight,
  setLocTextRight,
  setLocTextEdited,
  photoFilter,
  setPhotoFilter,
  userData,
  stickers,
  addSticker,
  addRandomSticker,
  clearStickers
}) {
  const [showPresetsModal, setShowPresetsModal] = useState(false);

  const colors = [
    { bg: '#ffffff', text: '#1a1a2e', date: '#aaa' },
    { bg: '#1a1a2e', text: '#fffdf5', date: 'rgba(255,255,255,0.3)' },
    { bg: '#ffd93d', text: '#1a1a2e', date: '#666' },
    { bg: '#ff6b9d', text: '#1a1a2e', date: 'rgba(0,0,0,0.4)' },
    { bg: '#06d6a0', text: '#1a1a2e', date: 'rgba(0,0,0,0.4)' },
    { bg: '#c77dff', text: '#1a1a2e', date: 'rgba(0,0,0,0.4)' },
  ];

  return (
    <section className="page active" id="page-frame">
      <div className="frame-editor">
        <div className="photo-strip" id="preview-strip" style={{ background: frameColor }}>
          {isMerging ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '10px' }}>
              <div className="room-dot" style={{ width: '20px', height: '20px' }}></div>
              <span style={{ fontFamily: 'Caveat', fontSize: '20px' }}>Rendering...</span>
            </div>
          ) : (
            <img 
              src={mergedImage} 
              alt="Strip Preview" 
              style={{ 
                width: '100%', 
                borderRadius: '4px', 
                border: '2px solid var(--ink)',
                filter: photoFilter === 'bw' ? 'grayscale(100%)' :
                        photoFilter === 'sepia' ? 'sepia(100%)' :
                        photoFilter === 'vintage' ? 'sepia(50%) contrast(120%) brightness(90%)' :
                        photoFilter === 'warm' ? 'sepia(30%) saturate(140%)' :
                        photoFilter === 'cold' ? 'saturate(80%) hue-rotate(180deg) brightness(110%)' : 'none',
                transition: 'filter 0.2s ease'
              }} 
            />
          )}
          <div className="strip-label" id="strip-name" style={{ color: frameTextColor }}>
            {userData?.displayName || 'Evan'}
          </div>
          <div className="strip-date" id="strip-date" style={{ color: frameTextColor, opacity: 0.6 }}>
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="frame-controls">
        <div className="ctrl-title">Edit Frame ✦</div>

        <div className="ctrl-section">
          <div className="ctrl-label">PHOTO FILTER</div>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px' }}>
            {[
              { id: 'none', label: 'Normal', color: '#eee' },
              { id: 'bw', label: 'B&W', color: '#666' },
              { id: 'sepia', label: 'Sepia', color: '#a68069' },
              { id: 'vintage', label: 'Retro', color: '#8e735b' },
              { id: 'warm', label: 'Warm', color: '#ffb38a' },
              { id: 'cold', label: 'Cold', color: '#8ac6ff' },
            ].map(f => (
              <button 
                key={f.id}
                className={`btn-secondary ${photoFilter === f.id ? 'active' : ''}`}
                style={{ 
                  flexShrink: 0, 
                  padding: '8px 12px', 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontFamily: "'Gaegu', cursive",
                  background: photoFilter === f.id ? 'var(--yellow)' : 'white',
                  border: '2px solid var(--ink)',
                  borderRadius: '12px'
                }}
                onClick={() => {
                  setPhotoFilter(f.id);
                  onReapply();
                }}
              >
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  background: f.color,
                  border: '1px solid var(--ink)'
                }} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ctrl-section">
          <div className="ctrl-label">FRAME PRESETS</div>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setShowPresetsModal(true)}>
            Browse Presets ({framePresets?.length || 0})
          </button>
        </div>

        <div className="ctrl-section">
          <div className="ctrl-label">FRAME COLOR</div>
          <div className="swatch-row">
            {colors.map((c, i) => (
              <div 
                key={i}
                className={`swatch ${frameColor === c.bg ? 'sel' : ''}`} 
                style={{ background: c.bg }} 
                onClick={() => {
                  setFrameColor(c.bg);
                  setFrameTextColor(c.text);
                  onReapply();
                }}
              />
            ))}
            <input 
              type="color" 
              className="color-input" 
              value={frameColor} 
              onChange={e => {
                setFrameColor(e.target.value);
                onReapply();
              }}
            />
          </div>
        </div>

        <div className="ctrl-section">
          <div className="ctrl-label">LOCATION TEXT</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label className="field-label">Left</label>
                <input 
                  className="form-input" 
                  style={{ fontSize: '14px', padding: '8px' }} 
                  value={locTextLeft}
                  onChange={e => { setLocTextLeft(e.target.value); setLocTextEdited(true); onReapply(); }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label">Right</label>
                <input 
                  className="form-input" 
                  style={{ fontSize: '14px', padding: '8px' }} 
                  value={locTextRight}
                  onChange={e => { setLocTextRight(e.target.value); setLocTextEdited(true); onReapply(); }}
                />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Pastel Crayon', cursive", fontSize: '16px', cursor: 'pointer', opacity: 0.8 }}>
              <input 
                type="checkbox" 
                checked={showFrameText} 
                onChange={e => { setShowFrameText(e.target.checked); onReapply(); }} 
              />
              Show location on strip
            </label>
          </div>
        </div>

        <div className="ctrl-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div className="ctrl-label" style={{ marginBottom: 0 }}>STICKERS</div>
            {stickers.length > 0 && (
              <button 
                onClick={() => { clearStickers(); onReapply(); }} 
                style={{ background: 'none', border: 'none', color: '#ff6b9d', fontFamily: "'Pastel Crayon', cursive", fontSize: '16px', cursor: 'pointer' }}
              >
                Clear All
              </button>
            )}
          </div>
          <div className="swatch-row" style={{ gap: '10px', marginBottom: '12px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '8px', alignItems: 'center' }}>
            <button 
              className="btn-secondary" 
              style={{ flexShrink: 0, padding: '4px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', minHeight: '32px', borderRadius: '10px' }}
              onClick={() => { addRandomSticker(); onReapply(); }}
            >
              🎲 Random
            </button>
            <div style={{ width: '2px', height: '24px', background: '#eee', flexShrink: 0 }} />
            {['✨', '💖', '⭐', '🎈', '🍀', '🎀', '🍭', '🌸', '🌈', '🍦', '🍩', '🦋', '🐱', '🐶'].map(s => (
              <button 
                key={s} 
                className="sticker" 
                onClick={() => { addSticker(s); onReapply(); }}
                style={{ 
                  flexShrink: 0,
                  fontSize: '16px', 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'white',
                  border: '2px solid var(--ink)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="ctrl-section">
          <div className="ctrl-label">CUSTOM UPLOAD</div>
          <input 
            type="file" 
            id="frame-upload" 
            style={{ display: 'none' }} 
            accept="image/*"
            onChange={handleFrameUpload}
          />
          <label 
            htmlFor="frame-upload" 
            className="btn-secondary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}
          >
            Upload PNG Frame
          </label>
          {frameName && <p className="form-hint" style={{ textAlign: 'center' }}>{frameName}</p>}
          {frameError && <p className="error-msg show">{frameError}</p>}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
          <button 
            className="btn-primary" 
            onClick={onContinue} 
            style={{ width: '100%', padding: '16px', fontSize: '20px' }}
          >
            Finish & Download →
          </button>
        </div>
      </div>

      {showPresetsModal && (
        <div className="frame-modal">
          <div className="frame-modal__backdrop" onClick={() => setShowPresetsModal(false)} />
          <div className="frame-modal__content">
            <div className="frame-modal__header">
              <div>
                <h3 className="frame-modal__title">Frame Presets</h3>
                <p className="frame-modal__subtitle">Choose a designer frame</p>
              </div>
              <button className="btn-secondary" onClick={() => setShowPresetsModal(false)}>×</button>
            </div>

            <div className="frame-gallery">
              <div 
                className={`frame-card ${frameMode === 'none' ? 'selected' : ''}`}
                onClick={() => {
                  setFrameMode('none');
                  setFrameSrc(null);
                  setFrameName('');
                  setFramePresetId(null);
                  setShowPresetsModal(false);
                  onReapply();
                }}
              >
                <div className="frame-card__thumb" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Caveat', fontSize: '20px' }}>NONE</span>
                </div>
                <div className="frame-card__title">No Overlay</div>
              </div>

              {framePresets?.map((fp) => (
                <div 
                  key={fp.id}
                  className={`frame-card ${framePresetId === fp.id ? 'selected' : ''}`}
                  onClick={() => {
                    selectFramePreset(fp);
                    setShowPresetsModal(false);
                  }}
                >
                  <div 
                    className="frame-card__thumb" 
                    style={{ backgroundImage: `url(${fp.src})` }}
                  />
                  <div className="frame-card__title">{fp.label}</div>
                </div>
              ))}
            </div>

            <div className="frame-modal__footer">
              <button className="btn-secondary" onClick={() => setShowPresetsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
