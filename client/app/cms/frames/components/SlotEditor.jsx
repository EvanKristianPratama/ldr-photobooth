import React from 'react';
import NumField from './NumField';
import { LockIcon, CopyIcon, SettingsIcon } from './icons';
import {
  AlignCenterHIcon, AlignCenterVIcon, AlignLeftIcon, AlignRightIcon
} from './icons';

/**
 * SlotEditor — Property editor panel for a selected photo slot.
 * Includes aspect ratio lock toggle and all position/size/rotation controls.
 */
export default function SlotEditor({ slot, onUpdate, onDragEnd, canvasWidth, canvasHeight, frameMode, onDuplicate }) {
  const handleChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  const handleChangeCommit = (field, value) => {
    onUpdate({ [field]: value });
    onDragEnd?.();
  };

  const currentRatio = slot.width / slot.height;

  const shapes = [
    { id: 'rect', label: 'Persegi', icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="0" ry="0"/></svg> },
    { id: 'rounded', label: 'Tumpul', icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="4" ry="4"/></svg> },
    { id: 'oval', label: 'Oval', icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg> },
    { id: 'heart', label: 'Hati', icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { id: 'star', label: 'Bintang', icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
    { id: 'cloud', label: 'Awan', icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58c.22.11.43.23.64.32A5 5 0 0 0 19 16.9z"/></svg> }
  ];

  return (
    <div className="cms-panel-section">
      <div className="cms-panel-section__title">
        <span className="cms-panel-section__title-inner">
          <SettingsIcon /> Properti Slot
        </span>
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

      {/* Aspect Ratio Lock */}
      <div className="cms-field">
        <label className="cms-toggle">
          <input
            type="checkbox"
            checked={slot.aspectRatioLocked || false}
            onChange={e => handleChangeCommit('aspectRatioLocked', e.target.checked)}
          />
          <span className="cms-toggle__slider" />
          <span className="cms-toggle__label cms-toggle__label-flex">
            <LockIcon size={14} />
            Kunci Rasio Aspek {slot.aspectRatioLocked ? `(${currentRatio.toFixed(2)})` : ''}
          </span>
        </label>
      </div>

      {/* Owner Assignment (Duo mode) */}
      {frameMode === 'duo' && (
        <div className="cms-field">
          <label className="cms-field__label">Pemilik Foto</label>
          <div className="cms-slot-presets__btns">
            <button
              className={`cms-btn cms-btn--xs ${slot.owner === 'userA' ? 'cms-btn--user-a' : ''}`}
              onClick={() => handleChangeCommit('owner', 'userA')}
            >
              <span className="cms-slot-chip__owner cms-slot-chip__owner--a">A</span> User A
            </button>
            <button
              className={`cms-btn cms-btn--xs ${slot.owner === 'userB' ? 'cms-btn--user-b' : ''}`}
              onClick={() => handleChangeCommit('owner', 'userB')}
            >
              <span className="cms-slot-chip__owner cms-slot-chip__owner--b">B</span> User B
            </button>
            <button
              className={`cms-btn cms-btn--xs ${slot.owner === 'any' ? 'cms-btn--active' : ''}`}
              onClick={() => handleChangeCommit('owner', 'any')}
            >
              <span className="cms-slot-chip__owner cms-slot-chip__owner--any">—</span> Semua
            </button>
          </div>
        </div>
      )}

      {/* Photo Shape */}
      <div className="cms-field">
        <label className="cms-field__label">Bentuk Foto</label>
        <div className="cms-slot-presets__btns">
          {shapes.map(sh => (
            <button
              key={sh.id}
              title={sh.label}
              className={`cms-btn cms-btn--xs ${(slot.shape || 'rect') === sh.id ? 'cms-btn--active' : ''}`}
              onClick={() => { 
                handleChangeCommit('shape', sh.id); 
                if (sh.id === 'rounded' && (!slot.borderRadius || slot.borderRadius === 0)) {
                  handleChangeCommit('borderRadius', 24);
                } else if (sh.id !== 'rounded' && sh.id !== 'rect') {
                  handleChangeCommit('borderRadius', 0);
                }
              }}
              style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {sh.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="cms-field-row">
        <NumField label="X" value={slot.x} min={0} max={canvasWidth} onChange={v => handleChange('x', v)} onBlur={() => onDragEnd?.()} />
        <NumField label="Y" value={slot.y} min={0} max={canvasHeight} onChange={v => handleChange('y', v)} onBlur={() => onDragEnd?.()} />
      </div>

      <div className="cms-field-row">
        <div className="cms-field">
          <label className="cms-field__label">Lebar</label>
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
          <label className="cms-field__label">Tinggi</label>
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
        <NumField label="Rotasi (°)" value={slot.rotation} min={-180} max={180} onChange={v => handleChange('rotation', v)} onBlur={() => onDragEnd?.()} />
        <NumField label="Radius (px)" value={slot.borderRadius} min={0} max={200} onChange={v => handleChange('borderRadius', v)} onBlur={() => onDragEnd?.()} />
      </div>

      <div className="cms-field-row">
        <NumField label="Z-Index" value={slot.zIndex} min={0} max={100} onChange={v => handleChange('zIndex', v)} onBlur={() => onDragEnd?.()} />
      </div>

      <div className="cms-slot-presets">
        <span className="cms-field__label">Ukuran Cepat</span>
        <div className="cms-slot-presets__btns">
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ width: 500, height: 750 }); onDragEnd?.(); }}>3:2 Portrait</button>
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ width: 500, height: 500 }); onDragEnd?.(); }}>1:1 Square</button>
          <button className="cms-btn cms-btn--xs" onClick={() => { onUpdate({ width: 500, height: 375 }); onDragEnd?.(); }}>4:3 Landscape</button>
          <button className="cms-btn cms-btn--xs" onClick={() => {
            const w = Math.round(canvasWidth * 0.86);
            onUpdate({ width: w, height: Math.round(w * 1.5), x: Math.round((canvasWidth - w) / 2) });
            onDragEnd?.();
          }}>Full Lebar</button>
        </div>
      </div>

      <div className="cms-slot-presets">
        <span className="cms-field__label">Penyelarasan</span>
        <div className="cms-slot-presets__btns">
          <button className="cms-btn cms-btn--xs cms-btn--icon-text" onClick={() => { onUpdate({ x: Math.round((canvasWidth - slot.width) / 2) }); onDragEnd?.(); }}>
            <AlignCenterHIcon /> Tengah H
          </button>
          <button className="cms-btn cms-btn--xs cms-btn--icon-text" onClick={() => { onUpdate({ y: Math.round((canvasHeight - slot.height) / 2) }); onDragEnd?.(); }}>
            <AlignCenterVIcon /> Tengah V
          </button>
          <button className="cms-btn cms-btn--xs cms-btn--icon-text" onClick={() => { onUpdate({ x: 0 }); onDragEnd?.(); }}>
            <AlignLeftIcon /> Kiri
          </button>
          <button className="cms-btn cms-btn--xs cms-btn--icon-text" onClick={() => { onUpdate({ x: canvasWidth - slot.width }); onDragEnd?.(); }}>
            <AlignRightIcon /> Kanan
          </button>
        </div>
      </div>

      {onDuplicate && (
        <div className="cms-field--separator" style={{ marginTop: '15px', paddingTop: '15px' }}>
          <button className="cms-btn cms-btn--ghost cms-btn--full" onClick={onDuplicate}>
            <CopyIcon size={14} /> Duplikat Slot
          </button>
        </div>
      )}
    </div>
  );
}
