import React, { useRef } from 'react';
import { CameraIcon, TextIcon, LayersIcon, CanvasIcon, FileIcon, GlobeIcon, SoloUserIcon, DuoUserIcon, SmileIcon, FolderIcon } from './icons';

/**
 * ToolBar — Template settings panel. Shows canvas design, details & publish settings.
 * Also includes quick-add buttons for elements (slots, text, stickers).
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
  showDummy, setShowDummy,
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
    <div className="cms-toolbar">
      {/* ── QUICK ADD BUTTONS ── */}
      <div className="cms-panel-section">
        <div className="cms-panel-section__title">
          <span className="cms-panel-section__title-inner">Tambah Elemen</span>
        </div>
        <div className="cms-add-buttons">
          <button
            className="cms-btn cms-btn--sm cms-add-btn"
            onClick={onAddSlot}
            disabled={photoCount >= maxSlots}
            title={photoCount >= maxSlots ? `Maks ${maxSlots} slot` : 'Tambah photo slot'}
          >
            <CameraIcon size={14} /> Slot
          </button>
          <button className="cms-btn cms-btn--sm cms-add-btn" onClick={onAddText} title="Tambah teks">
            <TextIcon size={14} /> Text
          </button>
          <label className="cms-btn cms-btn--sm cms-add-btn" title="Tambah stiker">
            <input type="file" accept="image/*" onChange={handleDecoUpload} ref={decoInputRef} style={{ display: 'none' }} />
            <LayersIcon size={14} /> Stiker
          </label>
        </div>
      </div>

      <div className="cms-panel-divider" />

      {/* ── DESAIN CANVAS & PREVIEW ── */}
      <div className="cms-panel-section">
        <div className="cms-panel-section__title">
          <span className="cms-panel-section__title-inner"><CanvasIcon /> Desain Canvas & Preview</span>
        </div>

        <div className="cms-field">
          <label className="cms-field__label">Preset Ukuran Canvas</label>
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
            <label className="cms-field__label">Lebar (px)</label>
            <input type="number" className="cms-field__input" value={canvasWidth} min={200} max={3000} onChange={e => setCanvasWidth(parseInt(e.target.value) || 580)} />
          </div>
          <div className="cms-field">
            <label className="cms-field__label">Tinggi (px)</label>
            <input type="number" className="cms-field__input" value={canvasHeight} min={200} max={5000} onChange={e => setCanvasHeight(parseInt(e.target.value) || 1740)} />
          </div>
        </div>

        <div className="cms-field">
          <label className="cms-field__label">Warna Background</label>
          <div className="cms-color-row">
            {bgColors.map(c => (
              <button key={c} className={`cms-color-swatch ${backgroundColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setBackgroundColor(c)} />
            ))}
            <input type="color" className="cms-color-picker" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
          </div>
        </div>

        <div className="cms-field">
          <label className="cms-field__label">Overlay Bingkai (PNG)</label>
          {overlayPreview ? (
            <div className="cms-overlay-preview">
              <img src={overlayPreview} alt="overlay" />
              <button className="cms-btn cms-btn--xs cms-btn--danger" onClick={onRemoveOverlay}>Hapus</button>
            </div>
          ) : (
            <label className="cms-btn cms-btn--ghost cms-upload-btn">
              <input type="file" accept="image/png" onChange={onOverlayUpload} style={{ display: 'none' }} />
              <FolderIcon size={14} /> Unggah Overlay PNG
            </label>
          )}
        </div>

        {/* Dummy Wajah Toggle */}
        <div className="cms-field cms-field--separator">
          <label className="cms-toggle cms-toggle--compact" title="Tampilkan dummy wajah di canvas">
            <input type="checkbox" checked={!!showDummy} onChange={e => setShowDummy(e.target.checked)} />
            <span className="cms-toggle__slider" />
            <span className="cms-toggle__label-inline cms-toggle__label-flex">
              <SmileIcon /> Dummy Ilustrasi Wajah
            </span>
          </label>
          <div className="cms-field__hint cms-field__hint--indented">
            Membantu kreator melihat peletakan wajah user di dalam frame.
          </div>
        </div>
      </div>

      <div className="cms-panel-divider" />

      {/* ── DETAIL & PUBLIKASI ── */}
      <div className="cms-panel-section">
        <div className="cms-panel-section__title">
          <span className="cms-panel-section__title-inner"><FileIcon /> Detail & Publikasi</span>
        </div>

        <div className="cms-field">
          <label className="cms-field__label">Nama Template</label>
          <input type="text" className="cms-field__input" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Contoh: Strip Klasik 3-Foto" />
        </div>

        <div className="cms-field">
          <label className="cms-field__label">Pembuat</label>
          <input type="text" className="cms-field__input" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Admin" />
        </div>

        <div className="cms-field">
          <label className="cms-field__label">Mode Frame</label>
          <div className="cms-slot-presets__btns">
            <button
              className={`cms-btn cms-btn--xs ${frameMode === 'solo' ? 'cms-btn--active' : ''}`}
              onClick={() => setFrameMode('solo')}
            >
              <SoloUserIcon size={14} /> Solo (1 user)
            </button>
            <button
              className={`cms-btn cms-btn--xs ${frameMode === 'duo' ? 'cms-btn--user-duo' : ''}`}
              onClick={() => setFrameMode('duo')}
            >
              <DuoUserIcon size={14} /> Duo / LDR (2 users)
            </button>
          </div>
          {frameMode === 'duo' && (
            <p className="cms-field__hint">Setiap slot bisa di-assign ke User A atau User B. Foto dari masing-masing user akan masuk ke slot yang sesuai.</p>
          )}
        </div>

        {/* Publish Toggle */}
        <div className="cms-field cms-field--separator">
          <label className="cms-toggle cms-toggle--compact" title="Aktifkan agar template dapat diakses publik">
            <input type="checkbox" checked={!!isPublished} onChange={e => setIsPublished(e.target.checked)} />
            <span className="cms-toggle__slider" />
            <span className="cms-toggle__label-inline cms-toggle__label-flex">
              <GlobeIcon /> Publikasikan Template
            </span>
          </label>
          <div className="cms-field__hint cms-field__hint--indented">
            Aktifkan agar template ini bisa digunakan oleh publik.
          </div>
        </div>
      </div>
    </div>
  );
}
