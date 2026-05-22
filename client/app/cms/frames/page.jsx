'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import FrameCanvas from './components/FrameCanvas';
import SlotEditor from './components/SlotEditor';
import TextElementEditor from './components/TextElementEditor';
import DecorationEditor from './components/DecorationEditor';
import ToolBar from './components/ToolBar';
import FrameList from './components/FrameList';
import LayerList from './components/LayerList';
import { UndoIcon, RedoIcon, ArrowLeftIcon } from './components/icons';
import './cms-frames.css';

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev')
  : '';

const DEFAULT_CANVAS = { width: 580, height: 1740 };
const MAX_HISTORY = 50;
const MAX_SLOTS = 4;

// ── Factory Functions ──

function createSlot(index, canvasW, canvasH, frameMode = 'solo', existingSlots = []) {
  let slotW, slotH, x, y;

  if (existingSlots?.length > 0) {
    const last = existingSlots[existingSlots.length - 1];
    slotW = last.width;
    slotH = last.height;
    x = Math.min(canvasW - slotW, Math.max(0, last.x + 40));
    y = Math.min(canvasH - slotH, Math.max(0, last.y + 40));
  } else {
    slotW = Math.round(canvasW * 0.86);
    slotH = Math.round(slotW * 1.5);
    if (slotH > canvasH * 0.8) {
      slotH = Math.round(canvasH * 0.8);
      slotW = Math.round(slotH / 1.5);
    }
    x = Math.round((canvasW - slotW) / 2);
    const gap = 40, headerH = 150;
    y = headerH + gap + index * (slotH + gap);
    if (y + slotH > canvasH) y = Math.round((canvasH - slotH) / 2);
  }

  const owner = frameMode === 'duo' ? (index % 2 === 0 ? 'userA' : 'userB') : 'any';
  
  return {
    id: `slot-${Date.now()}-${index}`,
    x, y, width: slotW, height: slotH,
    rotation: 0, zIndex: index + 1, borderRadius: 0,
    label: `Photo ${index + 1}`,
    aspectRatioLocked: false,
    owner,
  };
}

function createTextElement(index, canvasW, canvasH) {
  return {
    id: `text-${Date.now()}-${index}`,
    type: 'custom',
    x: Math.round(canvasW / 2),
    y: 70 + index * 50,
    fontSize: 32,
    fontFamily: "'Quicksand', sans-serif",
    color: '#ffffff',
    textAlign: 'center',
    content: 'New Text'
  };
}

const DEFAULT_TEXT_ELEMENTS = [
  {
    id: 'text-header', type: 'name',
    x: 290, y: 70, fontSize: 36,
    fontFamily: "'Quicksand', sans-serif",
    color: '#ffffff', textAlign: 'center', content: '{{name}}'
  },
  {
    id: 'text-date', type: 'date',
    x: 290, y: -80, fontSize: 28,
    fontFamily: "'Quicksand', sans-serif",
    color: '#ffffff', textAlign: 'center', content: '{{date}}'
  }
];

// ── Thumbnail Capture via html2canvas ──

async function captureCanvasThumb(canvasRef) {
  const el = canvasRef?.current?.getCanvasElement?.();
  if (!el) return null;
  try {
    const canvas = await html2canvas(el, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: 0.5, // downscale for smaller thumbnail
    });
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob || null), 'image/png');
    });
  } catch (err) {
    console.error('Thumbnail capture error:', err);
    return null;
  }
}

