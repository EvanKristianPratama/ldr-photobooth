'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import FrameCanvas from './components/FrameCanvas';
import SlotEditor from './components/SlotEditor';
import TextElementEditor from './components/TextElementEditor';
import DecorationEditor from './components/DecorationEditor';
import ToolBar from './components/ToolBar';
import FrameList from './components/FrameList';
import './cms-frames.css';

const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev')
  : '';

const DEFAULT_CANVAS = { width: 580, height: 1740 };
const MAX_HISTORY = 50;
const MAX_SLOTS = 4;

function createSlot(index, canvasW, canvasH, frameMode = 'solo', existingSlots = []) {
  let slotW, slotH, x, y;

  if (existingSlots && existingSlots.length > 0) {
    // Copy the last slot's dimensions and cascade slightly
    const last = existingSlots[existingSlots.length - 1];
    slotW = last.width;
    slotH = last.height;
    x = last.x + 40;
    y = last.y + 40;
    // Prevent it from going completely off screen
    if (x + slotW > canvasW) x = canvasW - slotW;
    if (y + slotH > canvasH) y = canvasH - slotH;
    if (x < 0) x = 0;
    if (y < 0) y = 0;
  } else {
    // Default strip layout calculation for the first slot
    slotW = Math.round(canvasW * 0.86);
    slotH = Math.round(slotW * 1.5);
    
    // If it's a wide canvas (landscape), don't make it insanely tall
    if (slotH > canvasH * 0.8) {
      slotH = Math.round(canvasH * 0.8);
      slotW = Math.round(slotH / 1.5);
    }

    x = Math.round((canvasW - slotW) / 2);
    const gap = 40;
    const headerH = 150;
    y = headerH + gap + index * (slotH + gap);
    
    // If y is off canvas, just center it
    if (y + slotH > canvasH) {
      y = Math.round((canvasH - slotH) / 2);
    }
  }

  // In duo mode, auto-alternate owners: even=userA, odd=userB
  const owner = frameMode === 'duo' ? (index % 2 === 0 ? 'userA' : 'userB') : 'any';
  
  return {
    id: `slot-${Date.now()}-${index}`,
    x, y,
    width: slotW,
    height: slotH,
    rotation: 0,
    zIndex: index + 1,
    borderRadius: 0,
    label: `Photo ${index + 1}`,
    aspectRatioLocked: false,
    owner // 'userA' | 'userB' | 'any'
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

const defaultTextElements = [
  {
    id: 'text-header',
    type: 'name',
    x: 290, y: 70,
    fontSize: 36,
    fontFamily: "'Quicksand', sans-serif",
    color: '#ffffff',
    textAlign: 'center',
    content: '{{name}}'
  },
  {
    id: 'text-date',
    type: 'date',
    x: 290, y: -80,
    fontSize: 28,
    fontFamily: "'Quicksand', sans-serif",
    color: '#ffffff',
    textAlign: 'center',
    content: '{{date}}'
  }
];

export default function CmsFramesPage() {
  // View state
  const [view, setView] = useState('list'); // 'list' | 'editor'
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
  const [frameMode, setFrameMode] = useState('solo'); // 'solo' | 'duo'
  const [slots, setSlots] = useState([]);
  const [textElements, setTextElements] = useState(defaultTextElements);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [overlayFile, setOverlayFile] = useState(null);
  const [overlayPreview, setOverlayPreview] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [zoom, setZoom] = useState(0.45);
  const [snapEnabled, setSnapEnabled] = useState(true);

  // Decoration stickers (individual draggable images)
  const [decorations, setDecorations] = useState([]);
  const [selectedDecoId, setSelectedDecoId] = useState(null);

  // ── UNDO / REDO ──
  const historyRef = useRef([]);
  const historyIdxRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  const getEditorSnapshot = useCallback(() => ({
    slots: JSON.parse(JSON.stringify(slots)),
    textElements: JSON.parse(JSON.stringify(textElements)),
    decorations: JSON.parse(JSON.stringify(decorations)),
  }), [slots, textElements, decorations]);

  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) return;
    const snap = getEditorSnapshot();
    const idx = historyIdxRef.current;
    // Truncate future states
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(snap);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIdxRef.current = historyRef.current.length - 1;
  }, [getEditorSnapshot]);

  const applySnapshot = useCallback((snap) => {
    skipHistoryRef.current = true;
    setSlots(snap.slots);
    setTextElements(snap.textElements);
    setDecorations(snap.decorations || []);
    setTimeout(() => { skipHistoryRef.current = false; }, 0);
  }, []);

  const handleUndo = useCallback(() => {
    const idx = historyIdxRef.current;
    if (idx <= 0) return;
    historyIdxRef.current = idx - 1;
    applySnapshot(historyRef.current[idx - 1]);
  }, [applySnapshot]);

  const handleRedo = useCallback(() => {
    const idx = historyIdxRef.current;
    if (idx >= historyRef.current.length - 1) return;
    historyIdxRef.current = idx + 1;
    applySnapshot(historyRef.current[idx + 1]);
  }, [applySnapshot]);

  // Push history on meaningful state changes (debounced via mouseup)
  const handleDragEnd = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Keyboard shortcuts
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
          setSelectedSlotId(null);
          pushHistory();
        } else if (selectedTextId) {
          setTextElements(prev => prev.filter(t => t.id !== selectedTextId));
          setSelectedTextId(null);
          pushHistory();
        } else if (selectedDecoId) {
          setDecorations(prev => prev.filter(d => d.id !== selectedDecoId));
          setSelectedDecoId(null);
          pushHistory();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, selectedSlotId, selectedTextId, selectedDecoId, handleUndo, handleRedo, pushHistory]);

  // Fetch templates
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

  // ── Create / Edit / Delete Template ──
  const handleNew = () => {
    setEditingId(null);
    setTemplateName('');
    setAuthor('Admin');
    setCanvasWidth(DEFAULT_CANVAS.width);
    setCanvasHeight(DEFAULT_CANVAS.height);
    setOrientation('portrait');
    setBackgroundColor('#1a1a2e');
    setFrameMode('solo');
    const initSlots = [createSlot(0, DEFAULT_CANVAS.width, DEFAULT_CANVAS.height, 'solo')];
    setSlots(initSlots);
    setTextElements([...defaultTextElements]);
    setDecorations([]);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    setSelectedDecoId(null);
    setOverlayFile(null);
    setOverlayPreview(null);
    setIsPublished(false);
    setSaveMsg('');
    setView('editor');
    // Init history
    historyRef.current = [{ slots: initSlots, textElements: [...defaultTextElements], decorations: [] }];
    historyIdxRef.current = 0;
  };

  const handleEdit = (template) => {
    setEditingId(template.id);
    setTemplateName(template.name);
    setAuthor(template.author);
    setCanvasWidth(template.canvas_width);
    setCanvasHeight(template.canvas_height);
    setOrientation(template.orientation || 'portrait');
    setBackgroundColor(template.background_color || '#1a1a2e');
    setFrameMode(template.frame_mode || 'solo');
    const loadedSlots = (template.slots || []).map(s => ({ ...s, aspectRatioLocked: s.aspectRatioLocked || false, owner: s.owner || 'any' }));
    setSlots(loadedSlots);
    setTextElements(template.text_elements || []);
    setDecorations(template.decorations || []);
    setSelectedSlotId(null);
    setSelectedTextId(null);
    setSelectedDecoId(null);
    setOverlayFile(null);
    setOverlayPreview(template.overlay_url ? `${API_BASE}${template.overlay_url}` : null);
    setIsPublished(!!template.is_published);
    setSaveMsg('');
    setView('editor');
    historyRef.current = [{ slots: loadedSlots, textElements: template.text_elements || [], decorations: template.decorations || [] }];
    historyIdxRef.current = 0;
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

  // ── Slot CRUD ──
  const handleAddSlot = () => {
    if (slots.length >= MAX_SLOTS) {
      setSaveMsg(`⚠️ Maksimal ${MAX_SLOTS} photo slot`);
      return;
    }
    const newSlot = createSlot(slots.length, canvasWidth, canvasHeight, frameMode, slots);
    setSlots(prev => [...prev, newSlot]);
    handleSelectSlot(newSlot.id);
    pushHistory();
  };

  const handleRemoveSlot = (slotId) => {
    setSlots(prev => prev.filter(s => s.id !== slotId));
    if (selectedSlotId === slotId) setSelectedSlotId(null);
  };

  const handleUpdateSlot = (slotId, updates) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...updates } : s));
  };

  const handleReorderSlot = (slotId, direction) => {
    setSlots(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex(s => s.id === slotId);
      if (direction === 'up' && idx < sorted.length - 1) {
        const tmp = sorted[idx].zIndex;
        sorted[idx].zIndex = sorted[idx + 1].zIndex;
        sorted[idx + 1].zIndex = tmp;
      } else if (direction === 'down' && idx > 0) {
        const tmp = sorted[idx].zIndex;
        sorted[idx].zIndex = sorted[idx - 1].zIndex;
        sorted[idx - 1].zIndex = tmp;
      }
      return sorted;
    });
    pushHistory();
  };

  // ── Text Element CRUD ──
  const handleAddText = () => {
    const newText = createTextElement(textElements.length, canvasWidth, canvasHeight);
    setTextElements(prev => [...prev, newText]);
    handleSelectText(newText.id);
    pushHistory();
  };

  const handleRemoveText = (textId) => {
    setTextElements(prev => prev.filter(t => t.id !== textId));
    if (selectedTextId === textId) setSelectedTextId(null);
  };

  const handleUpdateText = (textId, updates) => {
    setTextElements(prev => prev.map(t => t.id === textId ? { ...t, ...updates } : t));
  };

  // ── Decoration Sticker CRUD ──
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
          width: w,
          height: h,
          rotation: 0,
          zIndex: 100 + decorations.length,
          aspectRatioLocked: true
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

  const handleUpdateDeco = (decoId, updates) => {
    setDecorations(prev => prev.map(d => d.id === decoId ? { ...d, ...updates } : d));
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
    setSaveMsg('');
    try {
      const formData = new FormData();
      formData.append('name', templateName);
      formData.append('author', author);
      formData.append('photo_count', String(slots.length));
      formData.append('canvas_width', String(canvasWidth));
      formData.append('canvas_height', String(canvasHeight));
      formData.append('orientation', orientation);
      formData.append('background_color', backgroundColor);
      formData.append('frame_mode', frameMode);
      formData.append('slots_json', JSON.stringify(slots));
      formData.append('text_elements_json', JSON.stringify(textElements));
      formData.append('decorations_json', JSON.stringify(decorations));
      formData.append('is_published', isPublished ? '1' : '0');
      if (overlayFile) formData.append('overlay', overlayFile);

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

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const selectedText = textElements.find(t => t.id === selectedTextId);
  const selectedDeco = decorations.find(d => d.id === selectedDecoId);
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
          <a href="/cms/posts" className="cms-btn cms-btn--xs" style={{ textDecoration: 'none', marginLeft: '10px' }}>Manage Posts</a>
        </div>
        <div className="cms-header__right">
          {view === 'editor' && (
            <>
              {/* Undo / Redo */}
              <div className="cms-header__undo-group">
                <button className="cms-btn cms-btn--sm" onClick={handleUndo} disabled={!canUndo} title="Undo (⌘Z)">↩</button>
                <button className="cms-btn cms-btn--sm" onClick={handleRedo} disabled={!canRedo} title="Redo (⌘⇧Z)">↪</button>
              </div>
              <label className="cms-toggle cms-toggle--compact" title="Snap to guides">
                <input type="checkbox" checked={snapEnabled} onChange={e => setSnapEnabled(e.target.checked)} />
                <span className="cms-toggle__slider" />
                <span className="cms-toggle__label-inline">Snap</span>
              </label>
              <span className="cms-photo-count">{photoCount}/{MAX_SLOTS} foto · {frameMode === 'duo' ? '👫 Duo' : '🧑 Solo'}</span>
              <button className="cms-btn cms-btn--ghost" onClick={() => { setView('list'); setSaveMsg(''); }}>
                ← Back
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
        <FrameList templates={templates} loading={loading} onNew={handleNew} onEdit={handleEdit} onDelete={handleDelete} apiBase={API_BASE} />
      ) : (
        <div className="cms-editor">
          {/* Left: Canvas */}
          <div className="cms-editor__canvas">
            <div className="cms-canvas-controls">
              <button className="cms-btn cms-btn--sm" onClick={() => setZoom(z => Math.max(0.15, z - 0.05))}>−</button>
              <span className="cms-zoom-label">{Math.round(zoom * 100)}%</span>
              <button className="cms-btn cms-btn--sm" onClick={() => setZoom(z => Math.min(1, z + 0.05))}>+</button>
            </div>
            <FrameCanvas
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              backgroundColor={backgroundColor}
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
            />
          </div>

          {/* Right: Properties Panel */}
          <div className="cms-editor__panel">
            <ToolBar
              templateName={templateName} setTemplateName={setTemplateName}
              author={author} setAuthor={setAuthor}
              canvasWidth={canvasWidth} setCanvasWidth={setCanvasWidth}
              canvasHeight={canvasHeight} setCanvasHeight={setCanvasHeight}
              orientation={orientation} setOrientation={setOrientation}
              backgroundColor={backgroundColor} setBackgroundColor={setBackgroundColor}
              frameMode={frameMode} setFrameMode={setFrameMode}
              isPublished={isPublished} setIsPublished={setIsPublished}
              onAddSlot={handleAddSlot}
              onAddText={handleAddText}
              onAddDeco={handleAddDeco}
              onOverlayUpload={handleOverlayUpload}
              overlayPreview={overlayPreview}
              onRemoveOverlay={() => { setOverlayFile(null); setOverlayPreview(null); }}
              photoCount={photoCount}
              maxSlots={MAX_SLOTS}
            />

            <div className="cms-panel-divider" />

            {/* Photo Slots Layer List */}
            <div className="cms-panel-section">
              <div className="cms-panel-section__title">
                <span>📷 Photo Slots ({slots.length}/{MAX_SLOTS})</span>
              </div>
              <div className="cms-slot-list">
                {[...slots].sort((a, b) => b.zIndex - a.zIndex).map(slot => {
                  const ownerBadge = frameMode === 'duo'
                    ? (slot.owner === 'userA' ? '🔵A' : slot.owner === 'userB' ? '🟣B' : '⚪')
                    : '';
                  return (
                    <div key={slot.id} className={`cms-slot-chip ${selectedSlotId === slot.id ? 'active' : ''}`} onClick={() => handleSelectSlot(slot.id)}>
                      {ownerBadge && <span className="cms-slot-chip__owner">{ownerBadge}</span>}
                      <span className="cms-slot-chip__label">{slot.label}</span>
                      <span className="cms-slot-chip__info">z:{slot.zIndex} {slot.aspectRatioLocked ? '🔒' : ''}</span>
                      <div className="cms-slot-chip__actions">
                        <button title="Layer Up" onClick={(e) => { e.stopPropagation(); handleReorderSlot(slot.id, 'up'); }}>▲</button>
                        <button title="Layer Down" onClick={(e) => { e.stopPropagation(); handleReorderSlot(slot.id, 'down'); }}>▼</button>
                        <button title="Delete" onClick={(e) => { e.stopPropagation(); handleRemoveSlot(slot.id); pushHistory(); }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Text Elements Layer List */}
            <div className="cms-panel-divider" />
            <div className="cms-panel-section">
              <div className="cms-panel-section__title">
                <span>✏️ Text Elements ({textElements.length})</span>
              </div>
              <div className="cms-slot-list">
                {textElements.map(te => (
                  <div key={te.id} className={`cms-slot-chip ${selectedTextId === te.id ? 'active' : ''}`} onClick={() => handleSelectText(te.id)}>
                    <span className="cms-slot-chip__label" style={{ fontSize: '12px' }}>{te.content.length > 18 ? te.content.slice(0, 18) + '…' : te.content}</span>
                    <span className="cms-slot-chip__info">{te.fontSize}px</span>
                    <div className="cms-slot-chip__actions">
                      <button title="Delete" onClick={(e) => { e.stopPropagation(); handleRemoveText(te.id); pushHistory(); }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorations Layer List */}
            {decorations.length > 0 && (
              <>
                <div className="cms-panel-divider" />
                <div className="cms-panel-section">
                  <div className="cms-panel-section__title">
                    <span>🎨 Decorations ({decorations.length})</span>
                  </div>
                  <div className="cms-slot-list">
                    {decorations.map(d => (
                      <div key={d.id} className={`cms-slot-chip ${selectedDecoId === d.id ? 'active' : ''}`} onClick={() => handleSelectDeco(d.id)}>
                        <img src={d.src} alt="" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 3 }} />
                        <span className="cms-slot-chip__label">Sticker</span>
                        <span className="cms-slot-chip__info">{d.width}×{d.height}</span>
                        <div className="cms-slot-chip__actions">
                          <button title="Delete" onClick={(e) => { e.stopPropagation(); handleRemoveDeco(d.id); pushHistory(); }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Property Editors */}
            {selectedSlot && (
              <>
                <div className="cms-panel-divider" />
                <SlotEditor
                  slot={selectedSlot}
                  onUpdate={(updates) => handleUpdateSlot(selectedSlotId, updates)}
                  onDragEnd={handleDragEnd}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  frameMode={frameMode}
                />
              </>
            )}

            {selectedText && (
              <>
                <div className="cms-panel-divider" />
                <TextElementEditor
                  element={selectedText}
                  onUpdate={(updates) => handleUpdateText(selectedTextId, updates)}
                  onDragEnd={handleDragEnd}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                />
              </>
            )}

            {selectedDeco && (
              <>
                <div className="cms-panel-divider" />
                <DecorationEditor
                  decoration={selectedDeco}
                  onUpdate={(updates) => handleUpdateDeco(selectedDecoId, updates)}
                  onDragEnd={handleDragEnd}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
