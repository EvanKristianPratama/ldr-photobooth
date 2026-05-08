import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

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
  const { t } = useLanguage();
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
        alert(t('result.webShareError'));
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

      const API_BASE = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';

      const res = await fetch(`${API_BASE}/api/community/posts`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setShowPostModal(false);
        alert(t('community.publishedSuccess'));
      }
    } catch (err) {
      alert(t('community.publishFailed'));
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
            {t('result.ready')}<br />
            <span className="outline-pink">{t('result.toShare')}</span>
          </div>
        </div>

        {/* Middle/Bottom: Preview & Actions */}
        <div className="result-main-content">
          <div 
            className="fs__preview-box" 
            style={{ maxWidth: sessionMode === 'solo' ? '280px' : '600px' }}
          >
            {isMerging ? (
              <div className="fs__loading">
                <div className="room-dot" />
                <p>{t('result.developing')}</p>
              </div>
            ) : (
              <img 
                src={mergedImage} 
                alt="Final Strip" 
                style={{ 
                  width: '100%', 
                  maxHeight: '65vh',
                  objectFit: 'contain',
                  borderRadius: '4px', 
                  border: '3.5px solid var(--ink)', 
                  boxShadow: '10px 10px 0 var(--ink)'
                }} 
              />
            )}
          </div>

          <div className="result-actions-stack" style={{ gap: '15px' }}>
            <button className="btn-community-hot" onClick={() => setShowPostModal(true)} style={{ fontSize: '18px', padding: '16px' }}>
              {t('result.postCommunity')}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button className="btn-dl" onClick={onDownload} style={{ width: '100%', fontSize: '16px', padding: '14px' }}>
                {t('result.download')}
              </button>
              <button className="btn-share" onClick={handleShare} style={{ width: '100%', fontSize: '16px', padding: '14px' }}>
                {t('result.share')}
              </button>
              <button className="btn-secondary" onClick={onEditFrame} style={{ width: '100%', background: 'white', fontSize: '16px', padding: '14px', border: '2px solid var(--ink)' }}>
                {t('result.editAgain')}
              </button>
            </div>
            
            <div className="result-footer-links" style={{ marginTop: '10px', width: '100%', gap: '15px' }}>
              <button 
                className="btn-restart" 
                onClick={onHome} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  background: 'white',
                  border: '2px solid var(--ink)',
                  borderRadius: '12px',
                  boxShadow: '4px 4px 0 var(--ink)',
                  color: 'var(--ink)',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {t('common.home')}
              </button>
              <button className="btn-secondary" onClick={onDonate} style={{ flex: 1, padding: '12px', fontSize: '18px', background: 'var(--yellow)', border: '2px solid var(--ink)', borderRadius: '12px', boxShadow: '4px 4px 0 var(--ink)', color: 'var(--ink)', fontWeight: 'bold' }}>
                {t('result.donate')}
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
            <h2 className="comm-modal-title">{t('community.shareTo')} <span className="outline">{t('community.community')}</span></h2>
            <p style={{ fontFamily: 'Gaegu', textAlign: 'center', opacity: 0.7, marginBottom: '15px' }}>{t('community.cuteMoment')}</p>
            
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
              <label>{t('community.yourName')}</label>
              <input 
                type="text" 
                className="comm-form-input" 
                value={postName}
                onChange={(e) => setPostName(e.target.value)}
                placeholder={t('community.yourNamePlaceholder')}
              />
            </div>

            <div className="comm-form-group">
              <label>{t('community.caption')}</label>
              <textarea 
                className="comm-form-input" 
                style={{ height: '80px', paddingTop: '10px' }}
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                placeholder={t('community.captionPlaceholder')}
              />
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '10px' }}
              onClick={handlePostToCommunity}
              disabled={isPublishing}
            >
              {isPublishing ? t('community.publishing') : t('community.publish')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

