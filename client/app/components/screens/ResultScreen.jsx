import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import LivePhotoViewer from '../ui/LivePhotoViewer';
import { convertToPaperSize } from '../../services/paperService';
import Swal from 'sweetalert2';

/**
 * Konversi gambar B&W menjadi array bytes perintah biner ESC/POS (Raster Bit Image GS v 0).
 * Lebar standar 80mm adalah 576 dots (piksel) mendatar.
 */
const canvasToEscPosBytes = (imgElement) => {
  const printWidth = 576; // Lebar standard printer thermal 80mm
  const scale = printWidth / imgElement.width;
  const printHeight = Math.round(imgElement.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = printWidth;
  canvas.height = printHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgElement, 0, 0, printWidth, printHeight);

  const imgData = ctx.getImageData(0, 0, printWidth, printHeight);
  const pixels = imgData.data;

  const widthBytes = printWidth / 8; // 72 bytes per baris
  const escPosCommands = [];

  // 1. Inisialisasi Printer: ESC @ (0x1B, 0x40)
  escPosCommands.push(0x1B, 0x40);

  // 2. Command Cetak Gambar: GS v 0 m xL xH yL yH
  const m = 0; // Normal mode
  const xL = widthBytes % 256;
  const xH = Math.floor(widthBytes / 256);
  const yL = printHeight % 256;
  const yH = Math.floor(printHeight / 256);

  escPosCommands.push(0x1D, 0x76, 0x30, m, xL, xH, yL, yH);

  // 3. Konversi piksel ke format bit biner (1 = hitam, 0 = putih)
  for (let y = 0; y < printHeight; y++) {
    for (let x = 0; x < widthBytes; x++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixelX = x * 8 + bit;
        const pixelIdx = (y * printWidth + pixelX) * 4;
        const r = pixels[pixelIdx];
        const g = pixels[pixelIdx + 1];
        const b = pixels[pixelIdx + 2];
        const a = pixels[pixelIdx + 3];

        let isBlack = 0;
        if (a > 50) {
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          if (luminance < 140) { // Threshold sedikit dinaikkan untuk hasil print hitam-putih yang solid
            isBlack = 1;
          }
        }
        
        byteVal |= (isBlack << (7 - bit));
      }
      escPosCommands.push(byteVal);
    }
  }

  // 4. Feed & Cut
  // Feed 4 line kosong agar gambar keluar penuh dari pemotong
  escPosCommands.push(0x1B, 0x64, 4);
  // Cut paper: GS V 66 0
  escPosCommands.push(0x1D, 0x56, 66, 0);

  return new Uint8Array(escPosCommands);
};

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

      // 2. Determine execution context (Electron App vs standard Web Browser)
      if (typeof window !== 'undefined' && window.electronAPI?.printImage) {
        // Native Electron Print (Silent / Instant)
        const res = await window.electronAPI.printImage(processedImage, {
          silent: true,
          deviceName: '' // default printer
        });
        if (res?.success) {
          setPrintStatus('success');
        } else {
          console.error('Electron silent print failed:', res?.error);
          setPrintStatus('error');
          alert(t('result.printFailed') || 'Print failed, please try again.');
        }
      } else {
        // Web Browser Print via hidden iframe (standard fallback)
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
      }
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

    Swal.fire({
      title: 'Connecting Bluetooth Printer... 🔌',
      text: 'Please select your Bluetooth thermal printer in the browser dialog.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'swal-doodle' }
    });

    try {
      // 1. Request Bluetooth Device
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer GATT Service
          '00001101-0000-1000-8000-00805f9b34fb', // Serial Port UUID
          '0000e808-0000-1000-8000-00805f9b34fb'  // Generic raw write GATT Service
        ]
      });

      Swal.fire({
        title: 'Connecting GATT Server... ⚡',
        text: `Establishing hardware connection with ${device.name || 'Printer'}...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        customClass: { popup: 'swal-doodle' }
      });

      const server = await device.gatt.connect();
      
      Swal.fire({
        title: 'Discovering Printer Services... 🔍',
        text: 'Searching for serial write characteristic...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        customClass: { popup: 'swal-doodle' }
      });

      const services = await server.getPrimaryServices();
      let writeCharacteristic = null;

      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeCharacteristic = char;
              break;
            }
          }
        } catch (e) {
          console.warn('Failed to scan service characteristics:', service.uuid, e);
        }
        if (writeCharacteristic) break;
      }

      if (!writeCharacteristic) {
        throw new Error('Could not find a valid write characteristic on this device. Make sure it is a GATT-capable thermal printer.');
      }

      Swal.fire({
        title: 'Processing Image... 🎨',
        text: 'Scaling and converting receipt booth to ESC/POS binary bitmap...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        customClass: { popup: 'swal-doodle' }
      });

      // 2. Generate the 80mm B&W Receipt Image
      const processedImage = await convertToPaperSize(mergedImage, {
        targetPaper: 'RECEIPT_80MM',
        sessionMode: sessionMode,
        layout: frameLayout,
        count: localBlobs?.length || 1,
        frameColor: '#ffffff'
      });

      // Load image to read data
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = processedImage;
      });

      // Convert to raster binary data
      const escPosBytes = canvasToEscPosBytes(img);

      Swal.fire({
        title: 'Printing Photo Strip... 🖨️✨',
        text: 'Transmitting ESC/POS packets in safe chunks...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        customClass: { popup: 'swal-doodle' }
      });

      // 3. Send bytes in safe chunk sizes to avoid Bluetooth buffer overflows
      const chunkSize = 120;
      const delayMs = 15;
      for (let offset = 0; offset < escPosBytes.length; offset += chunkSize) {
        const chunk = escPosBytes.slice(offset, offset + chunkSize);
        if (writeCharacteristic.properties.writeWithoutResponse) {
          await writeCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await writeCharacteristic.writeValueWithResponse(chunk);
        }
        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Printed Successfully! 🎉',
        text: 'Your receipt booth photostrip has been printed.',
        timer: 3000,
        confirmButtonColor: '#8b5cf6',
        customClass: { popup: 'swal-doodle' }
      });
  };

  const handlePrintViaThermer = () => {
    if (!mergedImage) return;
    
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "_").split(".")[0];
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString();
    
    // Build the JSON Print Entries array representing the photobooth receipt
    const entries = [
      {
        Type: 0,
        Content: "LDR THERMAL BOOTH",
        Bold: 1,
        Align: 1,
        Format: 2 // Double height + width
      },
      {
        Type: 0,
        Content: "STORE #9821 // PORTABLE CLIENT",
        Bold: 0,
        Align: 1,
        Format: 4 // Small font
      },
      {
        Type: 0,
        Content: "--------------------------------",
        Bold: 0,
        Align: 1,
        Format: 0
      },
      {
        Type: 0,
        Content: `DATE: ${dateStr}  TIME: ${timeStr}`,
        Bold: 0,
        Align: 0,
        Format: 4
      },
      {
        Type: 0,
        Content: `ORDER #: #9821-${timestamp.slice(-6)}`,
        Bold: 1,
        Align: 0,
        Format: 4
      },
      {
        Type: 0,
        Content: `SESSION: ${sessionMode.toUpperCase()} (${localBlobs?.length || 1} PHOTOS)`,
        Bold: 0,
        Align: 0,
        Format: 4
      },
      {
        Type: 0,
        Content: `LAYOUT: ${frameLayout.toUpperCase()} (${orientation.toUpperCase()})`,
        Bold: 0,
        Align: 0,
        Format: 4
      },
      {
        Type: 0,
        Content: "--------------------------------",
        Bold: 0,
        Align: 1,
        Format: 0
      },
      {
        Type: 0,
        Content: "1x PREMIUM THERMAL ACQUISITION",
        Bold: 0,
        Align: 0,
        Format: 4
      },
      {
        Type: 0,
        Content: "1x LDR BRAND CUSTOM FRAME",
        Bold: 0,
        Align: 0,
        Format: 4
      },
      {
        Type: 0,
        Content: "--------------------------------",
        Bold: 0,
        Align: 1,
        Format: 0
      },
      {
        Type: 0,
        Content: "TOTAL AMOUNT: $0.00",
        Bold: 1,
        Align: 0,
        Format: 0
      },
      {
        Type: 0,
        Content: "--------------------------------",
        Bold: 0,
        Align: 1,
        Format: 0
      },
      {
        Type: 3, // QR Code linking to worker web client
        Value: "https://ldr-photobooth.if2372047.workers.dev",
        Size: 50,
        Align: 1
      },
      {
        Type: 0,
        Content: " ",
        Bold: 0,
        Align: 1,
        Format: 0
      },
      {
        Type: 0,
        Content: "THANK YOU FOR YOUR SNAP! ✨",
        Bold: 1,
        Align: 1,
        Format: 0
      },
      {
        Type: 0,
        Content: " ",
        Bold: 0,
        Align: 1,
        Format: 0
      }
    ];

    const jsonStr = JSON.stringify(entries);
    const urlEncoded = encodeURIComponent(jsonStr);
    const url = "thermer://print?data=" + urlEncoded;

    console.log("Opening Thermer URL Scheme:", url);
    window.location.href = url;
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
      // 1. Generate the 80mm B&W Receipt Image
      const processedImage = await convertToPaperSize(mergedImage, {
        targetPaper: 'RECEIPT_80MM',
        sessionMode: sessionMode,
        layout: frameLayout,
        count: localBlobs?.length || 1,
        frameColor: '#ffffff'
      });

      // Load image to read data
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = processedImage;
      });

      // 2. Convert to raster binary data
      const escPosBytes = canvasToEscPosBytes(img);

      // 3. Create blob and download
      const blob = new Blob([escPosBytes], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      
      const baseName = downloadName || `ldr-photo-${Date.now()}.jpg`;
      const binName = baseName.replace(/\.[^/.]+$/, '') + '-receipt.bin';
      
      link.download = binName;
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

          <div className="result-actions-stack" style={{ gap: '15px' }}>
            <button className="btn-community-hot" onClick={() => setShowPostModal(true)} style={{ fontSize: '18px', padding: '16px' }}>
              {t('result.postCommunity')}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button 
                  className="btn-dl" 
                  onClick={() => setShowDownloadModal(true)} 
                  style={{ 
                    flex: 1, 
                    fontSize: '18px', 
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {t('result.download')}
                </button>
                <button 
                  className="btn-share" 
                  onClick={() => {
                    if (onCheckout) onCheckout();
                  }}
                  style={{ 
                    flex: 1, 
                    fontSize: '18px', 
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'var(--teal)',
                    boxShadow: '4px 4px 0 var(--ink)'
                  }}
                >
                  {t('result.print') || 'Order Print'}
                </button>
              </div>
              
              {/* DIRECT PRINT VIA THERMER APP BUTTON */}
              <button 
                className="btn-share" 
                onClick={handlePrintViaThermer}
                style={{ 
                  width: '100%', 
                  fontSize: '18px', 
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#06d6a0',
                  boxShadow: '4px 4px 0 var(--ink)',
                  color: 'var(--ink)'
                }}
              >
                📲 Print via Thermer App
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
              {/* Option 1: Story Format */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 #9b51e0', background: 'rgba(155, 81, 224, 0.1)', width: '100%', padding: '14px', borderColor: '#9b51e0' }}
                onClick={() => { downloadAsStory(); setShowDownloadModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: '#9b51e0', color: 'white' }}>📱</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>{t('result.format.story')}</div>
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
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>{t('result.format.4r')}</div>
                </div>
              </button>

              {/* Option 2.5: Receipt Booth (80mm B&W) */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 #333333', background: '#f5f5f5', width: '100%', padding: '14px', borderColor: '#333333' }}
                onClick={() => { onDownload('RECEIPT_80MM'); setShowDownloadModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px', background: '#333333', color: 'white' }}>🧾</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>{t('result.format.receipt')}</div>
                </div>
              </button>

              {/* Option 3: Classic Strip */}
              <button 
                className="mode-option-card"
                style={{ boxShadow: '4px 4px 0 var(--ink)', width: '100%', padding: '14px' }}
                onClick={() => { onDownload('ORIGINAL'); setShowDownloadModal(false); }}
              >
                <div className="mode-icon" style={{ width: '40px', height: '40px', fontSize: '20px' }}>✂️</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', fontFamily: "'Gaegu', cursive" }}>{t('result.format.strip')}</div>
                </div>
              </button>

              {/* Option 5: Animated GIF */}
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
                      {isGeneratingGif ? t('result.format.generating') : t('result.format.gif')}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT OPTIONS MODAL ── */}
      {showPrintModal && (
        <div className="comm-modal-overlay" style={{ zIndex: 1000 }}>
          <div className="comm-modal" style={{ maxWidth: '420px', border: '3px solid var(--ink)', boxShadow: '8px 8px 0 var(--ink)' }}>
            <button className="comm-modal-close" onClick={() => setShowPrintModal(false)}>×</button>
            
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 className="comm-modal-title" style={{ marginBottom: '4px' }}>Select <span className="outline">Print Format</span></h2>
              <p style={{ fontFamily: "'Gaegu', cursive", opacity: 0.7, fontSize: '16px' }}>Choose how to print your photobooth strip! 🖨️✨</p>
            </div>

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
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Printable size (6" x 4" format)</div>
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

