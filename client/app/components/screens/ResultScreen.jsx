import React, { useState } from 'react';

export default function ResultScreen({
  mergedImage,
  isMerging,
  downloadName,
  onEditFrame,
  onHome,
  onDownload,
  onDonate,
  photoFilter,
  sessionMode,
  selectedFrameId
}) {
  const [showPostModal, setShowPostModal] = useState(false);
  const [postName, setPostName] = useState('Anonymous');
  const [postCaption, setPostCaption] = useState('Our photobooth moment! ✨');
  const [isPublishing, setIsPublishing] = useState(false);

  const handleShare = async () => {
    if (!mergedImage) return;
    try {
      const response = await fetch(mergedImage);
      const blob = await response.blob();
      const file = new File([blob], downloadName || 'photobooth.jpg', { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'LDR Photobooth',
          text: 'Check out our photo strip! ✨',
        });
      } else {
        alert('Web Share is not supported in this browser. Please download and share manually! ✌️');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handlePostToCommunity = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch(mergedImage);
      const blob = await response.blob();
      const file = new File([blob], 'photostrip.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('author', postName);
      formData.append('title', postCaption); 
      formData.append('type', sessionMode === 'solo' ? 'solo' : 'duo');
      formData.append('frame_id', selectedFrameId || '');

      const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8787' 
        : '';

      const res = await fetch(`${API_BASE}/api/community/posts`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setShowPostModal(false);
        alert("Published! Check the Community Showcase 🚀");
      }
    } catch (err) {
      alert("Failed to post.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <section className="page active" id="page-download" style={{ flexDirection: 'row', padding: '0 60px', overflow: 'hidden', background: 'var(--cream)', alignItems: 'center', justifyContent: 'center', gap: '80px' }}>
      
      {/* Left: Branding/Title */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="confetti-row" style={{ fontSize: '20px', opacity: 0.8 }}>★ ✦ ♥ ✦ ★</div>
        <div className="done-big" style={{ fontSize: 'clamp(50px, 6vw, 90px)', lineHeight: '1', margin: '0' }}>
          READY<br />
          <span style={{ color: 'var(--pink)', WebkitTextStroke: '1px var(--ink)', textShadow: 'none' }}>TO PRINT!</span>
        </div>
      </div>

      {/* Right: Actions/Preview */}
      <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
        <div 
          className="fs__preview-box" 
          style={{ maxWidth: sessionMode === 'solo' ? '160px' : '260px', flexShrink: 0 }}
        >
          {isMerging ? (
            <div className="fs__loading" style={{ padding: '60px' }}>
              <div className="room-dot" />
              <p style={{ fontFamily: 'Caveat', fontSize: '20px' }}>Developing...</p>
            </div>
          ) : (
            <img 
              src={mergedImage} 
              alt="Final Strip" 
              style={{ 
                width: '100%', 
                borderRadius: '4px', 
                border: '3.5px solid var(--ink)', 
                boxShadow: '10px 10px 0 var(--ink)',
                filter: photoFilter === 'bw' ? 'grayscale(100%)' :
                        photoFilter === 'sepia' ? 'sepia(100%)' :
                        photoFilter === 'vintage' ? 'sepia(50%) contrast(120%) brightness(90%)' :
                        photoFilter === 'warm' ? 'sepia(30%) saturate(140%)' :
                        photoFilter === 'cold' ? 'saturate(80%) hue-rotate(180deg) brightness(110%)' : 'none'
              }} 
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '240px' }}>
          <button className="btn-dl" onClick={onDownload} style={{ width: '100%', padding: '12px 20px', fontSize: '18px' }}>
            ↓ Download Strip
          </button>
          <button className="btn-share" onClick={handleShare} style={{ width: '100%', padding: '12px 20px', fontSize: '18px' }}>
            📤 Share Photo
          </button>
          <button className="btn-secondary" onClick={() => setShowPostModal(true)} style={{ width: '100%', padding: '12px 20px', fontSize: '16px' }}>
            🎨 Post to Community
          </button>
          <button className="btn-secondary" onClick={onEditFrame} style={{ width: '100%', padding: '10px 20px', fontSize: '16px', background: 'white' }}>
            Edit Again ↺
          </button>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center', justifyContent: 'center' }}>
            <button className="btn-restart" onClick={onHome} style={{ fontSize: '15px', opacity: 0.6 }}>
              ← back home
            </button>
            <div style={{ width: '1px', height: '12px', background: 'var(--ink)', opacity: 0.2 }}></div>
            <button className="btn-secondary" onClick={onDonate} style={{ fontSize: '13px', padding: '4px 10px', background: 'transparent', boxShadow: 'none', border: '1px solid var(--ink)', borderRadius: '4px' }}>
              Donate ♥
            </button>
          </div>
        </div>
      </div>

      {/* ── COMMUNITY POST MODAL ── */}
      {showPostModal && (
        <div className="comm-modal-overlay">
          <div className="comm-modal" style={{ maxWidth: '400px' }}>
            <button className="comm-modal-close" onClick={() => setShowPostModal(false)}>×</button>
            <h2 className="comm-modal-title">Share to <span className="outline">Community</span></h2>
            <p style={{ fontFamily: 'Gaegu', textAlign: 'center', opacity: 0.7, marginBottom: '15px' }}>Let others see your cute moment! ✨</p>
            
            {/* PHOTO PREVIEW */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <img 
                src={mergedImage} 
                alt="Preview" 
                style={{ 
                  maxHeight: '180px', 
                  borderRadius: '6px', 
                  border: '2px solid var(--ink)', 
                  boxShadow: '4px 4px 0 var(--ink)' 
                }} 
              />
            </div>

            <div className="comm-form-group">
              <label>Your Name 👤</label>
              <input 
                type="text" 
                className="comm-form-input" 
                value={postName}
                onChange={(e) => setPostName(e.target.value)}
                placeholder="Ex: Evan & Kristian"
              />
            </div>

            <div className="comm-form-group">
              <label>Short Caption ✍️</label>
              <textarea 
                className="comm-form-input" 
                style={{ height: '80px', paddingTop: '10px' }}
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                placeholder="Tell something about this photo..."
              />
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '10px' }}
              onClick={handlePostToCommunity}
              disabled={isPublishing}
            >
              {isPublishing ? 'Publishing...' : 'Publish now 🚀'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
