'use client';

import React, { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import LivePhotoViewer from '../../ui/LivePhotoViewer';
import { useWeather } from './hooks/useWeather';
import { LocationInput } from './LocationInput';
import { FramePresetsModal } from './FramePresetsModal';
import { 
  FRAME_LAYOUT_OPTIONS, 
  FRAME_FONTS, 
  FRAME_COLORS, 
  TEXT_COLORS, 
  PHOTO_FILTERS, 
  FRAME_GLARES,
  STICKER_PACK 
} from '../../../configs/frameAssets';

interface FramePreset {
  id: string;
  label: string;
  src?: string;
  template?: {
    background_color?: string;
    canvas_width: number;
    canvas_height: number;
    slots?: Array<{
      id: string | number;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
}

interface FrameSelectScreenProps {
  mergedImage: string | null;
  isMerging: boolean;
  onContinue: () => void;
  onReapply: () => void;
  localLiveFrames?: any[];
  remoteLiveFrames?: any[];
  localBlobs?: Blob[];
  remoteBlobsByPeer?: any;
  locationsById?: any;
  mergePhotos: () => void;
  framePresets?: FramePreset[];
  framePresetId?: string | null;
  selectFramePreset: (preset: FramePreset) => void;
  frameSrc: string | null;
  setFrameSrc: (src: string | null) => void;
  setFrameName: (name: string) => void;
  setFrameMode: (mode: string) => void;
  setFramePresetId: (id: string | null) => void;
  handleFrameUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  frameName: string;
  frameError: string;
  frameMode: string;
  frameColor: string;
  setFrameColor: (color: string) => void;
  frameTextColor: string;
  setFrameTextColor: (color: string) => void;
  showFrameText: boolean;
  setShowFrameText: (show: boolean) => void;
  getDefaultFrameNames?: () => string;
  locTextLeft: string;
  setLocTextLeft: React.Dispatch<React.SetStateAction<string>>;
  locTextRight: string;
  setLocTextRight: React.Dispatch<React.SetStateAction<string>>;
  setLocTextEdited: (edited: boolean) => void;
  photoFilter: string;
  setPhotoFilter: (filter: string) => void;
  userData?: any;
  stickers: any[];
  addSticker: (sticker: string) => void;
  addRandomSticker: () => void;
  clearStickers: () => void;
  sessionMode: string;
  orientation: 'portrait' | 'landscape';
  setOrientation: (orientation: 'portrait' | 'landscape') => void;
  participants?: any[];
  frameFont: string;
  setFrameFont: (font: string) => void;
  frameLayout: string;
  setFrameLayout: (layout: string) => void;
  frameDate: string;
  setFrameDate: React.Dispatch<React.SetStateAction<string>> | ((date: string | ((prev: string) => string)) => void);
  frameNoise: number;
  setFrameNoise: (noise: number) => void;
  frameGlare: string;
  setFrameGlare: (glare: string) => void;
  showWeather: boolean;
  setShowWeather: (show: boolean) => void;
  weatherText: string;
  setWeatherText: (text: string) => void;
}

export default function FrameSelectScreen({
  mergedImage,
  isMerging,
  onContinue,
  onReapply,
  localLiveFrames,
  remoteLiveFrames,
  localBlobs,
  remoteBlobsByPeer,
  locationsById,
  mergePhotos,
  framePresets = [],
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
  setFrameGlare,
  showWeather,
  setShowWeather,
  setWeatherText
}: FrameSelectScreenProps) {
  const { t } = useLanguage();
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [livePhotoPlayback, setLivePhotoPlayback] = useState(true);

  // Decoupled Weather Custom Hook Presenter
  const { weather, loading: weatherLoading, error: weatherError, fetchWeather } = useWeather(
    participants,
    locationsById,
    setWeatherText
  );

  return (
    <section className="page active" id="page-frame">
      <div className="frame-editor">
        <div className="preview-container" style={styles.previewContainer}>
          <LivePhotoViewer
            mergedImage={mergedImage}
            isMerging={isMerging}
            count={localBlobs?.length || 1}
            participants={participants}
            localBlobs={localBlobs}
            remoteBlobsByPeer={remoteBlobsByPeer}
            locationsById={locationsById}
            localLiveFrames={localLiveFrames}
            remoteLiveFrames={remoteLiveFrames}
            mergePhotos={mergePhotos}
            livePhotoPlayback={livePhotoPlayback}
            sessionMode={sessionMode}
          />
        </div>
      </div>

      <div className="frame-controls">
        <div className="ctrl-title">{t('frame.editFrame')}</div>

        {/* ── PRESETS ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.presets')}</div>
          <button 
            type="button"
            className="btn-secondary" 
            style={styles.presetsBtn} 
            onClick={() => setShowPresetsModal(true)}
          >
            {t('frame.browsePresets')} ({framePresets.length})
          </button>
        </div>

        {/* ── PRINT LAYOUT (SOLO / DUO) ── */}
        {(sessionMode === 'solo' || sessionMode === 'duo' || sessionMode === 'live') && (
          <div className="ctrl-section">
            <div className="ctrl-label">{t('frame.printStyle')}</div>
            <div style={styles.flexGap10}>
              {FRAME_LAYOUT_OPTIONS.map(l => (
                <button 
                  key={l.id}
                  type="button"
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

        {/* ── LIVE PHOTO TOGGLE ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">LIVE PHOTO PREVIEW</div>
          <button 
            type="button"
            className={`btn-secondary ${livePhotoPlayback ? 'active' : ''}`}
            style={{ 
              ...styles.liveToggleBtn,
              background: livePhotoPlayback ? 'var(--yellow)' : 'white', 
            }}
            onClick={() => setLivePhotoPlayback(!livePhotoPlayback)}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: livePhotoPlayback ? '#ff6b9d' : '#888',
                boxShadow: livePhotoPlayback ? '0 0 8px #ff6b9d' : 'none'
              }}
            />
            {livePhotoPlayback ? 'LIVE ANIMATION: PLAY ON' : 'LIVE ANIMATION: PLAY OFF'}
          </button>
        </div>

        {/* ── ORIENTATION ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.orientations')}</div>
          <div style={styles.flexGap10}>
            <button 
              type="button"
              className={`btn-secondary ${orientation === 'portrait' ? 'active' : ''}`}
              style={{ flex: 1, background: orientation === 'portrait' ? 'var(--yellow)' : 'white' }}
              onClick={() => { setOrientation('portrait'); onReapply(); }}
            >
              Portrait
            </button>
            <button 
              type="button"
              className={`btn-secondary ${orientation === 'landscape' ? 'active' : ''}`}
              style={{ flex: 1, background: orientation === 'landscape' ? 'var(--yellow)' : 'white' }}
              onClick={() => { setOrientation('landscape'); onReapply(); }}
            >
              Landscape
            </button>
          </div>
        </div>

        {/* ── TYPOGRAPHY ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.typography')}</div>
          <div className="scroll-row" style={styles.scrollRow}>
            {FRAME_FONTS.map(f => (
              <button 
                key={f.id}
                type="button"
                className={`btn-secondary ${frameFont === f.id ? 'active' : ''}`}
                style={{ 
                  ...styles.fontBtn, 
                  fontFamily: f.id,
                  background: frameFont === f.id ? 'var(--yellow)' : 'white',
                }}
                onClick={() => { setFrameFont(f.id); onReapply(); }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.photoFilter')}</div>
          <div className="scroll-row" style={styles.scrollRowWithPadding}>
            {PHOTO_FILTERS.map(f => (
              <button 
                key={f.id}
                type="button"
                className={`btn-secondary ${photoFilter === f.id ? 'active' : ''}`}
                style={{ 
                  ...styles.filterBtn,
                  background: photoFilter === f.id ? 'var(--yellow)' : 'white',
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

        {/* ── NOISE / GRAIN slider ── */}
        <div className="ctrl-section">
          <div style={styles.flexJustifyBetween}>
            <span className="ctrl-label" style={styles.m0}>{t('frame.grain')}</span>
            <span style={styles.grainPctBadge}>{frameNoise}%</span>
          </div>
          <div style={styles.paddingVertical4}>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={frameNoise} 
              onChange={e => { setFrameNoise(parseInt(e.target.value)); onReapply(); }} 
              style={styles.grainSlider}
            />
          </div>
        </div>

        {/* ── GLARE ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.glare')}</div>
          <div className="scroll-row" style={styles.scrollRow}>
            {FRAME_GLARES.map(g => (
              <button
                key={g.id}
                type="button"
                className={`btn-secondary ${frameGlare === g.id ? 'active' : ''}`}
                style={{
                  ...styles.glareBtn,
                  background: frameGlare === g.id ? 'var(--yellow)' : 'white',
                }}
                onClick={() => { setFrameGlare(g.id); onReapply(); }}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── FRAME COLOR ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.color')}</div>
          <div className="swatch-row">
            {FRAME_COLORS.map((c, i) => (
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

        {/* ── TEXT COLOR ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">{t('frame.fontColor')}</div>
          <div className="swatch-row">
            {TEXT_COLORS.map((colorHex) => (
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

        {/* ── LOCATIONS / CUSTOM NAME INPUTS ── */}
        {participants.length <= 2 && (
          <div className="ctrl-section">
            <div className="ctrl-label">
              {sessionMode === 'solo' ? t('frame.customName') : t('frame.locations')}
            </div>
            {sessionMode === 'solo' && !locTextLeft.trim() && (
              <div style={styles.soloTextAlert}>
                ⓘ Silakan isi nama Anda agar ditampilkan di frame
              </div>
            )}
            <div style={styles.flexDirectionColumnGap8}>
              <div style={styles.flexGap8}>
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
              <label style={styles.checkboxLabel}>
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
            <p className="form-hint" style={styles.hintText}>
              Auto-displayed for all {participants.length} members ✨
            </p>
            <label style={styles.checkboxLabelWithMargin}>
              <input 
                type="checkbox" 
                checked={showFrameText} 
                onChange={e => { setShowFrameText(e.target.checked); onReapply(); }} 
              />
              Show details on strip
            </label>
          </div>
        )}

        {/* ── DATE ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">DATE</div>
          <input 
            className="form-input" 
            style={styles.dateInputField} 
            value={frameDate}
            onChange={e => { setFrameDate(e.target.value); onReapply(); }}
          />
        </div>

        {/* ── WEATHER GEOLOCATION PANEL ── */}
        <div className="ctrl-section" style={styles.weatherPanel}>
          <div className="ctrl-label" style={styles.weatherHeader}>
            <span>🌤️</span>
            <span>Cuaca Hari Ini</span>
          </div>

          {weatherLoading && (
            <div style={styles.weatherLoadingWrapper}>
              <div style={styles.spinner} />
              <span>Memuat cuaca...</span>
            </div>
          )}

          {weatherError && (
            <div style={styles.weatherErrorText}>
              ⚠️ {weatherError}
            </div>
          )}

          {weather && (
            <div style={styles.flexDirectionColumnGap8}>
              <div style={styles.flexJustifyBetweenAlignCent}>
                <div style={styles.flexAlignCenterGap8}>
                  <span style={styles.weatherEmoji}>{weather.emoji}</span>
                  <div>
                    <div style={styles.weatherCityText}>
                      {weather.city}
                    </div>
                    <div style={styles.weatherConditionText}>
                      {weather.label}
                    </div>
                  </div>
                </div>
                <div style={styles.weatherTempText}>
                  {weather.temp}°C
                </div>
              </div>

              {/* Attach/Detach weather Toggle */}
              <label style={styles.weatherToggleSwitch}>
                <input 
                  type="checkbox" 
                  checked={showWeather} 
                  onChange={e => { setShowWeather(e.target.checked); onReapply(); }} 
                  style={styles.weatherCheckbox}
                />
                Pasang cuaca di cetakan (kecil)
              </label>

              {/* Salin Ke Text/Date */}
              <div style={styles.flexGap8}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={styles.weatherCopyBtn}
                  onClick={() => {
                    const text = `${weather.emoji} ${weather.temp}°C`;
                    if (sessionMode === 'solo') {
                      if (!locTextLeft.includes(text)) {
                        setLocTextLeft(prev => prev ? `${prev} • ${text}` : `${weather.city} • ${text}`);
                        setLocTextEdited(true);
                      }
                    } else {
                      if (!frameDate.includes(text)) {
                        setFrameDate(prev => prev ? `${prev} (${text})` : text);
                        onReapply();
                      }
                    }
                  }}
                >
                  ➕ Salin ke Text/Date
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={styles.weatherRefreshBtn}
                  onClick={fetchWeather}
                >
                  🔄
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── STICKERS ── */}
        <div className="ctrl-section">
          <div style={styles.flexJustifyBetweenAlignCentMargin}>
            <div className="ctrl-label" style={styles.m0}>{t('frame.stickers')}</div>
            {stickers.length > 0 && (
              <button 
                type="button"
                onClick={() => { clearStickers(); onReapply(); }} 
                style={styles.clearStickersBtn}
              >
                {t('frame.clearAll')}
              </button>
            )}
          </div>
          <div className="swatch-row" style={styles.stickersRow}>
            <button 
              type="button"
              className="btn-secondary" 
              style={styles.randomStickerBtn}
              onClick={() => { addRandomSticker(); onReapply(); }}
            >
              🎲 Random
            </button>
            <div style={styles.stickerDivider} />
            {STICKER_PACK.map(s => (
              <button 
                key={s} 
                type="button"
                className="sticker" 
                onClick={() => { addSticker(s); onReapply(); }}
                style={styles.stickerItemBtn}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── CUSTOM PNG UPLOAD ── */}
        <div className="ctrl-section">
          <div className="ctrl-label">CUSTOM UPLOAD</div>
          <input 
            type="file" 
            id="frame-upload" 
            style={styles.displayNone} 
            accept="image/*"
            onChange={handleFrameUpload}
          />
          <label 
            htmlFor="frame-upload" 
            className="btn-secondary" 
            style={styles.customUploadLabel}
          >
            Upload PNG Frame
          </label>
          {frameName && <p className="form-hint" style={styles.textCenter}>{frameName}</p>}
          {frameError && <p className="error-msg show">{frameError}</p>}
        </div>

        {/* ── NEXT SUBMIT BUTTON ── */}
        <div style={styles.submitRow}>
          <button 
            type="button"
            className="btn-primary" 
            onClick={onContinue} 
            style={styles.submitBtn}
          >
            {t('common.next')}
          </button>
        </div>
      </div>

      {/* ── PRESETS browse MODAL ── */}
      {showPresetsModal && (
        <FramePresetsModal
          framePresets={framePresets}
          framePresetId={framePresetId}
          frameMode={frameMode}
          setFrameMode={setFrameMode}
          setFrameSrc={setFrameSrc}
          setFrameName={setFrameName}
          setFramePresetId={setFramePresetId}
          selectFramePreset={selectFramePreset}
          onReapply={onReapply}
          onClose={() => setShowPresetsModal(false)}
        />
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────
   CENTRALIZED STYLING OBJECT (KISS & DRY)
   ────────────────────────────────────────────────────────── */
const styles = {
  previewContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetsBtn: {
    width: '100%',
    background: 'var(--yellow)',
    fontWeight: 'bold' as const,
  },
  flexGap10: {
    display: 'flex',
    gap: '10px',
  },
  liveToggleBtn: {
    width: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '8px',
    fontFamily: "'Gaegu', cursive",
    fontSize: '16px',
    fontWeight: 'bold' as const,
    minHeight: '40px',
    borderRadius: '12px',
    border: '2px solid var(--ink)',
    cursor: 'pointer',
  },
  scrollRow: {
    display: 'flex',
    gap: '6px',
    overflowX: 'auto' as const,
    paddingBottom: '8px',
    flexWrap: 'nowrap' as const,
  },
  scrollRowWithPadding: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto' as const,
    paddingBottom: '12px',
    flexWrap: 'nowrap' as const,
  },
  fontBtn: {
    flexShrink: 0, 
    padding: '6px 10px', 
    fontSize: '12px', 
    borderRadius: '8px',
    border: '1.5px solid var(--ink)',
    minHeight: '28px',
  },
  filterBtn: {
    flexShrink: 0, 
    padding: '8px 12px', 
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontFamily: "'Gaegu', cursive",
    border: '2px solid var(--ink)',
    borderRadius: '12px',
  },
  flexJustifyBetween: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  flexJustifyBetweenAlignCent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexJustifyBetweenAlignCentMargin: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  m0: {
    marginBottom: 0,
  },
  grainPctBadge: {
    fontSize: '14px',
    fontFamily: "'Gaegu', cursive",
    background: 'var(--ink)',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '8px',
  },
  paddingVertical4: {
    padding: '4px 0',
  },
  grainSlider: {
    width: '100%', 
    accentColor: 'var(--yellow)', 
    cursor: 'pointer',
    height: '8px',
    borderRadius: '4px',
    background: '#ddd',
  },
  glareBtn: {
    flexShrink: 0,
    padding: '6px 10px',
    fontSize: '12px',
    fontFamily: "'Gaegu', cursive",
    borderRadius: '8px',
    border: '1.5px solid var(--ink)',
    minHeight: '28px',
  },
  soloTextAlert: {
    background: 'rgba(255, 107, 157, 0.1)',
    border: '2px solid #ff6b9d',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '12px',
    fontFamily: "'Nunito', sans-serif",
    fontSize: '14px',
    color: '#1a1a2e',
    fontWeight: '600' as const,
  },
  flexDirectionColumnGap8: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  flexGap8: {
    display: 'flex',
    gap: '8px',
  },
  flexAlignCenterGap8: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'Pastel Crayon', cursive",
    fontSize: '16px',
    cursor: 'pointer',
    opacity: 0.8,
  },
  checkboxLabelWithMargin: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'Pastel Crayon', cursive",
    fontSize: '16px',
    cursor: 'pointer',
    opacity: 0.8,
    marginTop: '8px',
  },
  hintText: {
    fontSize: '14px',
    opacity: 0.8,
  },
  dateInputField: {
    fontSize: '14px',
    padding: '8px',
    width: '100%',
  },
  weatherPanel: {
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '2px solid var(--ink)',
    borderRadius: '16px',
    padding: '12px',
    boxShadow: 'none',
    marginTop: '8px',
  },
  weatherHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: 'var(--ink)',
    marginBottom: '8px',
  },
  weatherLoadingWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'Gaegu', cursive",
    fontSize: '15px',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid var(--ink)',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  weatherErrorText: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '15px',
    color: '#ff6b9d',
  },
  weatherEmoji: {
    fontSize: '32px',
  },
  weatherCityText: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '18px',
    fontWeight: 'bold' as const,
    color: 'var(--ink)',
  },
  weatherConditionText: {
    fontSize: '13px',
    opacity: 0.7,
    fontFamily: "'Nunito', sans-serif",
  },
  weatherTempText: {
    fontFamily: "'Gaegu', cursive",
    fontSize: '28px',
    fontWeight: '700' as const,
    color: 'var(--ink)',
  },
  weatherToggleSwitch: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'Gaegu', cursive",
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: 'var(--ink)',
    cursor: 'pointer',
    background: 'white',
    border: '1.5px solid var(--ink)',
    padding: '6px 12px',
    borderRadius: '10px',
    marginTop: '4px',
    boxShadow: '2px 2px 0 var(--ink)',
  },
  weatherCheckbox: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: 'var(--pink)',
  },
  weatherCopyBtn: {
    flex: 1,
    fontSize: '12px',
    padding: '4px 8px',
    minHeight: '26px',
    borderRadius: '8px',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    fontFamily: "'Gaegu', cursive",
    cursor: 'pointer',
  },
  weatherRefreshBtn: {
    fontSize: '12px',
    padding: '4px 8px',
    minHeight: '26px',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
  },
  clearStickersBtn: {
    background: 'none',
    border: 'none',
    color: '#ff6b9d',
    fontFamily: "'Pastel Crayon', cursive",
    fontSize: '16px',
    cursor: 'pointer',
  },
  stickersRow: {
    gap: '10px',
    marginBottom: '12px',
    flexWrap: 'nowrap' as const,
    overflowX: 'auto' as const,
    paddingBottom: '8px',
    alignItems: 'center',
  },
  randomStickerBtn: {
    flexShrink: 0,
    padding: '4px 12px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '32px',
    borderRadius: '10px',
  },
  stickerDivider: {
    width: '2px',
    height: '24px',
    background: '#eee',
    flexShrink: 0,
  },
  stickerItemBtn: {
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
    cursor: 'pointer',
  },
  displayNone: {
    display: 'none',
  },
  customUploadLabel: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  textCenter: {
    textAlign: 'center' as const,
  },
  submitRow: {
    marginTop: 'auto',
    paddingTop: '32px',
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    fontSize: '20px',
  },
};
