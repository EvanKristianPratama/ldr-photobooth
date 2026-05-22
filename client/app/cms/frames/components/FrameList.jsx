import React from 'react';

/**
 * FrameList — Grid list of existing frame templates with edit/delete/live-toggle actions.
 */
export default function FrameList({ templates, loading, onNew, onEdit, onDelete, apiBase, onTogglePublish }) {
  if (loading) {
    return (
      <div className="cms-list">
        <div className="cms-list__loading">
          <div className="cms-spinner" />
          <span>Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cms-list">
      <div className="cms-list__header">
        <div>
          <h2 className="cms-list__title">Frame Templates</h2>
          <p className="cms-list__subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''} created</p>
        </div>
        <button className="cms-btn cms-btn--primary" onClick={onNew}>
          + New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="cms-list__empty">
          <div className="cms-list__empty-icon">🖼️</div>
          <h3>No templates yet</h3>
          <p>Create your first frame template to get started</p>
          <button className="cms-btn cms-btn--primary" onClick={onNew}>Create Template</button>
        </div>
      ) : (
        <div className="cms-list__grid">
          {templates.map(t => {
            const thumbUrl = t.thumbnail_url
              ? (t.thumbnail_url.startsWith('http') ? t.thumbnail_url : `${apiBase}${t.thumbnail_url}`)
              : null;

            return (
              <div key={t.id} className="cms-card">
                <div className="cms-card__thumb" style={{ backgroundColor: t.background_color || '#1a1a2e' }}>
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={t.name} onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      {t.slots?.map(s => (
                         <div key={s.id} style={{ 
                           position: 'absolute', 
                           left: `${(s.x / t.canvas_width) * 100}%`,
                           top: `${(s.y / t.canvas_height) * 100}%`,
                           width: `${(s.width / t.canvas_width) * 100}%`,
                           height: `${(s.height / t.canvas_height) * 100}%`,
                           background: 'rgba(255,255,255,0.8)',
                           boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                         }} />
                      ))}
                    </div>
                  )}
                  {t.is_published ? (
                    <span className="cms-card__badge cms-card__badge--live">Live</span>
                  ) : (
                    <span className="cms-card__badge cms-card__badge--draft">Draft</span>
                  )}
                </div>
                <div className="cms-card__body">
                  <h3 className="cms-card__title">{t.name}</h3>
                  <div className="cms-card__meta">
                    <span>{t.photo_count} foto</span>
                    <span>{t.canvas_width}×{t.canvas_height}</span>
                    <span>{t.frame_mode === 'duo' ? '👫 Duo' : '🧑 Solo'}</span>
                  </div>
                  <div className="cms-card__actions">
                    <div className="cms-card__actions-left">
                      <button className="cms-btn cms-btn--sm" onClick={() => onEdit(t)}>Edit</button>
                      <button className="cms-btn cms-btn--sm cms-btn--danger" onClick={() => onDelete(t.id)}>Delete</button>
                    </div>
                    <label
                      className="cms-live-toggle"
                      title={t.is_published ? 'Set to Draft' : 'Set to Live'}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={!!t.is_published}
                        onChange={() => onTogglePublish && onTogglePublish(t)}
                      />
                      <span className="cms-live-toggle__track">
                        <span className="cms-live-toggle__thumb" />
                      </span>
                      <span className="cms-live-toggle__label">
                        {t.is_published ? 'Live' : 'Draft'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