// ── Z-Index Normalization for Unified Stacking ──
function normalizeZIndexes(slots, texts, decos, bgZ = null, overlayZ = null) {
  const sortedSlots = [...slots].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const sortedDecos = [...decos]
    .filter(d => d.id !== 'meta-zindexes')
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const sortedTexts = [...texts].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  let items = [];
  items.push({ type: 'background', ref: null, currentZ: bgZ ?? 10 });
  sortedSlots.forEach(s => items.push({ type: 'slot', ref: s, currentZ: s.zIndex ?? 20 }));
  items.push({ type: 'overlay', ref: null, currentZ: overlayZ ?? 90 });
  sortedTexts.forEach(t => items.push({ type: 'text', ref: t, currentZ: t.zIndex ?? 100 }));
  sortedDecos.forEach(d => items.push({ type: 'deco', ref: d, currentZ: d.zIndex ?? 110 }));

  items.sort((a, b) => a.currentZ - b.currentZ);

  let finalBgZ = 10;
  let finalOverlayZ = 90;

  items.forEach((item, idx) => {
    const newZ = (idx + 1) * 10;
    if (item.type === 'slot') item.ref.zIndex = newZ;
    else if (item.type === 'text') item.ref.zIndex = newZ;
    else if (item.type === 'deco') item.ref.zIndex = newZ;
    else if (item.type === 'background') finalBgZ = newZ;
    else if (item.type === 'overlay') finalOverlayZ = newZ;
  });

  return {
    slots: sortedSlots,
    texts: sortedTexts,
    decos: sortedDecos,
    backgroundZIndex: finalBgZ,
    overlayZIndex: finalOverlayZ
  };
}

// ── Main Component ──

