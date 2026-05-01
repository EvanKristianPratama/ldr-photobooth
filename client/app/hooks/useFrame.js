import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_FRAME_SRC, FRAME_CANVAS, FRAME_PRESETS } from '../constants/layout';

export default function useFrame({ participants }) {
  const [frameMode, setFrameMode] = useState('default');
  const [framePresetId, setFramePresetId] = useState('default');
  const [frameSrc, setFrameSrc] = useState(DEFAULT_FRAME_SRC);
  const [frameName, setFrameName] = useState('');
  const [frameError, setFrameError] = useState('');
  const [showFrameText, setShowFrameText] = useState(true);
  const [frameColor, setFrameColor] = useState('#000000');
  const [frameTextColor, setFrameTextColor] = useState('#FFFFFF');
  const [locTextLeft, setLocTextLeft] = useState('');
  const [locTextRight, setLocTextRight] = useState('');
  const [locTextEdited, setLocTextEdited] = useState(false);
  const [photoFilter, setPhotoFilter] = useState('none');
  const [mergedImage, setMergedImage] = useState(null);
  const [lastMergeCount, setLastMergeCount] = useState(0);
  const [isMerging, setIsMerging] = useState(false);
  const [sessionSeed, setSessionSeed] = useState(0);
  const [stickers, setStickers] = useState([]);
  const [orientation, setOrientation] = useState('portrait');
  const mergeCacheRef = useRef(new Map());

  const [communityPresets, setCommunityPresets] = useState([]);

  useEffect(() => {
    const fetchCommunityFrames = async () => {
      try {
        const API_BASE = 'https://ldr-photobooth.if2372047.workers.dev';
        const response = await fetch(`${API_BASE}/api/community/frames`);
        if (response.ok) {
          const data = await response.json();
          const mapped = data.map(f => {
            let finalUrl = f.url;
            if (!finalUrl.startsWith('http')) {
              // Ensure no double slashes
              const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
              const cleanPath = f.url.startsWith('/') ? f.url : `/${f.url}`;
              finalUrl = `${cleanBase}${cleanPath}`;
            }
            return {
              id: f.id,
              label: f.title,
              mode: 'custom',
              src: finalUrl,
              description: `by ${f.author}`
            };
          });
          setCommunityPresets(mapped);
        }
      } catch (err) {
        console.error('Failed to load community presets');
      }
    };
    fetchCommunityFrames();
  }, []);

  const framePresets = useMemo(() => {
    const basePresets = FRAME_PRESETS;
    
    // Gabungkan: Official + Community
    const combined = [...basePresets, ...communityPresets];

    if (frameName || (frameMode === 'custom' && frameSrc && frameSrc !== DEFAULT_FRAME_SRC)) {
      const customPreset = {
        id: 'upload',
        label: frameName ? `Upload: ${frameName}` : 'Custom Frame',
        mode: 'custom',
        src: frameSrc,
        description: 'Frame pilihanmu'
      };
      return [combined[0], customPreset, ...combined.slice(1)];
    }
    return combined;
  }, [frameName, frameMode, frameSrc, communityPresets]);

  const getDefaultFrameNames = useCallback(() => {
    const sorted = [...participants];
    const userA = (sorted[0]?.displayName || '').trim();
    const userB = (sorted[1]?.displayName || '').trim();
    return { left: userA || '', right: userB || '' };
  }, [participants]);

  const getAutoLocationString = useCallback((id, locationsById) => {
    const loc = locationsById[id];
    if (!loc) return '';
    const city = (loc.city || '').toString().trim();
    const country = (loc.country || '').toString().trim();
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return '';
  }, []);

  const loadImage = (src) => new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  const blobToImage = (blob) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(blob);
  });

  const mergeKey = useCallback((count) => {
    return [
      sessionSeed,
      count,
      frameMode,
      framePresetId,
      frameSrc,
      showFrameText,
      frameColor,
      frameTextColor,
      locTextLeft,
      locTextRight,
      photoFilter,
      JSON.stringify(stickers),
      orientation
    ].join('|');
  }, [sessionSeed, frameMode, framePresetId, frameSrc, showFrameText, frameColor, frameTextColor, locTextLeft, locTextRight, photoFilter, stickers, orientation]);

  const mergePhotos = useCallback(async ({
    count,
    participants,
    localBlobs,
    remoteBlobsByPeer, // Map<peerId, blob[]>
    locationsById,
  }) => {
    const key = mergeKey(count);
    if (mergeCacheRef.current.has(key)) {
      setMergedImage(mergeCacheRef.current.get(key));
      setLastMergeCount(count);
      return;
    }

    setIsMerging(true);
    try {
      const activeFrameColor = (frameColor || '#9b87f5').trim();
      const activeTextColor = (frameTextColor || '#FFFFFF').trim();

      const isPortrait = orientation === 'portrait';
      const cellW = isPortrait ? FRAME_CANVAS.cellW : FRAME_CANVAS.cellH;
      const cellH = isPortrait ? FRAME_CANVAS.cellH : FRAME_CANVAS.cellW;
      const gap = FRAME_CANVAS.gap;
      const headerH = FRAME_CANVAS.headerH;
      const footerH = FRAME_CANVAS.footerH;

      // Sort participants by ID to ensure consistent order across all peers
      const sorted = [...participants].sort((a, b) => a.id.localeCompare(b.id));
      const participantCount = sorted.length;
      const isStack = participantCount === 3;
      const isQuad2x2 = participantCount === 4;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let totalW, totalH;
      if (isStack) {
        totalW = cellW + (2 * gap);
        const totalRows = count * 3;
        totalH = (cellH * totalRows) + (gap * (totalRows + 1)) + headerH + footerH;
      } else if (isQuad2x2) {
        totalW = (cellW * 2) + (gap * 3);
        const totalRows = count * 2;
        totalH = (cellH * totalRows) + (gap * (totalRows + 1)) + headerH + footerH;
      } else {
        totalW = (cellW * participantCount) + (gap * (participantCount + 1));
        totalH = (cellH * count) + (gap * (count + 1)) + headerH + footerH;
      }

      canvas.width = totalW;
      canvas.height = totalH;

      const isCustomFrame = frameMode === 'custom';

      if (!isCustomFrame) {
        ctx.fillStyle = activeFrameColor;
        ctx.fillRect(0, 0, totalW, totalH);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalW, totalH);
      }

      const drawHeaderFooter = () => {
        if (!showFrameText) return;
        ctx.save();
        ctx.fillStyle = activeTextColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.textBaseline = 'middle';

        if (isStack || isQuad2x2) {
          // Joined header for Trio/Quad
          const names = sorted.map(p => (p.displayName || '').trim()).filter(Boolean).join(' ✦ ');
          const locs = sorted.map(p => getAutoLocationString(p.id, locationsById)).filter(Boolean);
          const uniqueLocs = [...new Set(locs)].join(' • ');

          ctx.textAlign = 'center';
          ctx.font = '800 40px Quicksand, system-ui, sans-serif';
          ctx.fillText(names, totalW / 2, Math.round(headerH * 0.45));
          
          ctx.font = '700 30px Quicksand, system-ui, sans-serif';
          if (uniqueLocs) ctx.fillText(uniqueLocs, totalW / 2, Math.round(headerH * 0.78));
        } else {
          // Side-by-side header for Duo/Solo
          const headerY1 = Math.round(headerH * 0.45);
          const headerY2 = Math.round(headerH * 0.78);

          sorted.forEach((p, idx) => {
            const name = (p.displayName || '').trim();
            const loc = getAutoLocationString(p.id, locationsById);
            const colX = gap + (idx * (cellW + gap)) + (cellW / 2);
            
            ctx.textAlign = 'center';
            ctx.font = '800 40px Quicksand, system-ui, sans-serif';
            if (name) ctx.fillText(name, colX, headerY1);
            
            ctx.font = '700 30px Quicksand, system-ui, sans-serif';
            if (loc) ctx.fillText(loc, colX, headerY2);
          });
        }

        ctx.restore();

        ctx.fillStyle = activeTextColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.font = '800 52px Quicksand, system-ui, sans-serif';
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(new Date().toLocaleDateString(), totalW / 2, totalH - Math.round(footerH * 0.55));
        ctx.font = '700 32px Quicksand, system-ui, sans-serif';
        ctx.fillText('Ldr-Photobooth Group Session', totalW / 2, totalH - Math.round(footerH * 0.3));
      };

      if (isCustomFrame && frameSrc) {
        const frameImg = await loadImage(frameSrc);
        if (frameImg) {
          ctx.drawImage(frameImg, 0, 0, totalW, totalH);
          setFrameError('');
        } else {
          setFrameError('Frame tidak bisa dimuat. Pastikan file PNG tersedia.');
        }
      } else {
        setFrameError('');
      }

      const drawCroppedImage = (img, x, y, w, h) => {
        const imgRatio = img.width / img.height;
        const targetRatio = w / h;
        let sw, sh, sx, sy;

        if (imgRatio > targetRatio) {
          sh = img.height;
          sw = sh * targetRatio;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          sw = img.width;
          sh = sw / targetRatio;
          sx = 0;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
      };

      for (let i = 0; i < count; i++) {
        for (let j = 0; j < participantCount; j++) {
          const participant = sorted[j];
          
          let colX, rowY;
          if (isStack) {
            colX = gap;
            rowY = headerH + gap + ((i * 3 + j) * (cellH + gap));
          } else if (isQuad2x2) {
            const colIdx = j % 2;
            const rowIdx = Math.floor(j / 2);
            colX = gap + (colIdx * (cellW + gap));
            rowY = headerH + gap + ((i * 2 + rowIdx) * (cellH + gap));
          } else {
            colX = gap + (j * (cellW + gap));
            rowY = headerH + gap + (i * (cellH + gap));
          }
          
          let imgBlob = null;
          if (participant.isYou) {
            imgBlob = localBlobs[i];
          } else {
            const peerBlobs = remoteBlobsByPeer.get(participant.id);
            imgBlob = peerBlobs ? peerBlobs[i] : null;
          }

          if (imgBlob) {
            const img = await blobToImage(imgBlob);
            ctx.save();
            if (photoFilter !== 'none') {
              if (photoFilter === 'bw') ctx.filter = 'grayscale(100%)';
              else if (photoFilter === 'sepia') ctx.filter = 'sepia(100%)';
              else if (photoFilter === 'vintage') ctx.filter = 'sepia(50%) contrast(120%) brightness(90%)';
              else if (photoFilter === 'warm') ctx.filter = 'sepia(30%) saturate(140%)';
              else if (photoFilter === 'cold') ctx.filter = 'saturate(80%) hue-rotate(180deg) brightness(110%)';
            }
            drawCroppedImage(img, colX, rowY, cellW, cellH);
            ctx.restore();
          }
        }
      }

      drawHeaderFooter();
      
      // Draw stickers
      stickers.forEach(s => {
        ctx.save();
        ctx.translate(s.x * totalW, s.y * totalH);
        ctx.rotate(s.rotation);
        ctx.font = `${Math.round(s.size * totalW)}px Quicksand, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.text, 0, 0);
        ctx.restore();
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      mergeCacheRef.current.set(key, dataUrl);
      setMergedImage(dataUrl);
      setLastMergeCount(count);
    } finally {
      setIsMerging(false);
    }
  }, [
    frameMode,
    framePresetId,
    frameSrc,
    showFrameText,
    frameTextColor,
    photoFilter,
    getAutoLocationString,
    mergeKey,
    stickers,
    orientation
  ]);

  const addSticker = useCallback((text) => {
    const newSticker = {
      text,
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      size: 0.03 + Math.random() * 0.03, // Smaller stickers (3-6% of width)
      rotation: (Math.random() - 0.5) * 0.5
    };
    setStickers(prev => [...prev, newSticker]);
    mergeCacheRef.current.clear();
  }, []);

  const addRandomSticker = useCallback(() => {
    const emojis = ['✨', '💖', '⭐', '🎈', '🍀', '🎀', '🍭', '🌸', '🌈', '🍦', '🍩', '🦋', '🐱', '🐶', '🦄', '🍎', '🍓', '🍕', '🍔', '🍟'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    addSticker(emoji);
  }, [addSticker]);

  const clearStickers = useCallback(() => {
    setStickers([]);
    mergeCacheRef.current.clear();
  }, []);

  const handleFrameUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    // Industry Standard: Resize custom frames to keep merging fast
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; // Sufficient for high quality but lightweight
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH / width) * height;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Keep as PNG to preserve transparency
        const compressedDataUrl = canvas.toDataURL('image/png');
        setFrameSrc(compressedDataUrl);
        setFrameName(file.name);
        setFrameMode('custom');
        setFramePresetId('upload');
        setFrameError('');
        mergeCacheRef.current.clear();
      };
    };
    reader.onerror = () => {
      setFrameError('Gagal membaca file frame.');
    };
    reader.readAsDataURL(file);
  };

  const selectFramePreset = (preset) => {
    if (!preset) return;
    setFramePresetId(preset.id);

    if (preset.mode === 'default') {
      setFrameMode('default');
      setFrameError('');
      mergeCacheRef.current.clear();
      return;
    }

    setFrameMode('custom');
    if (preset.src) {
      setFrameSrc(preset.src);
    }
    if (preset.id !== 'upload') {
      setFrameName('');
    }
    setFrameError('');
    mergeCacheRef.current.clear();
  };

  const resetFrame = () => {
    setFrameMode('default');
    setFramePresetId('default');
    setFrameSrc(DEFAULT_FRAME_SRC);
    setFrameName('');
    setFrameError('');
    setShowFrameText(true);
    setLocTextLeft('');
    setLocTextRight('');
    setLocTextEdited(false);
    setPhotoFilter('none');
    setMergedImage(null);
    setLastMergeCount(0);
    setIsMerging(false);
    setSessionSeed((prev) => prev + 1);
    mergeCacheRef.current.clear();
  };

  const bumpSessionSeed = () => {
    setSessionSeed((prev) => prev + 1);
    mergeCacheRef.current.clear();
  };

  return {
    frameMode,
    setFrameMode,
    framePresetId,
    setFramePresetId,
    frameSrc,
    setFrameSrc,
    frameName,
    setFrameName,
    frameError,
    setFrameError,
    showFrameText,
    setShowFrameText,
    frameColor,
    setFrameColor,
    frameTextColor,
    setFrameTextColor,
    locTextLeft,
    setLocTextLeft,
    locTextRight,
    setLocTextRight,
    setLocTextEdited,
    mergedImage,
    lastMergeCount,
    isMerging,
    photoFilter,
    setPhotoFilter,
    framePresets,
    mergePhotos,
    handleFrameUpload,
    selectFramePreset,
    getDefaultFrameNames,
    resetFrame,
    bumpSessionSeed,
    stickers,
    addSticker,
    addRandomSticker,
    clearStickers,
    orientation,
    setOrientation
  };
}
