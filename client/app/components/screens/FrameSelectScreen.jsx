import React from 'react';

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
  setLocTextEdited
}) {
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);

  React.useEffect(() => {
    if (!isEditorOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditorOpen]);

  const activePreset = React.useMemo(() => {
    if (!framePresets?.length) return null;
    return framePresets.find(preset => preset.id === framePresetId) || framePresets[0];
  }, [framePresets, framePresetId]);

  return (
    <div className="fs">
      <div className="fs__card glass-panel">
        {/* ── Header ── */}
        <div className="fs__header">
          <div className="fs__icon">🖼</div>
          <div>
            <h2 className="fs__title">Choose Your Frame</h2>
            <p className="fs__subtitle">Pilih frame terbaik sebelum download</p>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="fs__preview">
          {isMerging && (
            <div className="fs__preview-loading">
              <span className="fs__spinner" />
              Applying frame…
            </div>
          )}
          <img src={mergedImage} className="fs__preview-img" alt="Frame preview" />
        </div>

        {/* ── Active Frame Indicator + Edit ── */}
        <button
          type="button"
          className="fs__active-frame"
          onClick={() => setIsEditorOpen(true)}
        >
          <div
            className="fs__active-thumb"
            style={{
              backgroundImage: activePreset?.src
                ? `url(${activePreset.src})`
                : 'linear-gradient(135deg, rgba(155,135,245,0.3), rgba(255,183,178,0.4))'
            }}
          />
          <div className="fs__active-info">
            <span className="fs__active-label">Active Frame</span>
            <span className="fs__active-name">{activePreset?.label || 'Default'}</span>
            <span className="fs__active-desc">{activePreset?.description || 'Frame bawaan'}</span>
          </div>
          <div className="fs__edit-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Frame
          </div>
        </button>

        {/* ── Actions ── */}
        <div className="fs__actions">
          <button
            className={`btn-secondary fs__btn ${isMerging ? 'disabled' : ''}`}
            onClick={onReapply}
            disabled={isMerging}
          >
            ↻ Re-apply
          </button>
          <button
            className={`btn-primary fs__btn ${isMerging ? 'disabled' : ''}`}
            onClick={onContinue}
            disabled={isMerging}
          >
            Continue →
          </button>
        </div>
      </div>

      {/* ══════════ Editor Modal ══════════ */}
      {isEditorOpen && (
        <div className="frame-modal" role="dialog" aria-modal="true">
          <div
            className="frame-modal__backdrop"
            onClick={() => setIsEditorOpen(false)}
            aria-hidden="true"
          />
          <div className="frame-modal__content glass-panel">
            <div className="frame-modal__header">
              <div>
                <h3 className="frame-modal__title">Edit Frame</h3>
                <p className="frame-modal__subtitle">Pilih preset, upload frame, dan edit teks.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsEditorOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="frame-modal__body">
              <div className="frame-section">
                <h3>Presets</h3>
                <div className="frame-gallery">
                  {framePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`frame-card ${framePresetId === preset.id ? 'selected' : ''}`}
                      onClick={() => selectFramePreset(preset)}
                    >
                      <div
                        className="frame-card__thumb"
                        style={{
                          backgroundImage: preset.src
                            ? `linear-gradient(135deg, rgba(255,255,255,0.75), rgba(155,135,245,0.15)), url(${preset.src})`
                            : 'linear-gradient(135deg, rgba(155,135,245,0.25), rgba(255,183,178,0.35))'
                        }}
                      />
                      <div className="frame-card__title">{preset.label}</div>
                      {preset.description && <div className="frame-card__desc">{preset.description}</div>}
                    </button>
                  ))}
                </div>
                <div className="frame-note">
                  Taruh preset di <strong>client/public/frames</strong>. Kamu bisa ganti file SVG/PNG sesukamu.
                </div>
              </div>

              <div className="frame-section">
                <h3>Custom Frame</h3>
                <div className="frame-fields">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Frame Source</label>
                    <input
                      type="text"
                      value={frameSrc}
                      onChange={e => {
                        setFrameSrc(e.target.value);
                        setFrameName('');
                        setFrameMode('custom');
                        setFramePresetId('upload');
                      }}
                      placeholder="/frame.png"
                    />
                    <div className="frame-note">
                      Taruh file di <span style={{ fontWeight: 700 }}>client/public</span> lalu akses dengan <span style={{ fontWeight: 700 }}>/nama-file.png</span>
                    </div>
                  </div>

                  <div className="frame-upload">
                    <label className="frame-upload-label">Upload PNG</label>
                    <input type="file" accept="image/png" onChange={handleFrameUpload} />
                    {frameName && <div className="frame-file">{frameName}</div>}
                  </div>

                  {frameError && <div className="frame-error">{frameError}</div>}
                </div>
              </div>

              <div className="frame-section">
                <h3>Text & Colors</h3>
                <div className="color-grid">
                  {frameMode === 'default' && (
                    <div>
                      <label className="field-label">Frame Color</label>
                      <div className="color-row">
                        <input
                          className="color-input"
                          type="color"
                          value={frameColor}
                          onChange={e => setFrameColor(e.target.value)}
                          aria-label="Frame color"
                        />
                        <div className="color-hex">{frameColor?.toUpperCase?.() || frameColor}</div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="field-label">Text Color</label>
                    <div className="color-row">
                      <input
                        className="color-input"
                        type="color"
                        value={frameTextColor}
                        onChange={e => setFrameTextColor(e.target.value)}
                        aria-label="Frame text color"
                        disabled={!showFrameText}
                      />
                      <div className="color-hex">{frameTextColor?.toUpperCase?.() || frameTextColor}</div>
                    </div>
                  </div>
                </div>

                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={showFrameText}
                    onChange={e => setShowFrameText(e.target.checked)}
                  />
                  Tampilkan teks header/footer
                </label>

                <div className="locations-grid">
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>{getDefaultFrameNames().left || 'User B'} Location</label>
                    <input
                      type="text"
                      value={locTextLeft}
                      onChange={e => {
                        setLocTextLeft(e.target.value);
                        setLocTextEdited(true);
                      }}
                      placeholder="e.g. Jakarta, Indonesia"
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>{getDefaultFrameNames().right || 'User A'} Location</label>
                    <input
                      type="text"
                      value={locTextRight}
                      onChange={e => {
                        setLocTextRight(e.target.value);
                        setLocTextEdited(true);
                      }}
                      placeholder="e.g. Seoul, South Korea"
                    />
                  </div>
                </div>
                <div className="frame-note">Auto apply setelah edit teks. Jika belum berubah, klik Re-apply.</div>
              </div>
            </div>

            <div className="frame-modal__footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsEditorOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
