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
    <div className="screen-card glass-panel">
      <div className="screen-card__header">
        <div className="screen-card__icon">👋</div>
        <div>
          <h2 className="screen-card__title">Join Booth</h2>
          <p className="screen-card__subtitle">Masukkan nama dan kode room</p>
        </div>
      </div>

      <div className="screen-card__body">
        <div className="input-group">
          <label>Your Name</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Masukkan nama" />
        </div>

        <div className="input-group">
          <label>Room Code</label>
          <input value={roomCode} onChange={e => setRoomCode(e.target.value)} placeholder="Masukkan kode room" />
        </div>

        <div className="screen-card__row">
          <button className="btn-secondary" onClick={generateRoomCode} style={{ flex: 1 }}>Generate Code</button>
          <div
            className="code-display"
            style={{ cursor: roomCode ? 'pointer' : 'default', position: 'relative', flex: 1 }}
            onClick={copyRoomCode}
          >
            <div className={`copy-toast ${showToast ? 'visible' : ''}`}>Link Copied!</div>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomCode || '—'}</span>
          </div>
        </div>
      </div>

      <button className="btn-primary screen-card__cta" onClick={onJoin}>Join Booth</button>
    </div>
  );
}
