import React from 'react';

export default function ResultScreen({
  mergedImage,
  isMerging,
  downloadName,
  onEditFrame,
  onHome,
  onDownload
}) {
  return (
    <div className="screen-card glass-panel">
      <div className="screen-card__header">
        <div className="screen-card__icon">💾</div>
        <div>
          <h2 className="screen-card__title">Ready to Download</h2>
          <p className="screen-card__subtitle">Frame sudah diterapkan. Silakan download!</p>
        </div>
      </div>

      <div className="screen-card__body">
        <img src={mergedImage} className="merged-preview" alt="LDR Result" />
      </div>

      <div className="screen-card__actions-col">
        <div className="screen-card__row">
          <a
            href={isMerging ? undefined : mergedImage}
            download={downloadName}
            className={`btn-primary ${isMerging ? 'disabled' : ''}`}
            style={{
              textDecoration: 'none',
              pointerEvents: isMerging ? 'none' : 'auto',
              opacity: isMerging ? 0.7 : 1,
              textAlign: 'center',
              flex: 1,
              padding: '0.75rem 1rem',
              fontSize: '0.95rem'
            }}
            aria-disabled={isMerging}
            onClick={onDownload}
          >
            {isMerging ? '⏳ Applying…' : '⬇ Download'}
          </a>
          <button className="btn-secondary" onClick={onEditFrame} style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.95rem' }}>🖼 Edit Frame</button>
          <button className="btn-secondary" onClick={onHome} style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.95rem' }}>🏠 Home</button>
        </div>
      </div>
    </div>
  );
}
