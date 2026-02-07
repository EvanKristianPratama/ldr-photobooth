import { useCallback, useMemo, useRef, useState } from 'react';
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
  const [mergedImage, setMergedImage] = useState(null);
  const [lastMergeCount, setLastMergeCount] = useState(0);
  const [isMerging, setIsMerging] = useState(false);
  const [sessionSeed, setSessionSeed] = useState(0);
  const mergeCacheRef = useRef(new Map());

  const framePresets = useMemo(() => {
    const basePresets = FRAME_PRESETS;
    if (frameName || (frameMode === 'custom' && frameSrc && frameSrc !== DEFAULT_FRAME_SRC)) {
      const customPreset = {
        id: 'upload',
        label: frameName ? `Upload: ${frameName}` : 'Custom Frame',
        mode: 'custom',
        src: frameSrc,
        description: 'Frame pilihanmu'
      };
      return [basePresets[0], customPreset, ...basePresets.slice(1)];
    }
    return basePresets;
  }, [frameName, frameMode, frameSrc]);

  const getDefaultFrameNames = useCallback(() => {
    const sorted = [...participants].sort((a, b) => (a?.id || '').localeCompare(b?.id || ''));
    const userA = (sorted[0]?.displayName || '').trim();
    const userB = (sorted[1]?.displayName || '').trim();
    return { left: userB || '', right: userA || '' };
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
      locTextRight
    ].join('|');
  }, [sessionSeed, frameMode, framePresetId, frameSrc, showFrameText, frameColor, frameTextColor, locTextLeft, locTextRight]);

  const mergePhotos = useCallback(async ({
    count,
    participants,
    localBlobs,
    remoteBlobs,
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
      const { cellW, cellH, gap, headerH, footerH } = FRAME_CANVAS;
      const { left: defaultLeft, right: defaultRight } = getDefaultFrameNames();
      const leftName = (defaultLeft || '').trim();
      const rightName = (defaultRight || '').trim();
      const activeFrameColor = (frameColor || '#9b87f5').trim();
      const activeTextColor = (frameTextColor || '#FFFFFF').trim();

      const sorted = [...participants].sort((a, b) => (a?.id || '').localeCompare(b?.id || ''));
      const userAId = sorted[0]?.id;
      const userBId = sorted[1]?.id;
      const leftId = userBId || sorted[0]?.id;
      const rightId = userAId || sorted[1]?.id;

      let leftTextToDraw = locTextLeft;
      let rightTextToDraw = locTextRight;

      if (!locTextEdited && (!locTextLeft && !locTextRight)) {
        const autoLeft = getAutoLocationString(leftId, locationsById);
        const autoRight = getAutoLocationString(rightId, locationsById);
        leftTextToDraw = autoLeft;
        rightTextToDraw = autoRight;
        setLocTextLeft(autoLeft);
        setLocTextRight(autoRight);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const totalW = (cellW * 2) + (gap * 3);
      const totalH = (cellH * count) + (gap * (count + 1)) + headerH + footerH;

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

      const myId = participants?.find(p => p.isYou)?.id;
      const myIndex = sorted.findIndex(p => p.id === myId);
      const isUserA = myIndex === 0;

      const drawHeaderFooter = () => {
        if (!showFrameText) return;
        ctx.save();
        ctx.fillStyle = activeTextColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.textBaseline = 'middle';

        const headerY1 = Math.round(headerH * 0.45);
        const headerY2 = Math.round(headerH * 0.78);

        ctx.textAlign = 'left';
        ctx.font = '800 44px Quicksand, system-ui, -apple-system, sans-serif';
        if (leftName) ctx.fillText(leftName, gap, headerY1);
        ctx.font = '700 34px Quicksand, system-ui, -apple-system, sans-serif';
        if (leftTextToDraw) ctx.fillText(leftTextToDraw, gap, headerY2);

        ctx.textAlign = 'right';
        ctx.font = '800 44px Quicksand, system-ui, -apple-system, sans-serif';
        if (rightName) ctx.fillText(rightName, totalW - gap, headerY1);
        ctx.font = '700 34px Quicksand, system-ui, -apple-system, sans-serif';
        if (rightTextToDraw) ctx.fillText(rightTextToDraw, totalW - gap, headerY2);
        ctx.restore();

        ctx.fillStyle = activeTextColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.font = '800 52px Quicksand, system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(new Date().toLocaleDateString(), gap, totalH - Math.round(footerH * 0.4));

        ctx.textAlign = 'right';
        ctx.fillText('Ldr-Photobooth', totalW - gap, totalH - Math.round(footerH * 0.4));
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

      for (let i = 0; i < count; i++) {
        const localB = localBlobs[i];
        const remoteB = remoteBlobs[i];
        const localImg = await blobToImage(localB);
        const remoteImg = remoteB ? await blobToImage(remoteB) : localImg;

        const rowY = headerH + gap + (i * (cellH + gap));

        if (isUserA) {
          ctx.drawImage(remoteImg, gap, rowY, cellW, cellH);
          ctx.drawImage(localImg, gap * 2 + cellW, rowY, cellW, cellH);
        } else {
          ctx.drawImage(localImg, gap, rowY, cellW, cellH);
          ctx.drawImage(remoteImg, gap * 2 + cellW, rowY, cellW, cellH);
        }
      }

      drawHeaderFooter();

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
    frameColor,
    frameTextColor,
    locTextLeft,
    locTextRight,
    locTextEdited,
    getDefaultFrameNames,
    getAutoLocationString,
    mergeKey
  ]);

  const handleFrameUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFrameSrc(reader.result);
      setFrameName(file.name);
      setFrameMode('custom');
      setFramePresetId('upload');
      setFrameError('');
      mergeCacheRef.current.clear();
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
    framePresets,
    mergePhotos,
    handleFrameUpload,
    selectFramePreset,
    getDefaultFrameNames,
    resetFrame,
    bumpSessionSeed
  };
}
