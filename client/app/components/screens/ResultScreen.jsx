import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import LivePhotoViewer from '../ui/LivePhotoViewer';
import { convertToPaperSize } from '../../services/paperService';
import { imageToEscPosBytes, sendViaBluetooth } from '../../services/escposService';
import Swal from 'sweetalert2';
import './ResultScreen.css';

/**
 * Load a data URL image source into an HTMLImageElement.
 * @param {string} src - Image data URL or path
 * @returns {Promise<HTMLImageElement>}
 */
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

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
  orientation,
  onCheckout
}) {
  const { t } = useLanguage();
  const [showPostModal, setShowPostModal] = useState(false);
  const [postName, setPostName] = useState('Anonymous');
  const [postCaption, setPostCaption] = useState('Our photobooth moment! ✨');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingGif, setIsGeneratingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Print system states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState('idle');
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [bleDelay, setBleDelay] = useState(8);
  const [bleChunkSize, setBleChunkSize] = useState(128);
  const [bleSlowdown, setBleSlowdown] = useState(false);
  const [bleDoubleHeight, setBleDoubleHeight] = useState(false);
  const [bleScale, setBleScale] = useState(1.0);


  const autoPrintAttemptedRef = useRef(false);

  // Initialize auto-print setting from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ldr_auto_print');
      if (saved === 'false') {
        setAutoPrintEnabled(false);
      }
    }
  }, []);

  const handlePrint = async (format = 'AUTO') => {
    if (isPrinting || !mergedImage) return;
    setIsPrinting(true);
    setPrintStatus('printing');

    try {
      // 1. Process image to correct size/paper format
      const processedImage = await convertToPaperSize(mergedImage, {
        targetPaper: format,
        sessionMode: sessionMode,
        layout: frameLayout,
        count: localBlobs?.length || 1,
        frameColor: '#ffffff'
      });

      // 2. Web Browser Print via hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Print Photobooth</title>
            <style>
              @page {
                size: auto;
                margin: 0mm;
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: #fff;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${processedImage}" onload="window.print();" />
          </body>
        </html>
      `);
      doc.close();

      iframe.contentWindow.onafterprint = () => {
        document.body.removeChild(iframe);
        setPrintStatus('success');
      };

      // Fallback cleanup in case onafterprint does not fire
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        setPrintStatus('success');
      }, 5000);
    } catch (err) {
      console.error('Print error:', err);
      setPrintStatus('error');
      alert(t('result.printFailed') || 'Print failed, please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDirectBluetoothPrint = async () => {
    if (!mergedImage) return;

    try {
      // 1. Prepare receipt image
      Swal.fire({
        title: 'Processing Image... 🎨',
        text: 'Converting to thermal receipt format...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        customClass: { popup: 'swal-doodle' }
      });

      const processedImage = await convertToPaperSize(mergedImage, {
        targetPaper: 'RECEIPT_80MM',
        sessionMode: sessionMode,
        layout: frameLayout,
        count: localBlobs?.length || 1,
        frameColor: '#ffffff'
      });

      const img = await loadImage(processedImage);

      // 2. Convert to ESC/POS binary (strip-based raster for smooth printing)
      const escPosBytes = imageToEscPosBytes(img, { slowdown: bleSlowdown, doubleHeight: bleDoubleHeight, scale: bleScale });

      // 3. Send via Bluetooth with live status updates
      await sendViaBluetooth(escPosBytes, {
        delayWithoutResponse: bleDelay,
        chunkSize: bleChunkSize,
        onStatus: (status, detail) => {

          const statusMessages = {
            requesting: { title: 'Connecting Bluetooth Printer... 🔌', text: detail },
            connecting: { title: 'Connecting GATT Server... ⚡', text: detail },
            discovering: { title: 'Discovering Printer Services... 🔍', text: detail },
            printing: { title: 'Printing Photo Strip... 🖨️✨', text: detail },
          };
          const msg = statusMessages[status];
          if (msg) {
            Swal.fire({
              title: msg.title,
              text: msg.text,
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading(),
              customClass: { popup: 'swal-doodle' }
            });
          }
        },
      });

      Swal.fire({
        icon: 'success',
        title: 'Printed Successfully! 🎉',
        text: 'Your receipt booth photostrip has been printed.',
        timer: 3000,
        confirmButtonColor: '#8b5cf6',
        customClass: { popup: 'swal-doodle' }
      });
    } catch (err) {
      console.error('Direct Bluetooth print failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Print Failed ❌',
        text: err.message || 'Could not connect or print to Bluetooth thermal printer.',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'swal-doodle' }
      });
    }
  };

  const handlePrintViaThermer = async () => {
    if (!mergedImage) return;
    
    Swal.fire({
      title: 'Preparing Print... 🧾',
      text: 'Optimizing layout for Thermer...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'swal-doodle' }
    });

    try {
      // 1. Generate the 80mm B&W Receipt Image
      const processedImage = await convertToPaperSize(mergedImage, {
        targetPaper: 'RECEIPT_80MM',
        sessionMode: sessionMode,
        layout: frameLayout,
        count: localBlobs?.length || 1,
        frameColor: '#ffffff'
      });

      Swal.fire({
        title: 'Uploading Photo... ⚡',
        text: 'Preparing cloud link for Thermer printer...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        customClass: { popup: 'swal-doodle' }
      });

      // 2. Convert base64 dataUrl to blob/file
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const finalFile = new File([blob], 'receipt-80mm.jpg', { type: 'image/jpeg' });

      // 3. Upload to thermal print endpoint
      const formData = new FormData();
      formData.append('file', finalFile);

      const API_BASE = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
      const uploadRes = await fetch(`${API_BASE}/api/print/thermal/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload receipt image to server');
      }

      const uploadData = await uploadRes.json();
      
      const responseUrl = `${API_BASE}/api/print/thermal/${uploadData.id}`;
      const schemeUrl = `thermer://print?data=${encodeURIComponent(responseUrl)}`;

      console.log("Opening Thermer URL Scheme:", schemeUrl);
      Swal.close();
      window.location.href = schemeUrl;
    } catch (err) {
      console.error('Thermer print preparation failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Print Failed ❌',
        text: err.message || 'Could not prepare 80mm image for Thermer.',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'swal-doodle' }
      });
    }
  };

  const handlePrintViaBluetoothPrintApp = async () => {
    if (!mergedImage) return;
    
    Swal.fire({
      title: 'Preparing Print... 🧾',
      text: 'Optimizing layout for Bluetooth Print App...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'swal-doodle' }
    });

    try {
      // 1. Generate the 80mm B&W Receipt Image
      const processedImage = await convertToPaperSize(mergedImage, {
        targetPaper: 'RECEIPT_80MM',
        sessionMode: sessionMode,
        layout: frameLayout,
        count: localBlobs?.length || 1,
        frameColor: '#ffffff'
      });

      Swal.fire({
        title: 'Uploading Photo... ⚡',
        text: 'Preparing cloud link for Bluetooth Print App...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        customClass: { popup: 'swal-doodle' }
      });

      // 2. Convert base64 dataUrl to blob/file
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const finalFile = new File([blob], 'receipt-80mm.jpg', { type: 'image/jpeg' });

      // 3. Upload to thermal print endpoint
      const formData = new FormData();
      formData.append('file', finalFile);

      const API_BASE = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
      const uploadRes = await fetch(`${API_BASE}/api/print/thermal/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload receipt image to server');
      }

      const uploadData = await uploadRes.json();
      
      const responseUrl = `${API_BASE}/api/print/thermal/${uploadData.id}`;
      const schemeUrl = `bprint://${responseUrl}`;

      console.log("Opening Bluetooth Print URL Scheme:", schemeUrl);
      Swal.close();
      window.location.href = schemeUrl;
    } catch (err) {
      console.error('Bluetooth print preparation failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Print Failed ❌',
        text: err.message || 'Could not prepare 80mm image for Bluetooth Print App.',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'swal-doodle' }
      });
    }
  };

  const handleDownloadEscPosBin = async () => {
    if (!mergedImage) return;

    Swal.fire({
      title: 'Generating ESC/POS Binary... ⚙️',
      text: 'Preparing raw thermal print instructions...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'swal-doodle' }
    });

    try {
      const processedImage = await convertToPaperSize(mergedImage, {
        targetPaper: 'RECEIPT_80MM',
        sessionMode: sessionMode,
        layout: frameLayout,
        count: localBlobs?.length || 1,
        frameColor: '#ffffff'
      });

      const img = await loadImage(processedImage);
      const escPosBytes = imageToEscPosBytes(img, { slowdown: bleSlowdown, doubleHeight: bleDoubleHeight, scale: bleScale });

      // Trigger browser download of the raw binary
      const blob = new Blob([escPosBytes], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = (downloadName || `ldr-photo-${Date.now()}.jpg`).replace(/\.[^/.]+$/, '') + '-receipt.bin';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Swal.close();
    } catch (err) {
      console.error('ESC/POS binary generation failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Conversion Failed ❌',
        text: err.message || 'Error occurred while compiling ESC/POS format.',
        confirmButtonColor: '#e11d48',
        customClass: { popup: 'swal-doodle' }
      });
    }
  };

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
          remoteLiveFrames,
          sessionMode
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
        gifWidth: (sessionMode === 'solo') ? 280 : 600,
        gifHeight: (sessionMode === 'solo') ? 840 : 450,
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

  const downloadAsStory = async () => {
    if (!mergedImage) return;
    try {
      const img = new Image();
      img.src = mergedImage;
      await new Promise(r => img.onload = r);

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      // 1. Draw blurred background to truly follow the image colors
      ctx.filter = 'blur(80px) saturate(1.8) brightness(0.9)';
      const scaleToCover = Math.max(1080 / img.width, 1920 / img.height);
      const bgW = img.width * scaleToCover;
      const bgH = img.height * scaleToCover;
      const bgX = (1080 - bgW) / 2;
      const bgY = (1920 - bgH) / 2;
      ctx.drawImage(img, bgX, bgY, bgW, bgH);
      ctx.filter = 'none';

      // 2. Glassmorphism overlay gradient
      const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, 'rgba(255,255,255,0.2)');
      grad.addColorStop(1, 'rgba(255,255,255,0.05)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Dimensions for the main photostrip
      const maxW = 850;
      const maxH = 1350;
      const scaleToFit = Math.min(maxW / img.width, maxH / img.height);
      const fgW = img.width * scaleToFit;
      const fgH = img.height * scaleToFit;
      const fgX = (1080 - fgW) / 2;
      const fgY = (1920 - fgH) / 2 - 50; // Shifted up for logo space

      // 3. Draw the main image on top
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 20;
      ctx.drawImage(img, fgX, fgY, fgW, fgH);
      ctx.shadowColor = 'transparent';

      // 4. Draw Logo
      const logo = new Image();
      logo.src = '/Ldr_photobooth.png';
      await new Promise(r => {
        logo.onload = r;
        logo.onerror = r;
      });
      
      if (logo.width) {
        const logoTargetW = 350;
        const logoTargetH = logo.height * (logoTargetW / logo.width);
        const logoX = (1080 - logoTargetW) / 2;
        const logoY = 1920 - logoTargetH - 80;
        ctx.drawImage(logo, logoX, logoY, logoTargetW, logoTargetH);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = downloadName ? downloadName.replace(/\.[^/.]+$/, '') + '-story.jpg' : `ldr-photo-story-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('Failed to create story format:', err);
      alert('Error creating story format.');
    }
  };

  return (
    <section className="page active result-page-container" id="page-download">
      <div className="result-layout-wrapper">
        
        {/* Left/Top: Branding/Title */}
        <div className="result-branding">
          <div className="result-pill-badge">
            <span className="sparkle">✦</span>
            <span>{t('result.ready') || 'Ready'}</span>
          </div>
          <h1 className="result-clean-title">
            Ready to <span className="highlight-pink">Share!</span>
          </h1>
        </div>

        {/* Middle/Bottom: Preview & Actions */}
        <div className="result-main-content">
          <div 
            className="fs__preview-box" 
            style={{ 
              maxWidth: (sessionMode === 'solo') ? '280px' : '500px',
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

          <div className="result-actions-stack">
            {/* 1. Post to Community (Warm Sunset Pill) */}
            <button className="btn-pill btn-pill-community" onClick={() => setShowPostModal(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c-.5 2.5-2.5 4.5-4 6-2 2-3 4.5-3 7 0 4.4 3.6 8 8 8s8-3.6 8-8c0-3-1.5-5.5-3.5-7.5-.5 2-2 3.5-3.5 3.5-1 0-2-1-2-2.5 0-2.5 2-4.5 2-6.5-1 0-2 .5-2 0z"/>
              </svg>
              <span>{t('result.postCommunity').replace(/🔥/g, '').trim()}</span>
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              {/* 2. Download Strip (Vibrant Rose / Pink Pill) */}
              <button 
                className="btn-pill btn-pill-download" 
                onClick={() => setShowDownloadModal(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>{t('result.download')}</span>
              </button>

              {/* 3. Share Photo (Emerald / Teal Pill) */}
              <button className="btn-pill btn-pill-share" onClick={handleShare}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>{t('result.share')}</span>
              </button>

              {/* 4. Edit Again (Clean Slate White Pill) */}
              <button className="btn-pill btn-pill-secondary" onClick={onEditFrame}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                <span>{t('result.editAgain')}</span>
              </button>
            </div>
            
            {/* 5. Footer Links (Home & Donate) */}
            <div className="result-footer-links">
              <button className="btn-pill btn-pill-home" onClick={onHome}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>{t('common.home')}</span>
              </button>
              <button className="btn-pill btn-pill-donate" onClick={onDonate}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{t('result.donate')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── COMMUNITY POST MODAL ── */}
      {showPostModal && (
        <div className="result-modal-overlay">
          <div className="result-modal-box">
            <button className="result-modal-close" onClick={() => setShowPostModal(false)}>✕</button>
            <h2 className="result-modal-title">{t('community.shareTo')} {t('community.community')}</h2>
            <p className="result-modal-sub">{t('community.cuteMoment')}</p>
            
            {/* PHOTO PREVIEW */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
              <img 
                src={mergedImage} 
                alt="Preview" 
                style={{ 
                  maxHeight: '180px', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)' 
                }} 
              />
            </div>

            <div className="comm-form-group" style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>{t('community.yourName')}</label>
              <input 
                type="text" 
                className="comm-form-input" 
                style={{ borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px 14px', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                value={postName}
                onChange={(e) => setPostName(e.target.value)}
                placeholder={t('community.yourNamePlaceholder')}
              />
            </div>

            <div className="comm-form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>{t('community.caption')}</label>
              <textarea 
                className="comm-form-input" 
                style={{ height: '72px', paddingTop: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px 14px', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                placeholder={t('community.captionPlaceholder')}
              />
            </div>

            <button 
              className="btn-pill btn-pill-community" 
              style={{ width: '100%' }}
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
        <div className="result-modal-overlay">
          <div className="result-modal-box">
            <button className="result-modal-close" onClick={() => setShowDownloadModal(false)}>✕</button>
            
            <h2 className="result-modal-title">Select Format</h2>
            <p className="result-modal-sub">How would you like to save your photobooth strip?</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Story Format */}
              <button 
                className="result-format-card"
                onClick={() => { downloadAsStory(); setShowDownloadModal(false); }}
              >
                <div className="result-format-icon">📱</div>
                <div>
                  <div className="result-format-name">{t('result.format.story')}</div>
                  <div className="result-format-desc">Instagram & TikTok 9:16 story format</div>
                </div>
              </button>

              {/* Option 2: 4R Printable */}
              <button 
                className="result-format-card"
                onClick={() => { onDownload('4R'); setShowDownloadModal(false); }}
              >
                <div className="result-format-icon">🖨️</div>
                <div>
                  <div className="result-format-name">{t('result.format.4r')}</div>
                  <div className="result-format-desc">Standard 4R glossy photo paper format</div>
                </div>
              </button>

              {/* Option 2.5: Receipt Booth (80mm B&W) */}
              <button 
                className="result-format-card"
                onClick={() => { onDownload('RECEIPT_80MM'); setShowDownloadModal(false); }}
              >
                <div className="result-format-icon">🧾</div>
                <div>
                  <div className="result-format-name">{t('result.format.receipt')}</div>
                  <div className="result-format-desc">Thermal receipt black & white format</div>
                </div>
              </button>

              {/* Option 3: Classic Strip */}
              <button 
                className="result-format-card"
                onClick={() => { onDownload('ORIGINAL'); setShowDownloadModal(false); }}
              >
                <div className="result-format-icon">✂️</div>
                <div>
                  <div className="result-format-name">{t('result.format.strip')}</div>
                  <div className="result-format-desc">Standard vertical photo strip format</div>
                </div>
              </button>

              {/* Option 5: Animated GIF */}
              {localLiveFrames?.length > 0 && (
                <button 
                  className="result-format-card"
                  disabled={isGeneratingGif}
                  onClick={() => { setShowDownloadModal(false); downloadAnimatedGif(); }}
                >
                  <div className="result-format-icon">🎞️</div>
                  <div>
                    <div className="result-format-name">
                      {isGeneratingGif ? t('result.format.generating') : t('result.format.gif')}
                    </div>
                    <div className="result-format-desc">Animated looping live memory</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT OPTIONS MODAL ── */}
      {showPrintModal && (
        <div className="result-modal-overlay" style={{ zIndex: 1000 }}>
          <div className="result-modal-box">
            <button className="result-modal-close" onClick={() => setShowPrintModal(false)}>✕</button>
            
            <h2 className="result-modal-title">Select Print Format</h2>
            <p className="result-modal-sub">Choose how to print your photobooth strip</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Option 1: Classic Strip */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 var(--ink)', width: '100%', padding: '14px' }}
                onClick={() => { handlePrint('ORIGINAL'); setShowPrintModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px' }}>✂️</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Print Standard Strip</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Raw length vertical strip</div>
                </div>
              </button>

              {/* Option 2: 4R Printable */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 var(--yellow)', background: 'var(--yellow-lt, #fffbea)', width: '100%', padding: '14px', borderColor: 'var(--yellow)' }}
                onClick={() => { handlePrint('4R'); setShowPrintModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: 'var(--yellow)' }}>🖨️</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Print as 4R Page</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Standard 4R glossy paper</div>
                </div>
              </button>

              {/* Option 2.5: Receipt Booth (80mm B&W) */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 #333333', background: '#f5f5f5', width: '100%', padding: '14px', borderColor: '#333333' }}
                onClick={() => { handlePrint('RECEIPT_80MM'); setShowPrintModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: '#333333', color: 'white' }}>🧾</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Print as Receipt (80mm B&W)</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Grayscale thermal print format</div>
                </div>
              </button>

              {/* Option 2.6: Direct Bluetooth Print (ESC/POS) */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 #10b981', background: 'rgba(16, 185, 129, 0.1)', width: '100%', padding: '14px', borderColor: '#10b981' }}
                onClick={() => { handleDirectBluetoothPrint(); setShowPrintModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: '#10b981', color: 'white' }}>⚡🔵</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Print via Bluetooth (ESC/POS)</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Direct driverless print to BT printer</div>
                </div>
              </button>

              {/* Option 2.7: Print via Thermer App (Custom Scheme) */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 #06d6a0', background: 'rgba(6, 214, 160, 0.1)', width: '100%', padding: '14px', borderColor: '#06d6a0' }}
                onClick={() => { handlePrintViaThermer(); setShowPrintModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: '#06d6a0', color: 'white' }}>📲🧾</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Print via Thermer App</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Instant print on iOS & Android</div>
                </div>
              </button>

              {/* Option 2.8: Print via Bluetooth Print App (iOS/Android) */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 #118ab2', background: 'rgba(17, 138, 178, 0.1)', width: '100%', padding: '14px', borderColor: '#118ab2' }}
                onClick={() => { handlePrintViaBluetoothPrintApp(); setShowPrintModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: '#118ab2', color: 'white' }}>📱</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Print via Bluetooth Print App (iOS)</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Print directly using the external iOS/Android helper app</div>
                </div>
              </button>

              {/* Option 2.9: Order Printed Copy (Ship to Home) */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 var(--pink)', background: 'var(--pink-lt, #fff0f5)', width: '100%', padding: '14px', borderColor: 'var(--pink)' }}
                onClick={() => { if (onCheckout) onCheckout(); setShowPrintModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: 'var(--pink)', color: 'white' }}>📦</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Order Print (Ship to Home)</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Receive high-quality glossy prints shipped straight to your address</div>
                </div>
              </button>

              {/* Option 3: Duplicated 4R Strip (Classic Double) - ONLY show if layout is Strip! */}
              {frameLayout === 'strip' && (
                <button 
                  className="mode-option-card"
                  style={{ boxShadow: '4px 4px 0 var(--pink)', background: 'var(--pink-lt, #fff0f5)', width: '100%', padding: '14px', borderColor: 'var(--pink)' }}
                  onClick={() => { handlePrint('4R_DUPLICATED_STRIP'); setShowPrintModal(false); }}
                >
                  <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: 'var(--pink)', color: 'white' }}>👥</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>Print 2R Duo Strip (4R Kertas)</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>2 Lembar 2R digabung dalam 1 Kertas 4R (Classic)</div>
                  </div>
                </button>
              )}
            </div>

            {/* Bluetooth Configuration Panel */}
            <div style={{ 
              marginTop: '15px', 
              paddingTop: '12px', 
              borderTop: '2px dashed var(--ink)',
              fontFamily: "'Gaegu', cursive",
              fontSize: '15px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: '#f8fafc',
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--ink)'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚙️ Bluetooth Print Settings
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>🐢 Slowdown Motor (ESC/POS)</span>
                <input 
                  type="checkbox" 
                  checked={bleSlowdown}
                  onChange={(e) => setBleSlowdown(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>🎨 Vintage Smooth (Double Height)</span>
                <input 
                  type="checkbox" 
                  checked={bleDoubleHeight}
                  onChange={(e) => setBleDoubleHeight(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>📐 Print Scale (Ukuran Cetak)</span>
                <select 
                  value={bleScale} 
                  onChange={(e) => setBleScale(Number(e.target.value))}
                  style={{ 
                    padding: '2px 6px', 
                    border: '2px solid var(--ink)', 
                    borderRadius: '6px', 
                    fontFamily: "'Gaegu', cursive", 
                    fontWeight: 'bold', 
                    background: 'white',
                    fontSize: '13px'
                  }}
                >
                  <option value={1.0}>100% (Normal / ~18cm)</option>
                  <option value={0.8}>80% (Medium / ~14cm)</option>
                  <option value={0.7}>70% (Compact / ~12cm)</option>
                  <option value={0.6}>60% (Small / ~10cm)</option>
                  <option value={0.5}>50% (Mini / ~9cm)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>⏳ BLE Delay (ms)</span>
                <select 
                  value={bleDelay} 
                  onChange={(e) => setBleDelay(Number(e.target.value))}
                  style={{ 
                    padding: '2px 6px', 
                    border: '2px solid var(--ink)', 
                    borderRadius: '6px', 
                    fontFamily: "'Gaegu', cursive", 
                    fontWeight: 'bold', 
                    background: 'white',
                    fontSize: '13px'
                  }}
                >
                  <option value={2}>2 ms (Extreme/Fastest)</option>
                  <option value={4}>4 ms (Turbo Speed)</option>
                  <option value={8}>8 ms (Sweet Spot)</option>
                  <option value={16}>16 ms (Slower/Stable)</option>
                  <option value={32}>32 ms (Safest)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px' }}>📦 Chunk Size (Bytes)</span>
                <select 
                  value={bleChunkSize} 
                  onChange={(e) => setBleChunkSize(Number(e.target.value))}
                  style={{ 
                    padding: '2px 6px', 
                    border: '2px solid var(--ink)', 
                    borderRadius: '6px', 
                    fontFamily: "'Gaegu', cursive", 
                    fontWeight: 'bold', 
                    background: 'white',
                    fontSize: '13px'
                  }}
                >
                  <option value={64}>64 B (Small/Stable)</option>
                  <option value={128}>128 B (Standard)</option>
                  <option value={256}>256 B (Fast/Large)</option>
                  <option value={512}>512 B (Super/MTU Max)</option>
                  <option value={1024}>1024 B (Giant Chunk)</option>
                </select>
              </div>
            </div>

            {/* Auto-print Toggle Setting */}
            <div style={{ 
              marginTop: '20px', 
              paddingTop: '15px', 
              borderTop: '2px dashed var(--ink)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: "'Gaegu', cursive",
              fontSize: '18px'
            }}>
              <span>⚙️ Auto-print next session?</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={autoPrintEnabled}
                  onChange={(e) => {
                    setAutoPrintEnabled(e.target.checked);
                    localStorage.setItem('ldr_auto_print', e.target.checked ? 'true' : 'false');
                  }}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 'bold' }}>{autoPrintEnabled ? 'ON' : 'OFF'}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINTING STATUS NOTIFICATION ── */}
      {isPrinting && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'var(--teal-lt, #e8fff8)',
          border: '3px solid var(--ink)',
          boxShadow: '4px 4px 0 var(--ink)',
          borderRadius: '16px',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontFamily: "'Gaegu', cursive",
          fontSize: '22px',
          fontWeight: 'bold',
          color: 'var(--ink)',
          animation: 'printBounce 1s infinite alternate'
        }}>
          <span style={{ fontSize: '26px' }}>🖨️</span>
          <span>{t('result.printing') || 'Printing your photo strip...'}</span>
        </div>
      )}

      <style>{`
        @keyframes printBounce {
          0% { transform: translate(-50%, 0); }
          100% { transform: translate(-50%, -6px); }
        }
      `}</style>
    </section>
  );
}

