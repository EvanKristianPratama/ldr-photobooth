import React from 'react';

/**
 * NumField — Reusable numeric input field for property editors.
 * Used by SlotEditor, DecorationEditor, TextElementEditor.
 */
export default function NumField({ label, value, min, max, step = 1, onChange, onBlur }) {
  return (
    <div className="cms-field">
      <label className="cms-field__label">{label}</label>
      <input
        type="number"
        className="cms-field__input"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        onBlur={onBlur}
      />
    </div>
  );
}