export default function CmsFramesPage() {
  // View state
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  // Template list
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [templateName, setTemplateName] = useState('');
  const [author, setAuthor] = useState('Admin');
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS.width);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS.height);
  const [orientation, setOrientation] = useState('portrait');
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e');
  const [backgroundZIndex, setBackgroundZIndex] = useState(10);
  const [overlayZIndex, setOverlayZIndex] = useState(90);
  const [frameMode, setFrameMode] = useState('solo');
  const [slots, setSlots] = useState([]);
  const [textElements, setTextElements] = useState(DEFAULT_TEXT_ELEMENTS);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [overlayFile, setOverlayFile] = useState(null);
  const [overlayPreview, setOverlayPreview] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [category, setCategory] = useState('klasik');
  const [showDummy, setShowDummy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [zoom, setZoom] = useState(0.45);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Decorations
  const [decorations, setDecorations] = useState([]);
  const [selectedDecoId, setSelectedDecoId] = useState(null);

  // Canvas ref for thumbnail capture
  const canvasRef = useRef(null);

  // ── UNDO / REDO ──
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const getEditorSnapshot = useCallback(() => ({
    slots: JSON.parse(JSON.stringify(slots)),
    textElements: JSON.parse(JSON.stringify(textElements)),
    decorations: JSON.parse(JSON.stringify(decorations)),
    backgroundZIndex,
    overlayZIndex,
  }), [slots, textElements, decorations, backgroundZIndex, overlayZIndex]);

  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) return;
    const snap = getEditorSnapshot();
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIdxRef.current = historyRef.current.length - 1;
  }, [getEditorSnapshot]);

  const applySnapshot = useCallback((snap) => {
    skipHistoryRef.current = true;
    setSlots(snap.slots);
    setTextElements(snap.textElements);
    setDecorations(snap.decorations || []);
    setBackgroundZIndex(snap.backgroundZIndex ?? 10);
    setOverlayZIndex(snap.overlayZIndex ?? 90);
    setTimeout(() => { skipHistoryRef.current = false; }, 0);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    applySnapshot(historyRef.current[historyIdxRef.current]);
  }, [applySnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    applySnapshot(historyRef.current[historyIdxRef.current]);
  }, [applySnapshot]);

  const handleDragEnd = useCallback(() => { pushHistory(); }, [pushHistory]);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const onKey = (e) => {
      if (view !== 'editor') return;
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (isMod && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); }
      if (isMod && e.key === 'y') { e.preventDefault(); handleRedo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        if (selectedSlotId) {
          setSlots(prev => prev.filter(s => s.id !== selectedSlotId));
          setSelectedSlotId(null); pushHistory();
        } else if (selectedTextId) {
          setTextElements(prev => prev.filter(t => t.id !== selectedTextId));
          setSelectedTextId(null); pushHistory();
        } else if (selectedDecoId) {
          setDecorations(prev => prev.filter(d => d.id !== selectedDecoId));
          setSelectedDecoId(null); pushHistory();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, selectedSlotId, selectedTextId, selectedDecoId, handleUndo, handleRedo, pushHistory]);

  // ── Fetch Templates ──
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cms/frames?published=0`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── Selection Logic ──
  const handleSelectSlot = useCallback((id) => {
    setSelectedSlotId(id);
    if (id) { setSelectedTextId(null); setSelectedDecoId(null); }
  }, []);

  const handleSelectText = useCallback((id) => {
    setSelectedTextId(id);
    if (id) { setSelectedSlotId(null); setSelectedDecoId(null); }
  }, []);

  const handleSelectDeco = useCallback((id) => {
    setSelectedDecoId(id);
    if (id) { setSelectedSlotId(null); setSelectedTextId(null); }
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedSlotId(null);
    setSelectedTextId(null);
    setSelectedDecoId(null);
  }, []);

  // ── Generic Layer Update Dispatch ──
  const getLayerUpdater = useCallback((type) => {
    if (type === 'slot') return (id, updates) => setSlots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (type === 'text') return (id, updates) => setTextElements(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (type === 'deco') return (id, updates) => setDecorations(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    return () => {};
  }, []);

  const handleUpdateSlot = useCallback((slotId, updates) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...updates } : s));
  }, []);

  const handleUpdateText = useCallback((textId, updates) => {
    setTextElements(prev => prev.map(t => t.id === textId ? { ...t, ...updates } : t));
  }, []);

  const handleUpdateDeco = useCallback((decoId, updates) => {
    setDecorations(prev => prev.map(d => d.id === decoId ? { ...d, ...updates } : d));
  }, []);

  // ── Create / Edit / Delete Template ──
  const initHistory = (initSlots, initTexts, initDecos = [], initBgZ = 10, initOverlayZ = 90) => {
    historyRef.current = [{
      slots: initSlots,
      textElements: initTexts,
      decorations: initDecos,
      backgroundZIndex: initBgZ,
      overlayZIndex: initOverlayZ
    }];
    historyIdxRef.current = 0;
  };

  const handleNew = () => {
    setEditingId(null);
    setTemplateName(''); setAuthor('Admin');
    setCanvasWidth(DEFAULT_CANVAS.width); setCanvasHeight(DEFAULT_CANVAS.height);
    setOrientation('portrait'); setBackgroundColor('#1a1a2e'); setFrameMode('solo');
    const initSlots = [createSlot(0, DEFAULT_CANVAS.width, DEFAULT_CANVAS.height, 'solo')];
    const initTexts = [...DEFAULT_TEXT_ELEMENTS];
    
    // Normalize z-indexes for fresh canvas
    const normalized = normalizeZIndexes(initSlots, initTexts, [], 10, 90);
    setSlots(normalized.slots);
    setTextElements(normalized.texts);
    setDecorations(normalized.decos);
    setBackgroundZIndex(normalized.backgroundZIndex);
    setOverlayZIndex(normalized.overlayZIndex);

    handleDeselectAll();
    setOverlayFile(null); setOverlayPreview(null);
    setIsPublished(false); setCategory('klasik');
    setShowDummy(true); setSaveMsg('');
    setView('editor');
    initHistory(normalized.slots, normalized.texts, normalized.decos, normalized.backgroundZIndex, normalized.overlayZIndex);
  };

  const handleEdit = (template) => {
    setEditingId(template.id);
    setTemplateName(template.name); setAuthor(template.author);
    setCanvasWidth(template.canvas_width); setCanvasHeight(template.canvas_height);
    setOrientation(template.orientation || 'portrait');
    setBackgroundColor(template.background_color || '#1a1a2e');
    setFrameMode(template.frame_mode || 'solo');
    
    const loadedSlots = (template.slots || []).map(s => ({ ...s, aspectRatioLocked: s.aspectRatioLocked || false, owner: s.owner || 'any' }));
    const loadedTexts = template.text_elements || [];
    let loadedDecos = template.decorations || [];
    
    // Parse meta-zindexes metadata block
    let bgZ = 10;
    let overlayZ = 90;
    const metaBlock = loadedDecos.find(d => d.id === 'meta-zindexes');
    if (metaBlock) {
      bgZ = metaBlock.backgroundZIndex ?? 10;
      overlayZ = metaBlock.overlayZIndex ?? 90;
      loadedDecos = loadedDecos.filter(d => d.id !== 'meta-zindexes');
    }

    // Normalize loaded template elements
    const normalized = normalizeZIndexes(loadedSlots, loadedTexts, loadedDecos, bgZ, overlayZ);
    setSlots(normalized.slots);
    setTextElements(normalized.texts);
    setDecorations(normalized.decos);
    setBackgroundZIndex(normalized.backgroundZIndex);
    setOverlayZIndex(normalized.overlayZIndex);

    handleDeselectAll();
    setOverlayFile(null);
    setOverlayPreview(template.overlay_url ? `${API_BASE}${template.overlay_url}` : null);
    setIsPublished(!!template.is_published);
    setCategory(template.category || 'klasik');
    setShowDummy(true); setSaveMsg('');
    setView('editor');
    initHistory(normalized.slots, normalized.texts, normalized.decos, normalized.backgroundZIndex, normalized.overlayZIndex);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus template ini?')) return;
    try {
      await fetch(`${API_BASE}/api/cms/frames/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getMaxZ = useCallback(() => {
    let max = 0;
    slots.forEach(s => { if ((s.zIndex ?? 0) > max) max = s.zIndex; });
    textElements.forEach(t => { if ((t.zIndex ?? 0) > max) max = t.zIndex; });
    decorations.forEach(d => { if ((d.zIndex ?? 0) > max) max = d.zIndex; });
    if (backgroundZIndex > max) max = backgroundZIndex;
    if (overlayZIndex > max) max = overlayZIndex;
    return max;
  }, [slots, textElements, decorations, backgroundZIndex, overlayZIndex]);

  // ── Slot CRUD ──
  const handleAddSlot = () => {
    if (slots.length >= MAX_SLOTS) { setSaveMsg(`⚠️ Maksimal ${MAX_SLOTS} photo slot`); return; }
    const newSlot = createSlot(slots.length, canvasWidth, canvasHeight, frameMode, slots);
    newSlot.zIndex = getMaxZ() + 10;
    setSlots(prev => [...prev, newSlot]);
    handleSelectSlot(newSlot.id);
    pushHistory();
  };

  const handleRemoveSlot = (slotId) => {
    setSlots(prev => prev.filter(s => s.id !== slotId));
    if (selectedSlotId === slotId) setSelectedSlotId(null);
  };

  // ── Text CRUD ──
  const handleAddText = () => {
    const newText = createTextElement(textElements.length, canvasWidth, canvasHeight);
    newText.zIndex = getMaxZ() + 10;
    setTextElements(prev => [...prev, newText]);
    handleSelectText(newText.id);
    pushHistory();
  };

  const handleRemoveText = (textId) => {
    setTextElements(prev => prev.filter(t => t.id !== textId));
    if (selectedTextId === textId) setSelectedTextId(null);
  };

  // ── Decoration CRUD ──
  const handleAddDeco = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = Math.round(canvasWidth * 0.25);
        const ratio = img.width / img.height;
        const w = Math.min(maxW, img.width);
        const h = Math.round(w / ratio);
        const deco = {
          id: `deco-${Date.now()}`,
          src: ev.target.result,
          x: Math.round((canvasWidth - w) / 2),
          y: Math.round((canvasHeight - h) / 2),
          width: w, height: h, rotation: 0,
          zIndex: getMaxZ() + 10,
          aspectRatioLocked: true,
        };
        setDecorations(prev => [...prev, deco]);
        handleSelectDeco(deco.id);
        pushHistory();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDeco = (decoId) => {
    setDecorations(prev => prev.filter(d => d.id !== decoId));
    if (selectedDecoId === decoId) setSelectedDecoId(null);
  };

  // ── Generic Reorder ──
  const handleReorderLayer = useCallback((id, type, direction) => {
    // 1. Gather all active elements with their type, id/ref, and current zIndex
    const items = [];
    
    // Background canvas
    items.push({ type: 'background', id: 'background', zIndex: backgroundZIndex });
    
    // Slots
    slots.forEach(s => items.push({ type: 'slot', id: s.id, ref: s, zIndex: s.zIndex ?? 0 }));
    
    // Overlay
    if (overlayPreview) {
      items.push({ type: 'overlay', id: 'overlay', zIndex: overlayZIndex });
    }
    
    // Texts
    textElements.forEach(t => items.push({ type: 'text', id: t.id, ref: t, zIndex: t.zIndex ?? 0 }));
    
    // Decorations (excluding meta block)
    decorations
      .filter(d => d.id !== 'meta-zindexes')
      .forEach(d => items.push({ type: 'deco', id: d.id, ref: d, zIndex: d.zIndex ?? 0 }));

    // Sort ascending by zIndex
    items.sort((a, b) => a.zIndex - b.zIndex);

    // Find the item index
    const idx = items.findIndex(item => item.type === type && item.id === id);
    if (idx === -1) return;

    // Swap index
    const swapIdx = direction === 'up' ? idx + 1 : idx - 1;
    if (swapIdx < 0 || swapIdx >= items.length) return; // out of bounds

    // Swap z-index values
    const tempZ = items[idx].zIndex;
    items[idx].zIndex = items[swapIdx].zIndex;
    items[swapIdx].zIndex = tempZ;

    // Separate back into component lists
    let newBgZ = backgroundZIndex;
    let newOverlayZ = overlayZIndex;
    const newSlots = [...slots];
    const newTexts = [...textElements];
    const newDecos = [...decorations];

    items.forEach(item => {
      if (item.type === 'background') {
        newBgZ = item.zIndex;
      } else if (item.type === 'overlay') {
        newOverlayZ = item.zIndex;
      } else if (item.type === 'slot') {
        const sIdx = newSlots.findIndex(s => s.id === item.id);
        if (sIdx !== -1) newSlots[sIdx].zIndex = item.zIndex;
      } else if (item.type === 'text') {
        const tIdx = newTexts.findIndex(t => t.id === item.id);
        if (tIdx !== -1) newTexts[tIdx].zIndex = item.zIndex;
      } else if (item.type === 'deco') {
        const dIdx = newDecos.findIndex(d => d.id === item.id);
        if (dIdx !== -1) newDecos[dIdx].zIndex = item.zIndex;
      }
    });

    // Run normalize to get clean 10, 20, 30... z-indexes
    const normalized = normalizeZIndexes(newSlots, newTexts, newDecos, newBgZ, newOverlayZ);

    // Apply states
    setSlots(normalized.slots);
    setTextElements(normalized.texts);
    setDecorations(normalized.decos);
    setBackgroundZIndex(normalized.backgroundZIndex);
    setOverlayZIndex(normalized.overlayZIndex);

    pushHistory();
  }, [slots, textElements, decorations, backgroundZIndex, overlayZIndex, overlayPreview, pushHistory]);

  // ── Generic Layer Actions (for LayerList) ──
  const handleToggleLock = useCallback((id, type, locked) => {
    getLayerUpdater(type)(id, { locked });
  }, [getLayerUpdater]);

  const handleToggleHide = useCallback((id, type, hidden) => {
    getLayerUpdater(type)(id, { hidden });
  }, [getLayerUpdater]);

  const handleDuplicateElement = useCallback(() => {
    if (selectedSlotId) {
      const orig = slots.find(s => s.id === selectedSlotId);
      if (!orig || slots.length >= MAX_SLOTS) {
        if (slots.length >= MAX_SLOTS) setSaveMsg(`⚠️ Maksimal ${MAX_SLOTS} photo slot`);
        return;
      }
      const newSlot = {
        ...JSON.parse(JSON.stringify(orig)),
        id: `slot-${Date.now()}-${slots.length}`,
        x: Math.min(canvasWidth - orig.width, orig.x + 30),
        y: Math.min(canvasHeight - orig.height, orig.y + 30),
        zIndex: getMaxZ() + 10,
        label: `${orig.label} (Copy)`
      };
      setSlots(prev => [...prev, newSlot]);
      setSelectedSlotId(newSlot.id);
      pushHistory();
    } else if (selectedTextId) {
      const orig = textElements.find(t => t.id === selectedTextId);
      if (!orig) return;
      const newText = {
        ...JSON.parse(JSON.stringify(orig)),
        id: `text-${Date.now()}-${textElements.length}`,
        x: Math.min(canvasWidth, orig.x + 30),
        y: orig.y >= 0 ? Math.min(canvasHeight, orig.y + 30) : orig.y - 30,
        zIndex: getMaxZ() + 10,
      };
      setTextElements(prev => [...prev, newText]);
      setSelectedTextId(newText.id);
      pushHistory();
    } else if (selectedDecoId) {
      const orig = decorations.find(d => d.id === selectedDecoId);
      if (!orig) return;
      const newDeco = {
        ...JSON.parse(JSON.stringify(orig)),
        id: `deco-${Date.now()}`,
        x: Math.min(canvasWidth - orig.width, orig.x + 30),
        y: Math.min(canvasHeight - orig.height, orig.y + 30),
        zIndex: getMaxZ() + 10,
      };
      setDecorations(prev => [...prev, newDeco]);
      setSelectedDecoId(newDeco.id);
      pushHistory();
    }
  }, [selectedSlotId, selectedTextId, selectedDecoId, slots, textElements, decorations, canvasWidth, canvasHeight, getMaxZ, pushHistory]);

  const handleDuplicateLayer = useCallback((id, type) => {
    // Select first, then duplicate
    if (type === 'slot') { setSelectedSlotId(id); setSelectedTextId(null); setSelectedDecoId(null); }
    else if (type === 'text') { setSelectedTextId(id); setSelectedSlotId(null); setSelectedDecoId(null); }
    else if (type === 'deco') { setSelectedDecoId(id); setSelectedSlotId(null); setSelectedTextId(null); }
    // Defer to let state update
    setTimeout(() => handleDuplicateElement(), 0);
  }, [handleDuplicateElement]);

  const handleDeleteLayer = useCallback((id, type) => {
    if (type === 'slot') { handleRemoveSlot(id); pushHistory(); }
    else if (type === 'text') { handleRemoveText(id); pushHistory(); }
    else if (type === 'deco') { handleRemoveDeco(id); pushHistory(); }
  }, [pushHistory]);

  // ── Toggle Publish (from list) ──
  const handleTogglePublish = async (template) => {
    try {
      const formData = new FormData();
      formData.append('name', template.name);
      formData.append('author', template.author || 'Admin');
      formData.append('photo_count', String(template.photo_count || 1));
      formData.append('canvas_width', String(template.canvas_width));
      formData.append('canvas_height', String(template.canvas_height));
      formData.append('orientation', template.orientation || 'portrait');
      formData.append('background_color', template.background_color || '#1a1a2e');
      formData.append('frame_mode', template.frame_mode || 'solo');
      formData.append('slots_json', JSON.stringify(template.slots || []));
      formData.append('text_elements_json', JSON.stringify(template.text_elements || []));
      formData.append('decorations_json', JSON.stringify(template.decorations || []));
      formData.append('is_published', template.is_published ? '0' : '1');
      formData.append('category', template.category || 'klasik');

      const res = await fetch(`${API_BASE}/api/cms/frames/${template.id}`, { method: 'PUT', body: formData });
      if (res.ok) {
        setSaveMsg(`✅ Status template ${template.name} diperbarui!`);
        fetchTemplates();
      } else {
        const errData = await res.json();
        setSaveMsg(`❌ Gagal: ${errData.error || 'Server error'}`);
      }
    } catch (err) {
      setSaveMsg(`❌ Error: ${err.message}`);
    }
  };

  // ── Overlay Upload ──
  const handleOverlayUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOverlayFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setOverlayPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!templateName.trim()) { setSaveMsg('⚠️ Nama template harus diisi'); return; }
    if (slots.length === 0) { setSaveMsg('⚠️ Minimal 1 photo slot'); return; }

    setSaving(true);
    setSaveMsg('📸 Capturing thumbnail...');
    try {
      const thumbBlob = await captureCanvasThumb(canvasRef);

      setSaveMsg('💾 Saving template...');
      const formData = new FormData();
      formData.append('name', templateName);
      formData.append('author', author);
      formData.append('photo_count', String(slots.length));
      formData.append('canvas_width', String(canvasWidth));
      formData.append('canvas_height', String(canvasHeight));
      formData.append('orientation', orientation);
      formData.append('background_color', backgroundColor);
      formData.append('frame_mode', frameMode);
      const decorationsWithMeta = [
        ...decorations.filter(d => d.id !== 'meta-zindexes'),
        { id: 'meta-zindexes', backgroundZIndex, overlayZIndex }
      ];
      formData.append('slots_json', JSON.stringify(slots));
      formData.append('text_elements_json', JSON.stringify(textElements));
      formData.append('decorations_json', JSON.stringify(decorationsWithMeta));
      formData.append('is_published', isPublished ? '1' : '0');
      formData.append('category', category);
      if (overlayFile) formData.append('overlay', overlayFile);
      if (thumbBlob) formData.append('thumbnail', thumbBlob, 'thumbnail.png');

      const url = editingId ? `${API_BASE}/api/cms/frames/${editingId}` : `${API_BASE}/api/cms/frames`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: formData });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg('✅ Tersimpan!');
        if (!editingId && data.id) setEditingId(data.id);
        fetchTemplates();
      } else {
        setSaveMsg(`❌ ${data.error || 'Gagal menyimpan'}`);
      }
    } catch (err) {
      setSaveMsg(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Derived State ──
  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const selectedText = textElements.find(t => t.id === selectedTextId);
  const selectedDeco = decorations.find(d => d.id === selectedDecoId);
  const hasSelection = !!(selectedSlot || selectedText || selectedDeco);
  const photoCount = slots.length;
  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current < historyRef.current.length - 1;

  return (
    <div className="cms-root">
      <header className="cms-header">
        <div className="cms-header__left">
          <a href="/" className="cms-logo">LDR Photobooth</a>
          <span className="cms-badge">CMS</span>
          <span className="cms-title">Frame Editor</span>
          <a href="/cms/posts" className="cms-btn cms-btn--xs cms-header__link">Manage Posts</a>
        </div>
        <div className="cms-header__right">
          {view === 'editor' && (
            <>
              <div className="cms-header__undo-group">
                <button className="cms-btn cms-btn--sm cms-btn--icon" onClick={handleUndo} disabled={!canUndo} title="Undo (⌘Z)">
                  <UndoIcon />
                </button>
                <button className="cms-btn cms-btn--sm cms-btn--icon" onClick={handleRedo} disabled={!canRedo} title="Redo (⌘⇧Z)">
                  <RedoIcon />
                </button>
              </div>
              <label className="cms-toggle cms-toggle--compact" title="Snap to guides">
                <input type="checkbox" checked={snapEnabled} onChange={e => setSnapEnabled(e.target.checked)} />
                <span className="cms-toggle__slider" />
                <span className="cms-toggle__label-inline">Snap</span>
              </label>
              <span className="cms-photo-count">
                {photoCount}/{MAX_SLOTS} foto · {frameMode === 'duo' ? 'Duo LDR' : 'Solo'}
              </span>
              <button className="cms-btn cms-btn--ghost cms-btn--icon-text" onClick={() => { setView('list'); setSaveMsg(''); }}>
                <ArrowLeftIcon /> Back
              </button>
              <button className="cms-btn cms-btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
              </button>
            </>
          )}
        </div>
      </header>

      {saveMsg && <div className="cms-toast">{saveMsg}</div>}

      {view === 'list' ? (
        <FrameList
          templates={templates} loading={loading}
          onNew={handleNew} onEdit={handleEdit} onDelete={handleDelete}
          apiBase={API_BASE} onTogglePublish={handleTogglePublish}
        />
      ) : (
        <div className="cms-editor">
          {/* Left Sidebar: Unified Layer List */}
          <div className="cms-editor__sidebar cms-editor__sidebar--left">
            <LayerList
              slots={slots}
              textElements={textElements}
              decorations={decorations}
              overlayPreview={overlayPreview}
              backgroundZIndex={backgroundZIndex}
              overlayZIndex={overlayZIndex}
              selectedSlotId={selectedSlotId}
              selectedTextId={selectedTextId}
              selectedDecoId={selectedDecoId}
              onSelectSlot={handleSelectSlot}
              onSelectText={handleSelectText}
              onSelectDeco={handleSelectDeco}
              onDeselectAll={handleDeselectAll}
              onReorder={handleReorderLayer}
              onToggleLock={handleToggleLock}
              onToggleHide={handleToggleHide}
              onDuplicate={handleDuplicateLayer}
              onDelete={handleDeleteLayer}
            />
          </div>

          {/* Center: Canvas Area */}
          <div className="cms-editor__canvas">
            <div className="cms-canvas-controls">
              <button className="cms-btn cms-btn--sm" onClick={() => setZoom(z => Math.max(0.15, z - 0.05))}>−</button>
              <span className="cms-zoom-label">{Math.round(zoom * 100)}%</span>
              <button className="cms-btn cms-btn--sm" onClick={() => setZoom(z => Math.min(1, z + 0.05))}>+</button>
            </div>
            <FrameCanvas
              ref={canvasRef}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              backgroundColor={backgroundColor}
              backgroundZIndex={backgroundZIndex}
              overlayZIndex={overlayZIndex}
              slots={slots}
              textElements={textElements}
              decorations={decorations}
              overlayPreview={overlayPreview}
              selectedSlotId={selectedSlotId}
              selectedTextId={selectedTextId}
              selectedDecoId={selectedDecoId}
              onSelectSlot={handleSelectSlot}
              onSelectText={handleSelectText}
              onSelectDeco={handleSelectDeco}
              onDeselectAll={handleDeselectAll}
              onUpdateSlot={handleUpdateSlot}
              onUpdateText={handleUpdateText}
              onUpdateDeco={handleUpdateDeco}
              onDragEnd={handleDragEnd}
              zoom={zoom}
              snapEnabled={snapEnabled}
              showDummy={showDummy}
            />
          </div>

          {/* Right Sidebar: Properties/Toolbar Panel */}
          <div className="cms-editor__sidebar cms-editor__sidebar--right">
            {hasSelection ? (
              <>
                {selectedSlot && (
                  <SlotEditor
                    slot={selectedSlot}
                    onUpdate={(updates) => handleUpdateSlot(selectedSlotId, updates)}
                    onDragEnd={handleDragEnd}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    frameMode={frameMode}
                    onDuplicate={handleDuplicateElement}
                  />
                )}
                {selectedText && (
                  <TextElementEditor
                    element={selectedText}
                    onUpdate={(updates) => handleUpdateText(selectedTextId, updates)}
                    onDragEnd={handleDragEnd}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    onDuplicate={handleDuplicateElement}
                  />
                )}
                {selectedDeco && (
                  <DecorationEditor
                    decoration={selectedDeco}
                    onUpdate={(updates) => handleUpdateDeco(selectedDecoId, updates)}
                    onDragEnd={handleDragEnd}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    onDuplicate={handleDuplicateElement}
                  />
                )}
              </>
            ) : (
              <ToolBar
                templateName={templateName} setTemplateName={setTemplateName}
                author={author} setAuthor={setAuthor}
                canvasWidth={canvasWidth} setCanvasWidth={setCanvasWidth}
                canvasHeight={canvasHeight} setCanvasHeight={setCanvasHeight}
                orientation={orientation} setOrientation={setOrientation}
                backgroundColor={backgroundColor} setBackgroundColor={setBackgroundColor}
                frameMode={frameMode} setFrameMode={setFrameMode}
                isPublished={isPublished} setIsPublished={setIsPublished}
                showDummy={showDummy} setShowDummy={setShowDummy}
                onAddSlot={handleAddSlot}
                onAddText={handleAddText}
                onAddDeco={handleAddDeco}
                onOverlayUpload={handleOverlayUpload}
                overlayPreview={overlayPreview}
                onRemoveOverlay={() => { setOverlayFile(null); setOverlayPreview(null); }}
                photoCount={photoCount}
                maxSlots={MAX_SLOTS}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
