import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * LocationInput – smart text input with auto-detected location suggestions.
 * Shows chip buttons (city / country) derived from participant's geolocation.
 * Typing updates the value and the preview re-renders via debounce in page.jsx.
 */
function LocationInput({ label, placeholder, value, onChange, participant, userData }) {
  const [focused, setFocused] = useState(false);

  // Build suggestion chips from the location stored in userData (locationsById from room)
  const locationsById = userData?.locationsById || {};
  const locData = participant?.id ? locationsById[participant.id] : null;
  const chips = [];
  if (locData) {
    const city = (locData.city || '').trim();
    const country = (locData.country || '').trim();
    if (city && country && `${city}, ${country}` !== value) {
      chips.push({ label: `📍 ${city}, ${country}`, value: `${city}, ${country}` });
    }
    if (country && country !== value) {
      chips.push({ label: `🌏 ${country}`, value: country });
    }
    if (city && city !== value) {
      chips.push({ label: `🏙 ${city}`, value: city });
    }
  }

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <label className="field-label">{label}</label>
      <input
        className="form-input"
        style={{ fontSize: '14px', padding: '8px', width: '100%', boxSizing: 'border-box' }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
      />
      {focused && chips.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#fff',
          border: '2px solid var(--ink)',
          borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          marginTop: '2px'
        }}>
          {chips.map((chip, i) => (
            <button
              key={i}
              onMouseDown={e => { e.preventDefault(); onChange(chip.value); setFocused(false); }}
              style={{
                background: 'var(--yellow, #ffd93d)',
                border: '1.5px solid var(--ink)',
                borderRadius: '8px',
                padding: '5px 10px',
                fontFamily: "'Gaegu', cursive",
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s'
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  clearStickers,
  sessionMode,
  orientation,
  setOrientation,
  participants = [],
  frameFont,
  setFrameFont,
  frameLayout,
  setFrameLayout,
  frameDate,
  setFrameDate,
  frameNoise,
  setFrameNoise,
  frameGlare,
  setFrameGlare
}) {
  const { t } = useLanguage();
  const [showPresetsModal, setShowPresetsModal] = useState(false);

  const layoutOptions = [
    { id: 'strip', label: 'Strip' },
    { id: 'grid', label: 'Wide' }
  ];

  const fonts = [
    { id: "'Quicksand', sans-serif", label: 'Modern', preview: 'Aa' },
    { id: "'Gaegu', cursive", label: 'Doodle', preview: 'Aa' },
    { id: "'Pastel Crayon', cursive", label: 'Crayon', preview: 'Aa' },
    { id: "'Calculator', monospace", label: 'Calculator', preview: 'Aa' },
    { id: "'VT323', monospace", label: 'LCD Retro', preview: 'Aa' },
    { id: "'Silkscreen', monospace", label: 'Pixel', preview: 'Aa' },
    { id: "'Special Elite', cursive", label: 'Typewriter', preview: 'Aa' },
    { id: "'Pacifico', cursive", label: 'Retro Neon', preview: 'Aa' },
    { id: "'Caveat', cursive", label: 'Script', preview: 'Aa' },
    { id: "'Playfair Display', serif", label: 'Elegant', preview: 'Aa' }
  ];

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
        <div className="preview-container">
          {isMerging ? (
            <div className="rendering-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div className="room-dot" />
              <span style={{ fontFamily: 'Gaegu', fontSize: '20px' }}>Rendering...</span>
            </div>
          ) : (
            <img 
              src={mergedImage} 
              alt="Strip Preview" 
              className="preview-img"
            />
          )}
        </div>
      </div>

      <div className="frame-controls">
        <div className="ctrl-title">{t('frame.editFrame')}</div>

        {(sessionMode === 'solo' || sessionMode === 'duo') && (
          <div className="ctrl-section">
            <div className="ctrl-label">{t('frame.printStyle')}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {layoutOptions.map(l => (
                <button 
                  key={l.id}
                  className={`btn-secondary ${frameLayout === l.id ? 'active' : ''}`}
                  style={{ flex: 1, background: frameLayout === l.id ? 'var(--yellow)' : 'white' }}
                  onClick={() => { setFrameLayout(l.id); onReapply(); }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.orientations')}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className={`btn-secondary ${orientation === 'portrait' ? 'active' : ''}`}
              style={{ flex: 1, background: orientation === 'portrait' ? 'var(--yellow)' : 'white' }}
              onClick={() => { setOrientation('portrait'); onReapply(); }}
            >
              Portrait
            </button>
            <button 
              className={`btn-secondary ${orientation === 'landscape' ? 'active' : ''}`}
              style={{ flex: 1, background: orientation === 'landscape' ? 'var(--yellow)' : 'white' }}
              onClick={() => { setOrientation('landscape'); onReapply(); }}
            >
              Landscape
            </button>
          </div>
        </div>

        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.typography')}</div>
          <div className="scroll-row" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', flexWrap: 'nowrap' }}>
            {fonts.map(f => (
              <button 
                key={f.id}
                className={`btn-secondary ${frameFont === f.id ? 'active' : ''}`}
                style={{ 
                  flexShrink: 0, 
                  padding: '6px 10px', 
                  fontSize: '12px', 
                  fontFamily: f.id,
                  background: frameFont === f.id ? 'var(--yellow)' : 'white',
                  borderRadius: '8px',
                  border: '1.5px solid var(--ink)',
                  minHeight: '28px'
                }}
                onClick={() => { setFrameFont(f.id); onReapply(); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.photoFilter')}</div>
          <div className="scroll-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', flexWrap: 'nowrap' }}>
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
          <div className="ctrl-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{t('frame.grain')}</span>
            <span style={{ fontSize: '14px', fontFamily: "'Gaegu', cursive", background: 'var(--ink)', color: 'white', padding: '2px 8px', borderRadius: '8px' }}>{frameNoise}%</span>
          </div>
          <div style={{ padding: '4px 0' }}>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={frameNoise} 
              onChange={e => { setFrameNoise(parseInt(e.target.value)); onReapply(); }} 
              style={{ 
                width: '100%', 
                accentColor: 'var(--yellow)', 
                cursor: 'pointer',
                height: '8px',
                borderRadius: '4px',
                background: '#ddd'
              }}
            />
          </div>
        </div>

        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.glare')}</div>
          <div className="scroll-row" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', flexWrap: 'nowrap' }}>
            {[
              { id: 'none', label: 'None' },
              { id: 'warm', label: 'Warm' },
              { id: 'retro', label: 'Retro' },
              { id: 'aurora', label: 'Aurora' },
              { id: 'fire', label: 'Fire' },
              { id: 'nebula', label: 'Nebula' },
              { id: 'sunset', label: 'Sunset' },
              { id: 'vintage', label: 'Vintage Wash' },
              { id: 'rainbow', label: 'Rainbow' },
              { id: 'cyberpunk', label: 'Cyberpunk' }
            ].map(g => (
              <button
                key={g.id}
                className={`btn-secondary ${frameGlare === g.id ? 'active' : ''}`}
                style={{
                  flexShrink: 0,
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontFamily: "'Gaegu', cursive",
                  background: frameGlare === g.id ? 'var(--yellow)' : 'white',
                  borderRadius: '8px',
                  border: '1.5px solid var(--ink)',
                  minHeight: '28px'
                }}
                onClick={() => { setFrameGlare(g.id); onReapply(); }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.presets')}</div>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setShowPresetsModal(true)}>
            {t('frame.browsePresets')} ({framePresets?.length || 0})
          </button>
        </div>

        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.color')}</div>
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
          <div className="ctrl-label">{t('frame.fontColor')}</div>
          <div className="swatch-row">
            {[
              '#ffffff',
              '#1a1a2e',
              '#ffd93d',
              '#ff6b9d',
              '#06d6a0',
              '#c77dff'
            ].map((colorHex) => (
              <div 
                key={colorHex}
                className={`swatch ${frameTextColor === colorHex ? 'sel' : ''}`} 
                style={{ background: colorHex }} 
                onClick={() => {
                  setFrameTextColor(colorHex);
                  onReapply();
                }}
              />
            ))}
            <input 
              type="color" 
              className="color-input" 
              value={frameTextColor} 
              onChange={e => {
                setFrameTextColor(e.target.value);
                onReapply();
              }}
            />
          </div>
        </div>

        {participants.length <= 2 && (
          <div className="ctrl-section">
            <div className="ctrl-label">
              {sessionMode === 'solo' ? t('frame.customName') : t('frame.locations')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <LocationInput
                  label={sessionMode === 'solo' ? t('join.yourName') : 'Left'}
                  placeholder={sessionMode === 'solo' ? t('join.namePlaceholder') : 'City, Country'}
                  value={locTextLeft}
                  onChange={val => { setLocTextLeft(val); setLocTextEdited(true); }}
                  participant={participants[0]}
                  userData={userData}
                />
                {sessionMode !== 'solo' && (
                  <LocationInput
                    label="Right"
                    placeholder="City, Country"
                    value={locTextRight}
                    onChange={val => { setLocTextRight(val); setLocTextEdited(true); }}
                    participant={participants[1]}
                    userData={userData}
                  />
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Pastel Crayon', cursive", fontSize: '16px', cursor: 'pointer', opacity: 0.8 }}>
                <input 
                  type="checkbox" 
                  checked={showFrameText} 
                  onChange={e => { setShowFrameText(e.target.checked); onReapply(); }} 
                />
                {sessionMode === 'solo' ? 'Show name on strip' : 'Show details on strip'}
              </label>
            </div>
          </div>
        )}

        {participants.length > 2 && (
          <div className="ctrl-section">
            <div className="ctrl-label">{t('frame.locations')}</div>
            <p className="form-hint" style={{ fontSize: '14px', opacity: 0.8 }}>
              Auto-displayed for all {participants.length} members ✨
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Pastel Crayon', cursive", fontSize: '16px', cursor: 'pointer', opacity: 0.8, marginTop: '8px' }}>
              <input 
                type="checkbox" 
                checked={showFrameText} 
                onChange={e => { setShowFrameText(e.target.checked); onReapply(); }} 
                />
              Show details on strip
            </label>
          </div>
        )}

        <div className="ctrl-section">
          <div className="ctrl-label">DATE</div>
          <input 
            className="form-input" 
            style={{ fontSize: '14px', padding: '8px', width: '100%' }} 
            value={frameDate}
            onChange={e => { setFrameDate(e.target.value); onReapply(); }}
          />
        </div>

        <div className="ctrl-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div className="ctrl-label" style={{ marginBottom: 0 }}>{t('frame.stickers')}</div>
            {stickers.length > 0 && (
              <button 
                onClick={() => { clearStickers(); onReapply(); }} 
                style={{ background: 'none', border: 'none', color: '#ff6b9d', fontFamily: "'Pastel Crayon', cursive", fontSize: '16px', cursor: 'pointer' }}
              >
                {t('frame.clearAll')}
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
            {t('common.next')}
          </button>
        </div>
      </div>

      {showPresetsModal && (
        <div className="frame-modal">
          <div className="frame-modal__backdrop" onClick={() => setShowPresetsModal(false)} />
          <div className="frame-modal__content">
            <div className="frame-modal__header">
              <div>
                <h3 className="frame-modal__title">{t('frame.presets')}</h3>
                <p className="frame-modal__subtitle">{t('frame.browsePresets')}</p>
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
                  <div className="frame-card__thumb">
                    <img 
                      src={fp.src} 
                      alt={fp.label} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<span style="font-size:12px;opacity:0.5">Err</span>';
                      }}
                    />
                  </div>
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
