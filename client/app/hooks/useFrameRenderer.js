import { useCallback, useRef, useState, useEffect } from 'react';
import { FRAME_CANVAS } from '../constants/layout';
import { SHAPE_PATHS } from '../utils/shapes';
import { saveSessionToIndexedDb } from '../utils/indexedDb';


export function useFrameRenderer({
  frameState,
  participants,
  locationsById = {}
}) {
  const [mergedImage, setMergedImage] = useState(null);
  const [lastMergeCount, setLastMergeCount] = useState(0);
  const [isMerging, setIsMerging] = useState(false);
  const mergeCacheRef = useRef(new Map());

  const {
    sessionSeed, frameMode, framePresetId, frameSrc, showFrameText, 
    frameColor, frameTextColor, locTextLeft, locTextRight, photoFilter, 
    stickers, orientation, frameFont, frameLayout, frameDate, 
    frameNoise, frameGlare, activeTemplate, showWeather, weatherText,
    locTextEdited, setLocTextLeft, setLocTextRight, setFrameError
  } = frameState;

  useEffect(() => {
    mergeCacheRef.current.clear();
  }, [sessionSeed]);

  useEffect(() => {
    if (mergedImage) {
      saveSessionToIndexedDb({ mergedImage });
    }
  }, [mergedImage]);

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
      frameGlare,
      activeTemplate?.id || 'none',
      showWeather,
      weatherText
    ].join('|');
  }, [sessionSeed, frameMode, framePresetId, frameSrc, showFrameText, frameColor, frameTextColor, locTextLeft, locTextRight, photoFilter, stickers, orientation, frameFont, frameLayout, frameDate, frameNoise, frameGlare, activeTemplate, showWeather, weatherText]);

  const mergePhotos = useCallback(async ({
    count,
    participants,
    localBlobs,
    remoteBlobsByPeer, // Map<peerId, blob[]>
    locationsById,
    frameIndex = null,
    localLiveFrames = null,
    remoteLiveFrames = null,
    sessionMode = 'duo'
  }) => {
    const isLiveRender = frameIndex !== null;
    const isLiveMode = sessionMode === 'live';
    const key = isLiveRender ? `${mergeKey(count)}|live|${frameIndex}` : mergeKey(count);

    if (mergeCacheRef.current.has(key)) {
      const cached = mergeCacheRef.current.get(key);
      if (!isLiveRender) {
        setMergedImage(cached);
        setLastMergeCount(count);
      }
      return cached;
    }

    if (!isLiveRender) {
      setIsMerging(true);
    }
    try {
      // ═══ TEMPLATE MODE: Render using CMS template slots ═══
      if (activeTemplate && activeTemplate.slots && activeTemplate.slots.length > 0) {
        const tpl = activeTemplate;
        const canvas = document.createElement('canvas');
        canvas.width = tpl.canvas_width;
        canvas.height = tpl.canvas_height;
        const ctx = canvas.getContext('2d');

        // Extract metadata and active decorations
        let loadedDecos = tpl.decorations || [];
        let backgroundZIndex = 10;
        let overlayZIndex = 90;
        const metaBlock = loadedDecos.find(d => d.id === 'meta-zindexes');
        if (metaBlock) {
          backgroundZIndex = metaBlock.backgroundZIndex ?? 10;
          overlayZIndex = metaBlock.overlayZIndex ?? 90;
          loadedDecos = loadedDecos.filter(d => d.id !== 'meta-zindexes');
        }

        // Collect all available blobs (flatten local + remote by participant)
        const sorted = [...participants].sort((a, b) => a.id.localeCompare(b.id));
        const allBlobs = [];
        for (let i = 0; i < count; i++) {
          for (const p of sorted) {
            let blob;
            if (isLiveRender) {
              if (p.isYou) {
                const liveBurst = localLiveFrames?.find(entry => entry[0] === i)?.[1];
                blob = liveBurst?.[frameIndex];
              } else {
                const peerLiveMap = remoteLiveFrames?.get(p.id);
                const liveBurst = peerLiveMap?.get(i);
                blob = liveBurst?.[frameIndex];
              }
            }
            if (!blob) {
              const blobs = p.isYou ? localBlobs : (remoteBlobsByPeer.get(p.id) || []);
              blob = blobs[i];
            }
            if (blob) allBlobs.push(blob);
          }
        }

        // Gather all unified renderable layers
        const renderLayers = [];

        // 1. Solid Background
        renderLayers.push({
          type: 'background',
          zIndex: backgroundZIndex,
          draw: async () => {
            ctx.fillStyle = tpl.background_color || frameColor || '#1a1a2e';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        });

        // 2. Slots (Photos)
        tpl.slots.forEach((slot, si) => {
          const blob = allBlobs[si];
          renderLayers.push({
            type: 'slot',
            zIndex: slot.zIndex ?? 20,
            draw: async () => {
              if (!blob) return;
              const img = await blobToImage(blob);
              ctx.save();
              if (slot.rotation) {
                ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
                ctx.rotate((slot.rotation * Math.PI) / 180);
                ctx.translate(-(slot.x + slot.width / 2), -(slot.y + slot.height / 2));
              }
              
              const shape = slot.shape || 'rect';
              if (shape === 'oval') {
                ctx.beginPath();
                ctx.ellipse(slot.x + slot.width / 2, slot.y + slot.height / 2, slot.width / 2, slot.height / 2, 0, 0, 2 * Math.PI);
                ctx.clip();
              } else if (SHAPE_PATHS[shape]) {
                const p = new Path2D(SHAPE_PATHS[shape]);
                ctx.save();
                ctx.translate(slot.x, slot.y);
                ctx.scale(slot.width / 100, slot.height / 100);
                ctx.clip(p);
                const imgRatio = img.width / img.height;
                const targetRatio = slot.width / slot.height;
                let sw, sh, sx, sy;
                if (imgRatio > targetRatio) {
                  sh = img.height; sw = sh * targetRatio; sx = (img.width - sw) / 2; sy = 0;
                } else {
                  sw = img.width; sh = sw / targetRatio; sx = 0; sy = (img.height - sh) / 2;
                }
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 100, 100);
                ctx.restore();
                ctx.restore();
                return;
              } else if (shape === 'rounded' || (shape === 'rect' && slot.borderRadius)) {
                ctx.beginPath();
                ctx.roundRect(slot.x, slot.y, slot.width, slot.height, slot.borderRadius || 24);
                ctx.clip();
              } else {
                ctx.beginPath();
                ctx.rect(slot.x, slot.y, slot.width, slot.height);
                ctx.clip();
              }

              const imgRatio = img.width / img.height;
              const targetRatio = slot.width / slot.height;
              let sw, sh, sx, sy;
              if (imgRatio > targetRatio) {
                sh = img.height; sw = sh * targetRatio; sx = (img.width - sw) / 2; sy = 0;
              } else {
                sw = img.width; sh = sw / targetRatio; sx = 0; sy = (img.height - sh) / 2;
              }
              ctx.drawImage(img, sx, sy, sw, sh, slot.x, slot.y, slot.width, slot.height);

              if (photoFilter !== 'none') {
                try {
                  const imgData = ctx.getImageData(slot.x, slot.y, slot.width, slot.height);
                  const data = imgData.data;
                  const len = data.length;
                  if (photoFilter === 'bw') {
                    for (let i = 0; i < len; i += 4) {
                      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                      data[i] = gray; data[i + 1] = gray; data[i + 2] = gray;
                    }
                  } else if (photoFilter === 'sepia') {
                    for (let i = 0; i < len; i += 4) {
                      const r = data[i], g = data[i + 1], b = data[i + 2];
                      data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                      data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                      data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                    }
                  }
                  ctx.putImageData(imgData, slot.x, slot.y);
                } catch (e) { /* filter failed */ }
              }
              ctx.restore();
            }
          });
        });

        // 3. Overlay Frame (PNG)
        if (tpl.overlay_url) {
          renderLayers.push({
            type: 'overlay',
            zIndex: overlayZIndex,
            draw: async () => {
              const API_BASE = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
              let overlayUrl = tpl.overlay_url;
              if (!overlayUrl.startsWith('http')) {
                overlayUrl = `${API_BASE.replace(/\/$/, '')}${overlayUrl.startsWith('/') ? overlayUrl : '/' + overlayUrl}`;
              }
              const overlayImg = await loadImage(overlayUrl);
              if (overlayImg) ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
            }
          });
        }

        // 4. Texts
        const tplTexts = tpl.text_elements || [];
        tplTexts.forEach(te => {
          renderLayers.push({
            type: 'text',
            zIndex: te.zIndex ?? 100,
            draw: async () => {
              ctx.save();
              ctx.fillStyle = te.color || '#ffffff';
              ctx.font = `700 ${te.fontSize || 32}px ${te.fontFamily || frameFont}`;
              ctx.textAlign = te.textAlign || 'center';
              ctx.textBaseline = 'middle';

              let content = te.content || '';
              content = content.replace('{{name}}', locTextLeft || sorted[0]?.displayName || '');
              const dateStr = showWeather && weatherText ? `${frameDate} (${weatherText})` : frameDate;
              content = content.replace('{{date}}', dateStr);
              content = content.replace('{{location}}', locTextLeft || '');

              const textY = te.y >= 0 ? te.y : canvas.height + te.y;
              ctx.fillText(content, te.x, textY);
              ctx.restore();
            }
          });
        });

        // 5. Decorations (Stickers)
        loadedDecos.forEach(deco => {
          if (!deco.src) return;
          renderLayers.push({
            type: 'deco',
            zIndex: deco.zIndex ?? 110,
            draw: async () => {
              ctx.save();
              const centerX = deco.x + deco.width / 2;
              const centerY = deco.y + deco.height / 2;
              ctx.translate(centerX, centerY);
              
              if (deco.rotation) ctx.rotate((deco.rotation * Math.PI) / 180);
              if (deco.opacity !== undefined) ctx.globalAlpha = deco.opacity;
              
              let decoUrl = deco.src;
              if (decoUrl && !decoUrl.startsWith('http') && !decoUrl.startsWith('data:')) {
                const API_BASE = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
                decoUrl = `${API_BASE.replace(/\/$/, '')}${decoUrl.startsWith('/') ? decoUrl : '/' + decoUrl}`;
              }
              
              const decoImg = await loadImage(decoUrl);
              if (decoImg) {
                ctx.drawImage(decoImg, -deco.width / 2, -deco.height / 2, deco.width, deco.height);
              }
              ctx.restore();
            }
          });
        });

        // Sort all layers ascending by zIndex
        renderLayers.sort((a, b) => a.zIndex - b.zIndex);

        // Draw sequentially in ascending z-index order
        for (const layer of renderLayers) {
          await layer.draw();
        }

        // Draw dynamic session stickers (always drawn last on top of everything)
        stickers.forEach(s => {
          ctx.save();
          ctx.translate(s.x * canvas.width, s.y * canvas.height);
          ctx.rotate(s.rotation);
          ctx.font = `${Math.round(s.size * canvas.width)}px Quicksand, system-ui, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(s.text, 0, 0);
          ctx.restore();
        });

        const dataUrl = canvas.toDataURL('image/jpeg', isLiveRender ? 0.75 : 0.85);
        mergeCacheRef.current.set(key, dataUrl);
        if (!isLiveRender) {
          setMergedImage(dataUrl);
          setLastMergeCount(count);
        }
        return dataUrl;
      }

      // ═══ LEGACY MODE: Original strip/grid rendering ═══
      const activeFrameColor = (frameColor || '#9b87f5').trim();
      const activeTextColor = (frameTextColor || '#FFFFFF').trim();

      const isPortrait = orientation === 'portrait';
      const baseCellW = isPortrait ? FRAME_CANVAS.cellW : FRAME_CANVAS.cellH;
      const baseCellH = isPortrait ? FRAME_CANVAS.cellH : FRAME_CANVAS.cellW;
      const gap = FRAME_CANVAS.gap;
      const headerH = FRAME_CANVAS.headerH;
      const footerH = FRAME_CANVAS.footerH;

      // Sort participants by ID to ensure consistent order across all peers
      const sorted = [...participants].sort((a, b) => a.id.localeCompare(b.id));
      const participantCount = sorted.length;
      const photoColumns = participantCount;
      const isStack = photoColumns === 3;
      const isQuad2x2 = photoColumns === 4;
      const isGrid = frameLayout === 'grid' && count > 1 && (photoColumns === 1 || photoColumns === 2);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 1. TENTUKAN TOTAL WIDTH DULU BERDASARKAN JUMLAH KOLOM
      let totalW, totalRows;
      const cellW = baseCellW; // Lebar fix

      if (isStack) {
        totalW = cellW + (2 * gap);
        totalRows = count * 3;
      } else if (isQuad2x2) {
        totalW = (cellW * 2) + (gap * 3);
        totalRows = count * 2;
      } else if (isGrid) {
        const cols = photoColumns * 2;
        totalW = (cellW * cols) + (gap * (cols + 1));
        totalRows = Math.ceil(count / 2);
      } else {
        totalW = (cellW * photoColumns) + (gap * (photoColumns + 1));
        totalRows = count;
      }

      // 2. DYNAMIC RATIO FITTING (LUMABOOTH / DSLRBOOTH STYLE)
      // Hitung target aspect ratio berdasarkan layout terpilih agar FIT di kertas
      let targetRatio; 
      if (isGrid) {
        // Target 4R format
        targetRatio = isPortrait ? (4 / 6) : (6 / 4); 
      } else {
        // Target photobooth strip format
        targetRatio = isPortrait ? (1 / 3) : (3 / 1);
      }

      // Kunci totalH berdasarkan rasio ideal tersebut
      let totalH = Math.floor(totalW / targetRatio);

      // 3. HITUNG TINGGI FOTO DINAMIS (CELL HEIGHT)
      const staticHeightUsed = headerH + footerH + (gap * (totalRows + 1));
      let cellH = Math.floor((totalH - staticHeightUsed) / totalRows);

      // Safety fallback jika foto jadi sangat gepeng (jika ada bug / settingan aneh)
      if (cellH < (cellW * 0.4)) {
        cellH = Math.floor(cellW * 0.4);
        totalH = (cellH * totalRows) + staticHeightUsed; // Recalc height jika overflow
      } else if (cellH > (cellW * 1.8)) {
        // Safety fallback jika foto terlalu tinggi jenjang
        cellH = Math.floor(cellW * 1.6);
        totalH = (cellH * totalRows) + staticHeightUsed; 
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
        if (showWeather && weatherText) {
          ctx.save();
          ctx.font = `700 24px ${frameFont}`;
          ctx.fillText(weatherText, totalW / 2, totalH - Math.round(footerH * 0.42));
          ctx.restore();
        }
        ctx.font = `700 32px ${frameFont}`;
        ctx.fillText('LDRPhotobooth', totalW / 2, totalH - Math.round(footerH * 0.28));
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
        for (let j = 0; j < photoColumns; j++) {
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
            const colIdx = (shotCol * photoColumns) + j;
            const rowIdx = shotRow;
            colX = gap + colIdx * (cellW + gap);
            rowY = headerH + gap + rowIdx * (cellH + gap);
          } else {
            colX = gap + (j * (cellW + gap));
            rowY = headerH + gap + (i * (cellH + gap));
          }
          
          let blob;
          if (isLiveRender) {
            if (participant.isYou) {
              const liveBurst = localLiveFrames?.find(entry => entry[0] === i)?.[1];
              blob = liveBurst?.[frameIndex];
            } else {
              const peerLiveMap = remoteLiveFrames?.get(participant.id);
              const liveBurst = peerLiveMap?.get(i);
              blob = liveBurst?.[frameIndex];
            }
          }
          if (!blob) {
            const blobs = participant.isYou ? localBlobs : (remoteBlobsByPeer.get(participant.id) || []);
            blob = blobs[i];
          }

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

      const dataUrl = canvas.toDataURL('image/jpeg', isLiveRender ? 0.75 : 0.85);
      mergeCacheRef.current.set(key, dataUrl);
      if (!isLiveRender) {
        setMergedImage(dataUrl);
        setLastMergeCount(count);
      }
      return dataUrl;
    } finally {
      if (!isLiveRender) {
        setIsMerging(false);
      }
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
    frameGlare,
    activeTemplate
  ]);



  return {
    mergedImage,
    setMergedImage,
    isMerging,
    setIsMerging,
    mergePhotos,
    lastMergeCount
  };
}
