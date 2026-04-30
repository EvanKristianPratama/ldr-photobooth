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

  const compressImage = (file, maxWidth = 800, quality = 0.6) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
        };
      };
    });
  };

  const handlePostToCommunity = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch(mergedImage);
      const blob = await response.blob();
      
      // Industry Standard: Compress before upload
      const compressedBlob = await compressImage(blob, 1000, 0.6);
      const finalFile = new File([compressedBlob], 'photostrip.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', finalFile);
      formData.append('author', postName);
      formData.append('title', postCaption); 
      formData.append('type', sessionMode === 'solo' ? 'solo' : 'duo');
      formData.append('frame_id', selectedFrameId || '');

      const API_BASE = 'https://ldr-photobooth.if2372047.workers.dev';

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
    <section className="page active result-page-container" id="page-download">
      <div className="result-layout-wrapper">
        
        {/* Left/Top: Branding/Title */}
        <div className="result-branding">
          <div className="done-big">
            READY<br />
            <span className="outline-pink">TO SHARE!</span>
          </div>
        </div>

        {/* Middle/Bottom: Preview & Actions */}
        <div className="result-main-content">
          <div 
            className="fs__preview-box" 
            style={{ maxWidth: sessionMode === 'solo' ? '320px' : '480px' }}
          >
            {isMerging ? (
              <div className="fs__loading">
                <div className="room-dot" />
                <p>Developing...</p>
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

          <div className="result-actions-stack">
            <button className="btn-community-hot" onClick={() => setShowPostModal(true)}>
              🔥 Post to Community 🔥
            </button>
            <button className="btn-dl" onClick={onDownload}>
              ↓ Download Strip
            </button>
            <button className="btn-share" onClick={handleShare}>
              📤 Share Photo
            </button>
            <button className="btn-secondary" onClick={onEditFrame} style={{ background: 'white', opacity: 0.8, fontSize: '14px' }}>
              Edit Again ↺
            </button>
            
            <div className="result-footer-links">
              <button className="btn-restart" onClick={onHome}>
                ← home
              </button>
              <div className="divider-v" />
              <button className="btn-secondary btn-donate-tiny" onClick={onDonate}>
                Donate ♥
              </button>
            </div>
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
