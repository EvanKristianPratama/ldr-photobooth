'use client';

import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';

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

interface FramePresetsModalProps {
  framePresets?: FramePreset[];
  framePresetId?: string | null;
  frameMode: string;
  setFrameMode: (mode: string) => void;
  setFrameSrc: (src: string | null) => void;
  setFrameName: (name: string) => void;
  setFramePresetId: (id: string | null) => void;
  selectFramePreset: (preset: FramePreset) => void;
  onReapply: () => void;
  onClose: () => void;
}

export const FramePresetsModal = React.memo(({
  framePresets = [],
  framePresetId,
  frameMode,
  setFrameMode,
  setFrameSrc,
  setFrameName,
  setFramePresetId,
  selectFramePreset,
  onReapply,
  onClose
}: FramePresetsModalProps) => {
  const { t } = useLanguage();

  return (
    <div className="frame-modal">
      <div className="frame-modal__backdrop" onClick={onClose} />
      <div className="frame-modal__content">
        <div className="frame-modal__header">
          <div>
            <h3 className="frame-modal__title">{t('frame.presets')}</h3>
            <p className="frame-modal__subtitle">{t('frame.browsePresets')}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>×</button>
        </div>

        <div className="frame-gallery">
          <div 
            className={`frame-card ${frameMode === 'none' ? 'selected' : ''}`}
            onClick={() => {
              setFrameMode('none');
              setFrameSrc(null);
              setFrameName('');
              setFramePresetId(null);
              onClose();
              onReapply();
            }}
          >
            <div className="frame-card__thumb" style={styles.cardThumbNone}>
              <span style={styles.noneText}>NONE</span>
            </div>
            <div className="frame-card__title">No Overlay</div>
          </div>

          {framePresets.map((fp) => (
            <div 
              key={fp.id}
              className={`frame-card ${framePresetId === fp.id ? 'selected' : ''}`}
              onClick={() => {
                selectFramePreset(fp);
                onClose();
              }}
            >
              <div 
                className="frame-card__thumb" 
                style={{ 
                  ...styles.cardThumbBase, 
                  background: fp.template?.background_color || '#eee' 
                }}
              >
                {fp.src ? (
                  <img 
                    src={fp.src} 
                    alt={fp.label} 
                    style={styles.presetImg}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : fp.template ? (
                  <div style={styles.w100h100Relative}>
                    {fp.template.slots?.map(s => (
                       <div key={s.id} style={{ 
                         ...styles.slotBase,
                         left: `${(s.x / fp.template!.canvas_width) * 100}%`,
                         top: `${(s.y / fp.template!.canvas_height) * 100}%`,
                         width: `${(s.width / fp.template!.canvas_width) * 100}%`,
                         height: `${(s.height / fp.template!.canvas_height) * 100}%`,
                       }} />
                    ))}
                  </div>
                ) : (
                  <div style={styles.noPreviewWrapper}>
                    <span style={styles.noPreviewText}>No Preview</span>
                  </div>
                )}
              </div>
              <div className="frame-card__title">{fp.label}</div>
            </div>
          ))}
        </div>

        <div className="frame-modal__footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
});
FramePresetsModal.displayName = 'FramePresetsModal';

const styles = {
  cardThumbNone: {
    background: '#eee',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noneText: {
    fontFamily: 'Caveat',
    fontSize: '20px',
  },
  cardThumbBase: {
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  presetImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    position: 'relative' as const,
    zIndex: 10,
  },
  w100h100Relative: {
    width: '100%',
    height: '100%',
    position: 'relative' as const,
  },
  slotBase: {
    position: 'absolute' as const,
    background: 'rgba(255,255,255,0.8)',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
  },
  noPreviewWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  noPreviewText: {
    fontSize: '12px',
    opacity: 0.5,
  },
};
