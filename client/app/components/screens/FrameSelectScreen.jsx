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
  userData
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
              style={{ width: '100%', borderRadius: '4px', border: '2px solid var(--ink)' }} 
            />
          )}
          <div className="strip-label" id="strip-name" style={{ color: frameTextColor }}>
            {userData?.displayName || 'your name'}
          </div>
          <div className="strip-date" id="strip-date" style={{ color: frameTextColor, opacity: 0.6 }}>
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="frame-controls">
        <div className="ctrl-title">Edit Frame ✦</div>

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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Caveat', fontSize: '18px', cursor: 'pointer' }}>
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
