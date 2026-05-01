import React from 'react';

export default function ModeSelectScreen({ onSelectMode, onShowHelp }) {
  return (
    <section className="page active" id="page-mode-select">
      <div className="help-hint-container" style={{ position: 'absolute', top: '22px', right: '75px', display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
        <span style={{ 
          fontFamily: "'Gaegu', cursive", 
          fontSize: '16px', 
          color: 'var(--ink)', 
          background: 'white',
          padding: '4px 10px',
          borderRadius: '12px 12px 0 12px',
          border: '2px solid var(--ink)',
          boxShadow: '2px 2px 0 var(--ink)',
          whiteSpace: 'nowrap',
          animation: 'float-x 2s ease-in-out infinite'
        }}>
          kalau bingung klik aku 👉
        </span>
      </div>
      <button className="btn-help" onClick={onShowHelp} title="Cara Pakai">?</button>
      <div className="mode-left vibe-bg">
        <div className="deco-circle" style={{ width: '200px', height: '200px', top: '-60px', left: '-60px' }}></div>
        <div className="deco-circle" style={{ width: '120px', height: '120px', bottom: '40px', right: '-30px' }}></div>
        <div className="deco-circle" style={{ width: '60px', height: '60px', top: '40%', left: '20px' }}></div>

        <div className="big-doodle">
          Pick your
          <span className="outline">Vibe! ✨</span>
        </div>
      </div>

      <div className="mode-right">
        <div className="form-section-title">Mau foto gimana hari ini? ✌️</div>

        <div 
          className="mode-option-card solo" 
          onClick={() => onSelectMode('solo')}
        >
          <div className="mode-icon">👤</div>
          <div className="mode-details">
            <div className="mode-title">Solo Mode</div>
          </div>
        </div>

        <div 
          className="mode-option-card duo" 
          onClick={() => onSelectMode('duo')}
        >
          <div className="mode-icon">👥</div>
          <div className="mode-details">
            <div className="mode-title">Duo Mode (LDR)</div>
          </div>
        </div>

        <div 
          className="mode-option-card community" 
          onClick={() => onSelectMode('community')}
        >
          <div className="mode-icon" style={{ background: '#eee' }}>✨</div>
          <div className="mode-details">
            <div className="mode-title">Community</div>
            <div style={{ fontSize: '13px', color: 'var(--pink)', fontFamily: "'Gaegu', cursive", fontWeight: 700 }}>EXPLORE GALLERY</div>
          </div>
        </div>
      </div>
    </section>
  );
}
