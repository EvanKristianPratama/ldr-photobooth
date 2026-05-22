import { useCallback } from 'react';
import { useFrameState } from './useFrameState';
import { useFrameFetch } from './useFrameFetch';
import { useFrameRenderer } from './useFrameRenderer';
import { DEFAULT_FRAME_SRC } from '../constants/layout';

export default function useFrame({ participants, locationsById = {} }) {
  // 1. Core State
  const frameState = useFrameState();
  const {
    frameMode, setFrameMode,
    framePresetId, setFramePresetId,
    frameSrc, setFrameSrc,
    frameName, setFrameName,
    frameError, setFrameError,
    showFrameText, setShowFrameText,
    frameColor, setFrameColor,
    frameTextColor, setFrameTextColor,
    locTextLeft, setLocTextLeft,
    locTextRight, setLocTextRight,
    locTextEdited, setLocTextEdited,
    photoFilter, setPhotoFilter,
    sessionSeed, setSessionSeed,
    stickers, setStickers,
    orientation, setOrientation,
    frameFont, setFrameFont,
    frameLayout, setFrameLayout,
    frameDate, setFrameDate,
    frameNoise, setFrameNoise,
    frameGlare, setFrameGlare,
    activeTemplate, setActiveTemplate,
    showWeather, setShowWeather,
    weatherText, setWeatherText,
    addSticker, removeSticker, updateSticker, clearStickers
  } = frameState;

  // 2. Fetch logic
  const { communityPresets, cmsTemplates, framePresets } = useFrameFetch({
    frameName, frameMode, frameSrc
  });

  // 3. Render logic
  const {
    mergedImage, setMergedImage,
    isMerging, setIsMerging,
    mergePhotos, lastMergeCount
  } = useFrameRenderer({
    frameState,
    participants,
    locationsById
  });

  // 4. Controller actions (previously in useFrame directly)
  const addRandomSticker = useCallback(() => {
    const emojis = ['✨', '💖', '⭐', '🎈', '🍀', '🎀', '🍭', '🌸', '🌈', '🍦', '🍩', '🦋', '🐱', '🐶', '🦄', '🍎', '🍓', '🍕', '🍔', '🍟'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    addSticker(emoji);
  }, [addSticker]);

  const handleFrameUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
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

        const compressedDataUrl = canvas.toDataURL('image/png');
        setFrameSrc(compressedDataUrl);
        setFrameName(file.name);
        setFrameMode('custom');
        setFramePresetId('upload');
        setFrameError('');
        // We can't clear mergeCacheRef from here directly, but bumpSessionSeed does it.
        bumpSessionSeed();
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

    if (preset.mode === 'template' && preset.template) {
      setFrameMode('template');
      setActiveTemplate(preset.template);
      setFrameError('');
      bumpSessionSeed();
      return;
    }

    setActiveTemplate(null);

    if (preset.mode === 'default') {
      setFrameMode('default');
      setFrameError('');
      bumpSessionSeed();
      return;
    }

    setFrameMode('custom');
    if (preset.src) setFrameSrc(preset.src);
    if (preset.id !== 'upload') setFrameName('');
    setFrameError('');
    bumpSessionSeed();
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
    setIsMerging(false);
    setActiveTemplate(null);
    bumpSessionSeed();
  };

  const bumpSessionSeed = () => {
    setSessionSeed((prev) => prev + 1);
  };

  const getDefaultFrameNames = useCallback(() => {
    const sorted = [...participants];
    const userA = (sorted[0]?.displayName || '').trim();
    const userB = (sorted[1]?.displayName || '').trim();
    return { left: userA || '', right: userB || '' };
  }, [participants]);

  return {
    frameMode, setFrameMode,
    framePresetId, setFramePresetId,
    frameSrc, setFrameSrc,
    frameName, setFrameName,
    frameError, setFrameError,
    showFrameText, setShowFrameText,
    frameColor, setFrameColor,
    frameTextColor, setFrameTextColor,
    locTextLeft, setLocTextLeft,
    locTextRight, setLocTextRight,
    setLocTextEdited,
    photoFilter, setPhotoFilter,
    mergedImage, setMergedImage,
    isMerging,
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
    orientation, setOrientation,
    frameFont, setFrameFont,
    frameLayout, setFrameLayout,
    frameDate, setFrameDate,
    frameNoise, setFrameNoise,
    frameGlare, setFrameGlare,
    activeTemplate,
    showWeather, setShowWeather,
    weatherText, setWeatherText,
    cmsTemplates,
    framePresets,
    communityPresets,
    lastMergeCount
  };
}
