'use client';

import React, { useState, useMemo } from 'react';

interface LocationInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  participant?: { id: string };
  userData?: { locationsById?: Record<string, { city?: string; country?: string }> };
}

export const LocationInput = React.memo(({
  label,
  placeholder,
  value,
  onChange,
  participant,
  userData
}: LocationInputProps) => {
  const [focused, setFocused] = useState(false);

  const chips = useMemo(() => {
    const locationsById = userData?.locationsById || {};
    const locData = participant?.id ? locationsById[participant.id] : null;
    const list = [];
    if (locData) {
      const city = (locData.city || '').trim();
      const country = (locData.country || '').trim();
      if (city && country && `${city}, ${country}` !== value) {
        list.push({ label: `📍 ${city}, ${country}`, value: `${city}, ${country}` });
      }
      if (country && country !== value) {
        list.push({ label: `🌏 ${country}`, value: country });
      }
      if (city && city !== value) {
        list.push({ label: `🏙 ${city}`, value: city });
      }
    }
    return list;
  }, [participant, userData, value]);

  return (
    <div style={styles.inputWrapper}>
      <label className="field-label">{label}</label>
      <input
        className="form-input"
        style={styles.inputField}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
      />
      {focused && chips.length > 0 && (
        <div style={styles.suggestionBox}>
          {chips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                onChange(chip.value);
                setFocused(false);
              }}
              style={styles.chipBtn}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
LocationInput.displayName = 'LocationInput';

const styles = {
  inputWrapper: { flex: 1, position: 'relative' as const },
  inputField: { fontSize: '14px', padding: '8px', width: '100%', boxSizing: 'border-box' as const },
  suggestionBox: {
    position: 'absolute' as const,
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
    flexDirection: 'column' as const,
    gap: '4px',
    marginTop: '2px',
  },
  chipBtn: {
    background: 'var(--yellow, #ffd93d)',
    border: '1.5px solid var(--ink)',
    borderRadius: '8px',
    padding: '5px 10px',
    fontFamily: "'Gaegu', cursive",
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background 0.15s',
  },
};
