import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import LivePhotoViewer from '../ui/LivePhotoViewer';

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
  selectedFrameId,
  localLiveFrames,
  remoteLiveFrames,
  localBlobs,
  remoteBlobsByPeer,
  locationsById,
  mergePhotos,
  participants,
  frameLayout,
  orientation
}) {
  const { t } = useLanguage();
  const [showPostModal, setShowPostModal] = useState(false);
  const [postName, setPostName] = useState('Anonymous');
  const [postCaption, setPostCaption] = useState('Our photobooth moment! ✨');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const downloadAnimatedGif = async () => {
    if (isGeneratingGif) return;
    setIsGeneratingGif(true);
    setGifProgress(10);
    try {
      const loadGifshot = () => {
        return new Promise((resolve, reject) => {
          if (window.gifshot) {
            resolve(window.gifshot);
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js';
          script.onload = () => resolve(window.gifshot);
          script.onerror = () => reject(new Error('Failed to load gifshot CDN'));
          document.head.appendChild(script);
        });
      };

      const gifshot = await loadGifshot();
      setGifProgress(30);

      const frameUrls = [];
      const count = localBlobs?.length || 1;
      
      for (let f = 0; f < 10; f++) {
        const dataUrl = await mergePhotos({
          count,
          participants,
          localBlobs,
          remoteBlobsByPeer,
          locationsById,
          frameIndex: f,
          localLiveFrames,
          remoteLiveFrames
        });
        if (dataUrl) {
          frameUrls.push(dataUrl);
        }
        setGifProgress(30 + Math.floor((f + 1) * 4));
      }

      setGifProgress(80);

      gifshot.createGIF({
        images: frameUrls,
        interval: 0.15,
        gifWidth: sessionMode === 'solo' ? 280 : 600,
        gifHeight: sessionMode === 'solo' ? 840 : 450,
        numFrames: 10,
        sampleInterval: 10
      }, function (obj) {
        if (!obj.error) {
          setGifProgress(100);
          const link = document.createElement('a');
          link.href = obj.image;
          link.download = downloadName ? downloadName.replace(/\.[^/.]+$/, '') + '.gif' : `ldr-photo-${Date.now()}.gif`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setIsGeneratingGif(false);
          setGifProgress(0);
        } else {
          console.error('Gifshot error:', obj.error);
          alert('Failed to generate GIF: ' + obj.error);
          setIsGeneratingGif(false);
          setGifProgress(0);
        }
      });
    } catch (err) {
      console.error('Failed to generate GIF:', err);
      alert('Error loading GIF compiler: ' + err.message);
      setIsGeneratingGif(false);
      setGifProgress(0);
    }
  };

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
            style={{ 
              maxWidth: sessionMode === 'solo' ? '280px' : '500px',
              height: '55vh', // Force exact max bounding reference
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: 'transparent'
            }}
          >
            {isMerging ? (
              <div className="fs__loading">
                <div className="room-dot" />
                <p>{t('result.developing')}</p>
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <LivePhotoViewer
                  mergedImage={mergedImage}
                  isMerging={isMerging}
                  count={localBlobs?.length || 1}
                  participants={participants}
                  localBlobs={localBlobs}
                  remoteBlobsByPeer={remoteBlobsByPeer}
                  locationsById={locationsById}
                  localLiveFrames={localLiveFrames}
                  remoteLiveFrames={remoteLiveFrames}
                  mergePhotos={mergePhotos}
                />
              </div>
            )}
          </div>

          <div className="result-actions-stack" style={{ gap: '15px' }}>
            <button className="btn-community-hot" onClick={() => setShowPostModal(true)} style={{ fontSize: '18px', padding: '16px' }}>
              {t('result.postCommunity')}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button 
                className="btn-dl" 
                onClick={() => setShowDownloadModal(true)} 
                style={{ 
                  width: '100%', 
                  fontSize: '18px', 
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <span>📥</span> {t('result.download')}
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
      {/* ── DOWNLOAD OPTIONS MODAL ── */}
      {showDownloadModal && (
        <div className="comm-modal-overlay" style={{ zIndex: 1000 }}>
          <div className="comm-modal" style={{ maxWidth: '420px', border: '3px solid var(--ink)', boxShadow: '8px 8px 0 var(--ink)' }}>
            <button className="comm-modal-close" onClick={() => setShowDownloadModal(false)}>×</button>
            
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 className="comm-modal-title" style={{ marginBottom: '4px' }}>Select <span className="outline">Format</span></h2>
              <p style={{ fontFamily: "'Gaegu', cursive", opacity: 0.7, fontSize: '16px' }}>How would you like to save it? ✨</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Option 1: Classic Strip */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 var(--ink)', width: '100%', padding: '14px' }}
                onClick={() => { onDownload('ORIGINAL'); setShowDownloadModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px' }}>✂️</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Download Standard Strip</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Raw length vertical strip</div>
                </div>
              </button>

              {/* Option 2: 4R Printable */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 var(--yellow)', background: 'var(--yellow-lt, #fffbea)', width: '100%', padding: '14px', borderColor: 'var(--yellow)' }}
                onClick={() => { onDownload('4R'); setShowDownloadModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: 'var(--yellow)' }}>🖨️</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Download as 4R</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Printable size (6" x 4" format)</div>
                </div>
              </button>

              {/* Option 3: Duplicated 4R Strip (Classic Double) - ONLY show if layout is Strip! */}
              {frameLayout === 'strip' && (
                <button 
                  className="mode-option-card"
                  style={{ boxShadow: '4px 4px 0 var(--pink)', background: 'var(--pink-lt, #fff0f5)', width: '100%', padding: '14px', borderColor: 'var(--pink)' }}
                  onClick={() => { onDownload('4R_DUPLICATED_STRIP'); setShowDownloadModal(false); }}
                >
                  <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: 'var(--pink)', color: 'white' }}>👥</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Download 2R Duo Strip</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>2 Lembar 2R digabung dalam 1 Kertas 4R (Classic)</div>
                  </div>
                </button>
              )}

              {/* Option 4: Animated GIF */}
              {localLiveFrames?.length > 0 && (
                <button 
                  className="mode-option-card"
                  style={{ 
                    boxShadow: '4px 4px 0 var(--teal)', 
                    background: 'var(--teal-lt, #e6fffa)', 
                    width: '100%', 
                    padding: '14px',
                    borderColor: 'var(--teal)',
                    opacity: isGeneratingGif ? 0.7 : 1
                  }}
                  disabled={isGeneratingGif}
                  onClick={() => { setShowDownloadModal(false); downloadAnimatedGif(); }}
                >
                  <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: 'var(--teal)', color: 'white' }}>🎞️</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>
                      {isGeneratingGif ? `Generating...` : `Download Animated GIF`}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>Interactive motion photos</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

