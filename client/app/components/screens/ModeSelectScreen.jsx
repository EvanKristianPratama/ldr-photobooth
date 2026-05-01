import React, { useState } from 'react';
import Swal from 'sweetalert2';

export default function ModeSelectScreen({ onSelectMode, onShowHelp }) {
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  const groupOptions = [
    { id: 2, label: 'Duo (2 Orang)', desc: 'Best for couples & besties', icon: '👥' },
    { id: 3, label: 'Trio (3 Orang)', desc: 'Perfect for the trio squad', icon: '👪', comingSoon: true },
    { id: 4, label: 'Quad (4 Orang)', desc: 'Full crew session', icon: '👨‍👩‍👧‍👦', comingSoon: true },
  ];

  if (showGroupOptions) {
    return (
      <section className="page active" id="page-mode-select">
        <button className="btn-help" onClick={onShowHelp} title="Cara Pakai">?</button>
        <div className="mode-left vibe-bg">
          <div className="deco-circle" style={{ width: '200px', height: '200px', top: '-60px', left: '-60px' }}></div>
          <div className="deco-circle" style={{ width: '120px', height: '120px', bottom: '40px', right: '-30px' }}></div>
          <div className="big-doodle">
            How many
            <span className="outline">People? 👥</span>
          </div>
        </div>

        <div className="mode-right">
          <button 
            onClick={() => setShowGroupOptions(false)}
            className="btn-secondary"
            style={{ 
              position: 'absolute',
              top: '20px',
              left: '20px',
              zIndex: 100,
              padding: '8px 16px',
              fontSize: '16px',
              fontFamily: "'Gaegu', cursive"
            }}
          >
            ← Back
          </button>
          <div className="form-section-title">Select Group Size ✦</div>

          {groupOptions.map(opt => (
            <div 
              key={opt.id}
              className={`mode-option-card duo ${opt.comingSoon ? 'coming-soon' : ''}`} 
              onClick={() => {
                if (opt.comingSoon) {
                  Swal.fire({
                    title: 'Sabar ya! ✨',
                    text: 'Fitur Trio & Quad masih dalam tahap pengembangan. Stay tuned!',
                    icon: 'info',
                    confirmButtonText: 'Oke!',
                    confirmButtonColor: 'var(--ink)',
                    customClass: {
                      popup: 'swal-doodle'
                    }
                  });
                  return;
                }
                onSelectMode('duo', opt.id);
              }}
              style={{ marginBottom: '16px', opacity: opt.comingSoon ? 0.7 : 1, cursor: opt.comingSoon ? 'not-allowed' : 'pointer' }}
            >
              <div className="mode-icon">{opt.icon}</div>
              <div className="mode-details">
                <div className="mode-title">
                  {opt.label}
                  {opt.comingSoon && <span style={{ fontSize: '12px', marginLeft: '10px', background: 'var(--ink)', color: 'var(--yellow)', padding: '2px 8px', borderRadius: '10px', verticalAlign: 'middle', fontWeight: 'bold' }}>SOON!</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

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
          onClick={() => setShowGroupOptions(true)}
        >
          <div className="mode-icon">👥</div>
          <div className="mode-details">
            <div className="mode-title">Group Mode (LDR)</div>
          </div>
        </div>

        <div 
          className="mode-option-card community" 
          onClick={() => onSelectMode('community')}
        >
          <div className="mode-icon" style={{ background: '#eee' }}>✨</div>
          <div className="mode-details">
            <div className="mode-title">Community</div>
          </div>
        </div>
      </div>
    </section>
  );
}
