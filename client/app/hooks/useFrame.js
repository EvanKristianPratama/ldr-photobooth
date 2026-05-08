import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_FRAME_SRC, FRAME_CANVAS, FRAME_PRESETS } from '../constants/layout';

export default function useFrame({ participants, locationsById = {} }) {
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
  const [frameFont, setFrameFont] = useState("'Quicksand', sans-serif");
  const [frameLayout, setFrameLayout] = useState('strip'); // 'strip' or 'grid'
  const [frameDate, setFrameDate] = useState(new Date().toLocaleDateString());
  const [frameNoise, setFrameNoise] = useState(0); // 0 to 100
  const [frameGlare, setFrameGlare] = useState('none'); // 'none', 'warm', 'retro'
  const mergeCacheRef = useRef(new Map());

  const [communityPresets, setCommunityPresets] = useState([]);

  useEffect(() => {
    const fetchCommunityFrames = async () => {
      try {
        const API_BASE = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
        const response = await fetch(`${API_BASE}/api/community/frames`);
        if (response.ok) {
          const json = await response.json();
          // Handle both array response and object with data property
          const frames = Array.isArray(json) ? json : (json.data || []);
          
          const mapped = frames.map(f => {
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
        console.error('Failed to load community presets:', err);
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

  // Auto-initialize edit fields from participants/locations
  useEffect(() => {
    if (locTextEdited || !participants?.length) return;

    if (participants.length === 1) {
      // Solo: Default to Name
      const name = (participants[0].displayName || '').trim();
      if (name) setLocTextLeft(name);
    } else if (participants.length === 2) {
      // Duo: Default to Locations
      const loc1 = getAutoLocationString(participants[0].id, locationsById);
      const loc2 = getAutoLocationString(participants[1].id, locationsById);
      if (loc1) setLocTextLeft(loc1);
      if (loc2) setLocTextRight(loc2);
    }
  }, [participants, locationsById, locTextEdited, getAutoLocationString]);

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
      orientation,
      frameFont,
      frameLayout,
      frameDate,
      frameNoise,
      frameGlare
    ].join('|');
  }, [sessionSeed, frameMode, framePresetId, frameSrc, showFrameText, frameColor, frameTextColor, locTextLeft, locTextRight, photoFilter, stickers, orientation, frameFont, frameLayout, frameDate, frameNoise, frameGlare]);

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
      const isGrid = frameLayout === 'grid' && count > 1 && (participantCount === 1 || participantCount === 2);
      
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
      } else if (isGrid) {
        const cols = participantCount * 2;
        const rows = Math.ceil(count / 2);
        totalW = (cellW * cols) + (gap * (cols + 1));
        totalH = (cellH * rows) + (gap * (rows + 1)) + headerH + footerH;
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
          ctx.font = `800 40px ${frameFont}`;
          ctx.fillText(names, totalW / 2, Math.round(headerH * 0.45));
          
          ctx.font = `700 30px ${frameFont}`;
          if (uniqueLocs) ctx.fillText(uniqueLocs, totalW / 2, Math.round(headerH * 0.78));
        } else {
          // Side-by-side header for Duo/Solo
          const headerY1 = Math.round(headerH * 0.45);
          const headerY2 = Math.round(headerH * 0.78);

          sorted.forEach((p, idx) => {
            let name = (p.displayName || '').trim();
            let loc = getAutoLocationString(p.id, locationsById);

            // Solo Mode: locTextLeft overrides name
            if (participantCount === 1 && locTextLeft) {
              name = locTextLeft;
            } 
            // Duo Mode: locTextLeft/Right overrides respective locations
            else if (participantCount === 2) {
              if (idx === 0 && locTextLeft) loc = locTextLeft;
              if (idx === 1 && locTextRight) loc = locTextRight;
            }

            let colX;
            if (isGrid && participantCount === 1) {
              colX = totalW / 2; // Center of the whole canvas for Solo Wide
            } else {
              colX = gap + (idx * (cellW + gap)) + (cellW / 2); // Default behavior
            }
            
            ctx.textAlign = 'center';
            ctx.font = `800 40px ${frameFont}`;
            if (name) ctx.fillText(name, colX, headerY1);
            
            ctx.font = `700 30px ${frameFont}`;
            if (loc) ctx.fillText(loc, colX, headerY2);
          });
        }

        ctx.restore();

        ctx.fillStyle = activeTextColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.font = `800 52px ${frameFont}`;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(frameDate, totalW / 2, totalH - Math.round(footerH * 0.55));
        ctx.font = `700 32px ${frameFont}`;
        ctx.fillText('LDRPhotobooth', totalW / 2, totalH - Math.round(footerH * 0.3));
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

      const applyPixelFilter = (ctx, x, y, w, h, filter) => {
        if (filter === 'none') return;
        try {
          const imgData = ctx.getImageData(x, y, w, h);
          const data = imgData.data;
          const len = data.length;

          if (filter === 'bw') {
            for (let i = 0; i < len; i += 4) {
              const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              data[i] = gray;
              data[i + 1] = gray;
              data[i + 2] = gray;
            }
          } else if (filter === 'sepia') {
            for (let i = 0; i < len; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
              data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
              data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
              data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            }
          } else if (filter === 'vintage') {
            for (let i = 0; i < len; i += 4) {
              const r = data[i], g = data[i + 1], b = data[i + 2];
              const nr = (r * 0.393) + (g * 0.769) + (b * 0.189);
              const ng = (r * 0.349) + (g * 0.686) + (b * 0.168);
              const nb = (r * 0.272) + (g * 0.534) + (b * 0.131);
              const finalR = r * 0.5 + nr * 0.5;
              const finalG = g * 0.5 + ng * 0.5;
              const finalB = b * 0.5 + nb * 0.5;
              data[i] = Math.min(255, Math.max(0, ((finalR - 128) * 1.25) + 128 - 10));
              data[i + 1] = Math.min(255, Math.max(0, ((finalG - 128) * 1.25) + 128 - 10));
              data[i + 2] = Math.min(255, Math.max(0, ((finalB - 128) * 1.25) + 128 - 10));
            }
          } else if (filter === 'warm') {
            for (let i = 0; i < len; i += 4) {
              data[i] = Math.min(255, data[i] * 1.15);
              data[i + 1] = Math.min(255, data[i + 1] * 1.06);
              data[i + 2] = Math.min(255, data[i + 2] * 0.85);
            }
          } else if (filter === 'cold') {
            for (let i = 0; i < len; i += 4) {
              data[i] = Math.min(255, data[i] * 0.85);
              data[i + 1] = Math.min(255, data[i + 1] * 1.02);
              data[i + 2] = Math.min(255, data[i + 2] * 1.18);
            }
          }
          ctx.putImageData(imgData, x, y);
        } catch (err) {
          console.error("Safari manual filter error:", err);
        }
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
            const rowIdx = i * 2 + Math.floor(j / 2);
            colX = gap + colIdx * (cellW + gap);
            rowY = headerH + gap + rowIdx * (cellH + gap);
          } else if (isGrid) {
            const shotCol = i % 2;
            const shotRow = Math.floor(i / 2);
            const colIdx = (shotCol * participantCount) + j;
            const rowIdx = shotRow;
            colX = gap + colIdx * (cellW + gap);
            rowY = headerH + gap + rowIdx * (cellH + gap);
          } else {
            colX = gap + (j * (cellW + gap));
            rowY = headerH + gap + (i * (cellH + gap));
          }
          
          const blobs = participant.isYou ? localBlobs : (remoteBlobsByPeer.get(participant.id) || []);
          const blob = blobs[i];

          if (blob) {
            const img = await blobToImage(blob);
            drawCroppedImage(img, colX, rowY, cellW, cellH);
            if (photoFilter !== 'none') {
              applyPixelFilter(ctx, colX, rowY, cellW, cellH, photoFilter);
            }
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

      // ── ANALOG FILM GRAIN EFFECT ──
      if (frameNoise > 0) {
        ctx.save();
        // Generate a fast tiled grain pattern
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 128;
        noiseCanvas.height = 128;
        const noiseCtx = noiseCanvas.getContext('2d');
        const noiseData = noiseCtx.createImageData(128, 128);
        
        // Map 0-100 scale to max 45 opacity for gorgeous, customizable grain density
        const opacity = Math.round((frameNoise / 100) * 45);

        for (let i = 0; i < noiseData.data.length; i += 4) {
          const val = Math.floor(Math.random() * 255);
          noiseData.data[i] = val;
          noiseData.data[i+1] = val;
          noiseData.data[i+2] = val;
          noiseData.data[i+3] = opacity;
        }
        noiseCtx.putImageData(noiseData, 0, 0);
        
        const grainPattern = ctx.createPattern(noiseCanvas, 'repeat');
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, totalW, totalH);
        ctx.restore();
      }

      // ── RETRO CAMERA GLARE / LIGHT LEAK EFFECT ──
      if (frameGlare !== 'none') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        if (frameGlare === 'warm') {
          // Soft Warm Orange/Golden leak from Top Left corner
          const grad = ctx.createRadialGradient(
            0, 0, 0,
            0, 0, totalH * 0.75
          );
          grad.addColorStop(0, 'rgba(255, 90, 40, 0.38)');  // Sunset orange
          grad.addColorStop(0.3, 'rgba(255, 170, 50, 0.22)'); // Warm yellow
          grad.addColorStop(0.6, 'rgba(255, 120, 180, 0.08)'); // Subtle magenta glow
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, totalW, totalH);
        } else if (frameGlare === 'retro') {
          // Retro Pinkish/Neon Purple leakage from Left Edge
          const grad = ctx.createLinearGradient(0, 0, totalW * 0.9, 0);
          grad.addColorStop(0, 'rgba(255, 0, 128, 0.28)'); // Intense vintage pink
          grad.addColorStop(0.2, 'rgba(150, 0, 255, 0.15)'); // Retro purple
          grad.addColorStop(0.5, 'rgba(0, 200, 255, 0.04)'); // Teal touch
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, totalW, totalH);
        } else if (frameGlare === 'aurora') {
          // Beautiful Green-Teal glow from Bottom Right corner
          const grad = ctx.createRadialGradient(
            totalW, totalH, 0,
            totalW, totalH, totalH * 0.7
          );
          grad.addColorStop(0, 'rgba(0, 240, 160, 0.35)'); // Beautiful neon green-teal
          grad.addColorStop(0.4, 'rgba(0, 150, 255, 0.2)');  // Soft sky blue
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, totalW, totalH);
        } else if (frameGlare === 'fire') {
          // Dynamic Fire Red wash from Top Right corner
          const grad = ctx.createRadialGradient(
            totalW, 0, 0,
            totalW, 0, totalH * 0.75
          );
          grad.addColorStop(0, 'rgba(255, 40, 0, 0.42)'); // Dynamic fire red
          grad.addColorStop(0.4, 'rgba(255, 130, 0, 0.25)'); // Orange burst
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, totalW, totalH);
        } else if (frameGlare === 'nebula') {
          // Mystic Magenta-Violet glow from Bottom Left corner
          const grad = ctx.createRadialGradient(
            0, totalH, 0,
            0, totalH, totalH * 0.75
          );
          grad.addColorStop(0, 'rgba(180, 0, 255, 0.35)'); // Mystical purple
          grad.addColorStop(0.3, 'rgba(255, 0, 180, 0.22)'); // Pink neon
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, totalW, totalH);
        } else if (frameGlare === 'sunset') {
          // Beautiful Sunset Pink/Orange horizon leak from Bottom Edge
          const grad = ctx.createLinearGradient(0, totalH, 0, totalH * 0.45);
          grad.addColorStop(0, 'rgba(255, 60, 100, 0.35)'); // Fuchsia pink
          grad.addColorStop(0.5, 'rgba(255, 140, 0, 0.2)');  // Warm orange
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, totalW, totalH);
        } else if (frameGlare === 'vintage') {
          // Antique golden wash centered across the strip
          const grad = ctx.createRadialGradient(
            totalW * 0.5, totalH * 0.5, 0,
            totalW * 0.5, totalH * 0.5, totalH * 0.8
          );
          grad.addColorStop(0, 'rgba(255, 230, 150, 0.28)'); // Antique golden
          grad.addColorStop(0.5, 'rgba(255, 180, 100, 0.12)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, totalW, totalH);
        } else if (frameGlare === 'rainbow') {
          // Diagonal Rainbow prism leakage
          const grad = ctx.createLinearGradient(0, 0, totalW, totalH);
          grad.addColorStop(0, 'rgba(255, 50, 50, 0.22)');    // Red
          grad.addColorStop(0.2, 'rgba(255, 150, 0, 0.15)');  // Orange
          grad.addColorStop(0.4, 'rgba(255, 255, 0, 0.1)');   // Yellow
          grad.addColorStop(0.6, 'rgba(0, 255, 100, 0.08)');  // Green
          grad.addColorStop(0.8, 'rgba(0, 150, 255, 0.12)');  // Blue
          grad.addColorStop(1, 'rgba(150, 50, 255, 0.18)');   // Violet
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, totalW, totalH);
        } else if (frameGlare === 'cyberpunk') {
          // Cyberpunk Cyan and Magenta dual leaks from opposite corners
          const grad1 = ctx.createRadialGradient(totalW, 0, 0, totalW, 0, totalH * 0.6);
          grad1.addColorStop(0, 'rgba(0, 255, 255, 0.35)');
          grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad1;
          ctx.fillRect(0, 0, totalW, totalH);

          const grad2 = ctx.createRadialGradient(0, totalH, 0, 0, totalH, totalH * 0.6);
          grad2.addColorStop(0, 'rgba(255, 0, 255, 0.35)');
          grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad2;
          ctx.fillRect(0, 0, totalW, totalH);
        }
        ctx.restore();
      }

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
    locTextLeft,
    locTextRight,
    photoFilter,
    getAutoLocationString,
    mergeKey,
    stickers,
    orientation,
    frameLayout,
    frameFont,
    frameDate,
    frameNoise,
    frameGlare
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
    setOrientation,
    frameFont,
    setFrameFont,
    frameLayout,
    setFrameLayout,
    frameDate,
    setFrameDate,
    frameNoise,
    setFrameNoise,
    frameGlare,
    setFrameGlare
  };
}
