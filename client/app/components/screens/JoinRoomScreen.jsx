import React from 'react';

export default function JoinRoomScreen({
  displayName,
  setDisplayName,
  roomCode,
  setRoomCode,
  generateRoomCode,
  copyRoomCode,
  showToast,
  onJoin
}) {
  return (
    <section className="page active" id="page-join">
      <div className="join-left">
        <div className="deco-circle" style={{ width: '200px', height: '200px', top: '-60px', left: '-60px' }}></div>
        <div className="deco-circle" style={{ width: '120px', height: '120px', bottom: '40px', right: '-30px' }}></div>
        <div className="deco-circle" style={{ width: '60px', height: '60px', top: '40%', left: '20px' }}></div>

        <div className="big-doodle">
          LDR
          <span className="outline">Photobooth</span>
        </div>
      </div>

      <div className="join-right">
        <div className="form-section-title">Hey, who are you? ✌️</div>

        <div className="form-group">
          <label className="form-label">Your name</label>
          <input 
            className="form-input" 
            value={displayName} 
            onChange={e => setDisplayName(e.target.value)} 
            placeholder="e.g. Evan" 
            autoComplete="off" 
            maxLength="30"
          />
          <p className="form-hint">It'll show up on your photo strip!</p>
          <p className={`error-msg ${!displayName ? 'show' : ''}`} id="err-name">Oops! Tell us your name first :)</p>
        </div>

        <div className="form-group">
          <label className="form-label">Room code</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              className="form-input" 
              value={roomCode} 
              onChange={e => setRoomCode(e.target.value.toUpperCase())} 
              placeholder="e.g. STUDIO42" 
              autoComplete="off" 
              maxLength="10" 
              style={{ textTransform: 'uppercase', letterSpacing: '4px' }}
            />
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={generateRoomCode} 
              style={{ padding: '0', width: '48px', height: '48px', fontSize: '24px' }}
              title="Generate Random Code"
            >
              🎲
            </button>
          </div>
          <p className="form-hint">4–10 characters — ask the host!</p>
          <p className={`error-msg ${roomCode && roomCode.length < 4 ? 'show' : ''}`} id="err-code">Hmm, need at least 4 characters!</p>
        </div>

        <button className="btn-primary" onClick={onJoin}>
          Let's go! →
        </button>

        {roomCode && (
          <div 
            className="code-display" 
            style={{ marginTop: '20px', fontSize: '18px' }}
            onClick={copyRoomCode}
          >
            <div className={`copy-toast ${showToast ? 'visible' : ''}`}>Link Copied!</div>
            Invite Link: {roomCode}
          </div>
        )}
      </div>
    </section>
  );
}
