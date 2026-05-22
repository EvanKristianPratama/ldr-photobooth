import { useState, useCallback } from 'react';
import { DEFAULT_FRAME_SRC } from '../constants/layout';

export function useFrameState() {
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
  const [sessionSeed, setSessionSeed] = useState(0);
  const [stickers, setStickers] = useState([]);
  const [orientation, setOrientation] = useState('portrait');
  const [frameFont, setFrameFont] = useState("'Quicksand', sans-serif");
  const [frameLayout, setFrameLayout] = useState('strip'); // 'strip' or 'grid'
  const [frameDate, setFrameDate] = useState(new Date().toLocaleDateString());
  const [frameNoise, setFrameNoise] = useState(0); // 0 to 100
  const [frameGlare, setFrameGlare] = useState('none'); // 'none', 'warm', 'retro'
  const [activeTemplate, setActiveTemplate] = useState(null); // CMS template mode
  const [showWeather, setShowWeather] = useState(true);
  const [weatherText, setWeatherText] = useState('');

  const addSticker = useCallback((emoji) => {
    setStickers(prev => [...prev, { id: crypto.randomUUID(), emoji, x: 200, y: 200, scale: 2, rotation: 0 }]);
  }, []);

  const removeSticker = useCallback((id) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateSticker = useCallback((id, updates) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const clearStickers = useCallback(() => setStickers([]), []);

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
  };
}
