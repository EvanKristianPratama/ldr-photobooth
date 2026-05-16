import React, { useRef, useCallback, useState, useEffect } from 'react';
import { SHAPE_PATHS } from '../../../utils/shapes';

/**
 * FrameCanvas — Interactive Canva-like canvas editor.
 * Features: drag-to-move, corner-resize (with aspect ratio lock), draggable text elements,
 * draggable decoration stickers, snapping guides (center + edge alignment).
 */

const SNAP_THRESHOLD = 8; // px distance to trigger snap

const TransformHandles = () => (
  <>
    <div className="cms-handle cms-handle--nw" />
    <div className="cms-handle cms-handle--ne" />
    <div className="cms-handle cms-handle--sw" />
    <div className="cms-handle cms-handle--se" />
    <div className="cms-handle cms-handle--n" />
    <div className="cms-handle cms-handle--s" />
    <div className="cms-handle cms-handle--e" />
    <div className="cms-handle cms-handle--w" />
    <div className="cms-handle cms-handle--rotate">↻</div>
  </>
);

export default function FrameCanvas({
  canvasWidth,
  canvasHeight,
  backgroundColor,
  slots,
  textElements,
  decorations = [],
  overlayPreview,
  selectedSlotId,
  selectedTextId,
  selectedDecoId,
  onSelectSlot,
  onSelectText,
  onSelectDeco,
  onDeselectAll,
  onUpdateSlot,
  onUpdateText,
  onUpdateDeco,
  onDragEnd,
  zoom,
  snapEnabled
}) {
  const containerRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [hoveredCorner, setHoveredCorner] = useState(null);
  const [snapLines, setSnapLines] = useState([]); // { axis: 'x'|'y', pos: number }

  const HANDLE_SIZE = 10;

  const getCorner = (item, mx, my) => {
    const cx = item.x + (item.width || 0) / 2;
    const cy = item.y + (item.height || 0) / 2;
    const angle = (item.rotation || 0) * Math.PI / 180;
    
    // Rotate mouse coords to element's local space
    const dx = mx - cx;
    const dy = my - cy;
    const localX = cx + (dx * Math.cos(-angle) - dy * Math.sin(-angle));
    const localY = cy + (dx * Math.sin(-angle) + dy * Math.cos(-angle));

    const w = item.width || 0;
    const h = item.height || 0;

    const corners = [
      { id: 'nw', x: item.x, y: item.y },
      { id: 'ne', x: item.x + w, y: item.y },
      { id: 'sw', x: item.x, y: item.y + h },
      { id: 'se', x: item.x + w, y: item.y + h },
      { id: 'n', x: item.x + w / 2, y: item.y },
      { id: 's', x: item.x + w / 2, y: item.y + h },
      { id: 'e', x: item.x + w, y: item.y + h / 2 },
      { id: 'w', x: item.x, y: item.y + h / 2 },
      { id: 'rotate', x: item.x + w / 2, y: item.y + h + 25 },
    ];
    const threshold = HANDLE_SIZE / zoom;
    for (const c of corners) {
      if (Math.abs(localX - c.x) < threshold && Math.abs(localY - c.y) < threshold) return c.id;
    }
    return null;
  };

  const getCanvasCoords = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  };

  // ── Snapping Logic ──
  const computeSnap = (itemX, itemY, itemW, itemH, excludeId) => {
    if (!snapEnabled) return { x: itemX, y: itemY, lines: [] };

    const lines = [];
    let snappedX = itemX, snappedY = itemY;

    // Canvas center
    const cx = canvasWidth / 2, cy = canvasHeight / 2;
    const itemCx = itemX + itemW / 2, itemCy = itemY + itemH / 2;

    // Snap to canvas center X
    if (Math.abs(itemCx - cx) < SNAP_THRESHOLD) {
      snappedX = cx - itemW / 2;
      lines.push({ axis: 'x', pos: cx });
    }
    // Snap to canvas center Y
    if (Math.abs(itemCy - cy) < SNAP_THRESHOLD) {
      snappedY = cy - itemH / 2;
      lines.push({ axis: 'y', pos: cy });
    }
    // Snap to canvas edges
    if (Math.abs(itemX) < SNAP_THRESHOLD) { snappedX = 0; lines.push({ axis: 'x', pos: 0 }); }
    if (Math.abs(itemX + itemW - canvasWidth) < SNAP_THRESHOLD) { snappedX = canvasWidth - itemW; lines.push({ axis: 'x', pos: canvasWidth }); }
    if (Math.abs(itemY) < SNAP_THRESHOLD) { snappedY = 0; lines.push({ axis: 'y', pos: 0 }); }
    if (Math.abs(itemY + itemH - canvasHeight) < SNAP_THRESHOLD) { snappedY = canvasHeight - itemH; lines.push({ axis: 'y', pos: canvasHeight }); }

    // Snap to other slots
    const allItems = [...slots, ...decorations].filter(s => s.id !== excludeId);
    for (const other of allItems) {
      const otherCx = other.x + other.width / 2;
      const otherCy = other.y + other.height / 2;
      // Center-to-center
      if (Math.abs(itemCx - otherCx) < SNAP_THRESHOLD && !lines.find(l => l.axis === 'x' && l.pos === otherCx)) {
        snappedX = otherCx - itemW / 2;
        lines.push({ axis: 'x', pos: otherCx });
      }
      if (Math.abs(itemCy - otherCy) < SNAP_THRESHOLD && !lines.find(l => l.axis === 'y' && l.pos === otherCy)) {
        snappedY = otherCy - itemH / 2;
        lines.push({ axis: 'y', pos: otherCy });
      }
      // Edge-to-edge
      if (Math.abs(itemX - other.x) < SNAP_THRESHOLD) { snappedX = other.x; lines.push({ axis: 'x', pos: other.x }); }
      if (Math.abs(itemX + itemW - (other.x + other.width)) < SNAP_THRESHOLD) { snappedX = other.x + other.width - itemW; lines.push({ axis: 'x', pos: other.x + other.width }); }
      if (Math.abs(itemY - other.y) < SNAP_THRESHOLD) { snappedY = other.y; lines.push({ axis: 'y', pos: other.y }); }
      if (Math.abs(itemY + itemH - (other.y + other.height)) < SNAP_THRESHOLD) { snappedY = other.y + other.height - itemH; lines.push({ axis: 'y', pos: other.y + other.height }); }
    }

    return { x: Math.round(snappedX), y: Math.round(snappedY), lines };
  };

  // ── Hit Testing ──
  const hitTestTextElement = (te, mx, my) => {
    // Approximate text hit area based on fontSize and content length
    const charW = te.fontSize * 0.5;
    const w = Math.max(60, te.content.length * charW);
    const h = te.fontSize * 1.4;
    const textY = te.y >= 0 ? te.y : canvasHeight + te.y;
    const left = te.textAlign === 'center' ? te.x - w / 2 : te.x;
    return mx >= left && mx <= left + w && my >= textY - h / 2 && my <= textY + h / 2;
  };

  const hitTestItem = (item, mx, my) => {
    const cx = item.x + (item.width || 0) / 2;
    const cy = item.y + (item.height || 0) / 2;
    const angle = (item.rotation || 0) * Math.PI / 180;
    
    // Rotate mouse coords to element's local space
    const dx = mx - cx;
    const dy = my - cy;
    const localX = cx + (dx * Math.cos(-angle) - dy * Math.sin(-angle));
    const localY = cy + (dx * Math.sin(-angle) + dy * Math.cos(-angle));

    return localX >= item.x && localX <= item.x + item.width && localY >= item.y && localY <= item.y + item.height;
  };

  // ── Mouse Handlers ──
  const handleMouseDown = useCallback((e) => {
    if (!containerRef.current) return;
    const { x, y } = getCanvasCoords(e);

    // 1. Check decorations (topmost layer)
    const sortedDecos = [...decorations].sort((a, b) => b.zIndex - a.zIndex);
    for (const deco of sortedDecos) {
      const corner = getCorner(deco, x, y);
      if (corner) {
        e.preventDefault();
        onSelectDeco(deco.id);
        setDragState({ itemId: deco.id, itemType: 'deco', type: 'resize', corner, startX: x, startY: y, orig: { ...deco } });
        return;
      }
      if (hitTestItem(deco, x, y)) {
        e.preventDefault();
        onSelectDeco(deco.id);
        setDragState({ itemId: deco.id, itemType: 'deco', type: 'move', startX: x, startY: y, orig: { ...deco } });
        return;
      }
    }

    // 2. Check text elements
    for (const te of [...textElements].reverse()) {
      if (hitTestTextElement(te, x, y)) {
        e.preventDefault();
        onSelectText(te.id);
        setDragState({ itemId: te.id, itemType: 'text', type: 'move', startX: x, startY: y, orig: { ...te } });
        return;
      }
    }

    // 3. Check slots (reverse z-order)
    const sorted = [...slots].sort((a, b) => b.zIndex - a.zIndex);
    for (const slot of sorted) {
      const corner = getCorner(slot, x, y);
      if (corner) {
        e.preventDefault();
        onSelectSlot(slot.id);
        setDragState({ itemId: slot.id, itemType: 'slot', type: 'resize', corner, startX: x, startY: y, orig: { ...slot } });
        return;
      }
      if (hitTestItem(slot, x, y)) {
        e.preventDefault();
        onSelectSlot(slot.id);
        setDragState({ itemId: slot.id, itemType: 'slot', type: 'move', startX: x, startY: y, orig: { ...slot } });
        return;
      }
    }

    onDeselectAll();
  }, [slots, textElements, decorations, zoom, onSelectSlot, onSelectText, onSelectDeco, onDeselectAll, canvasHeight]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const { x, y } = getCanvasCoords(e);

    if (!dragState) {
      // Cursor hover detection
      const allResizables = [...decorations, ...slots].sort((a, b) => b.zIndex - a.zIndex);
      let foundCorner = null;
      for (const item of allResizables) {
        const corner = getCorner(item, x, y);
        if (corner) { foundCorner = corner; break; }
      }
      setHoveredCorner(foundCorner);
      return;
    }

    e.preventDefault();
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;
    const orig = dragState.orig;

    if (dragState.type === 'move') {
      let newX = orig.x + dx;
      let newY = orig.y + dy;
      const itemW = orig.width || 60;
      const itemH = orig.height || (orig.fontSize ? orig.fontSize * 1.4 : 30);

      if (dragState.itemType === 'text') {
        // Text uses center-based x, top-based y
        const { x: sx, y: sy, lines } = computeSnap(newX - itemW / 2, newY >= 0 ? newY - itemH / 2 : newY, itemW, itemH, dragState.itemId);
        newX = sx + itemW / 2;
        newY = orig.y >= 0 ? sy + itemH / 2 : orig.y + dy;
        setSnapLines(lines);
        onUpdateText(dragState.itemId, { x: Math.round(newX), y: Math.round(newY) });
      } else {
        newX = Math.max(0, Math.min(canvasWidth - itemW, newX));
        newY = Math.max(0, Math.min(canvasHeight - itemH, newY));
        const { x: sx, y: sy, lines } = computeSnap(newX, newY, itemW, itemH, dragState.itemId);
        setSnapLines(lines);
        const updateFn = dragState.itemType === 'slot' ? onUpdateSlot : onUpdateDeco;
        updateFn(dragState.itemId, { x: sx, y: sy });
      }
    } else if (dragState.type === 'resize') {
      const c = dragState.corner;
      const updateFn = dragState.itemType === 'slot' ? onUpdateSlot : onUpdateDeco;
      
      if (c === 'rotate') {
        const cx = orig.x + (orig.width || 0) / 2;
        const cy = orig.y + (orig.height || 0) / 2;
        let angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI - 90;
        // Snap to 45 degree increments
        if (Math.abs(angle % 45) < 5 || Math.abs(angle % 45) > 40) {
           angle = Math.round(angle / 45) * 45;
        }
        updateFn(dragState.itemId, { rotation: Math.round(angle) });
        return;
      }

      const angle = (orig.rotation || 0) * Math.PI / 180;
      const localDx = dx * Math.cos(-angle) - dy * Math.sin(-angle);
      const localDy = dx * Math.sin(-angle) + dy * Math.cos(-angle);

      let newX = orig.x, newY = orig.y, newW = orig.width, newH = orig.height;
      const locked = ['nw', 'ne', 'sw', 'se'].includes(c) || orig.aspectRatioLocked;
      const ratio = orig.width / orig.height;

      if (c === 'se') {
        newW = Math.max(50, orig.width + localDx);
        newH = locked ? Math.round(newW / ratio) : Math.max(50, orig.height + localDy);
      } else if (c === 'sw') {
        newW = Math.max(50, orig.width - localDx);
        newH = locked ? Math.round(newW / ratio) : Math.max(50, orig.height + localDy);
        newX = orig.x + orig.width - newW;
      } else if (c === 'ne') {
        newW = Math.max(50, orig.width + localDx);
        newH = locked ? Math.round(newW / ratio) : Math.max(50, orig.height - localDy);
        newY = orig.y + orig.height - newH;
      } else if (c === 'nw') {
        newW = Math.max(50, orig.width - localDx);
        newH = locked ? Math.round(newW / ratio) : Math.max(50, orig.height - localDy);
        newX = orig.x + orig.width - newW;
        newY = orig.y + orig.height - newH;
      } else if (c === 'e') {
        newW = Math.max(50, orig.width + localDx);
        if (locked) newH = Math.round(newW / ratio);
      } else if (c === 'w') {
        newW = Math.max(50, orig.width - localDx);
        if (locked) newH = Math.round(newW / ratio);
        newX = orig.x + orig.width - newW;
      } else if (c === 's') {
        newH = Math.max(50, orig.height + localDy);
        if (locked) newW = Math.round(newH * ratio);
      } else if (c === 'n') {
        newH = Math.max(50, orig.height - localDy);
        if (locked) newW = Math.round(newH * ratio);
        newY = orig.y + orig.height - newH;
      }

      updateFn(dragState.itemId, { x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
      setSnapLines([]);
    }
  }, [dragState, slots, decorations, zoom, canvasWidth, canvasHeight, onUpdateSlot, onUpdateText, onUpdateDeco, snapEnabled]);

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      setDragState(null);
      setSnapLines([]);
      onDragEnd?.();
    }
  }, [dragState, onDragEnd]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const getCursor = () => {
    if (dragState?.type === 'move') return 'grabbing';
    if (dragState?.type === 'resize') {
      if (dragState.corner === 'nw' || dragState.corner === 'se') return 'nwse-resize';
      return 'nesw-resize';
    }
    if (hoveredCorner === 'nw' || hoveredCorner === 'se') return 'nwse-resize';
    if (hoveredCorner === 'ne' || hoveredCorner === 'sw') return 'nesw-resize';
    return 'default';
  };

  const getShapeStyles = (slot) => {
    const shape = slot.shape || 'rect';
    let styles = { borderRadius: slot.borderRadius || 0 };
    
    if (shape === 'oval') {
      styles.borderRadius = '50%';
    } else if (SHAPE_PATHS[shape]) {
      styles.WebkitMaskImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${SHAPE_PATHS[shape]}" fill="black"/></svg>')`;
      styles.WebkitMaskSize = '100% 100%';
      styles.WebkitMaskRepeat = 'no-repeat';
      styles.WebkitMaskPosition = 'center';
      styles.borderRadius = 0;
      styles.clipPath = 'none';
    }
    return styles;
  };

  const slotColors = [
    'rgba(99, 102, 241, 0.25)', 'rgba(236, 72, 153, 0.25)', 'rgba(34, 197, 94, 0.25)',
    'rgba(251, 191, 36, 0.25)', 'rgba(139, 92, 246, 0.25)', 'rgba(20, 184, 166, 0.25)',
  ];
  const slotBorders = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6'];

  // Owner-specific colors
  const ownerColors = {
    userA: { bg: 'rgba(59, 130, 246, 0.25)', border: '#3b82f6' },
    userB: { bg: 'rgba(168, 85, 247, 0.25)', border: '#a855f7' },
    any: null
  };

  return (
    <div className="cms-canvas-wrapper">
      <div
        ref={containerRef}
        className="cms-canvas"
        style={{ width: canvasWidth * zoom, height: canvasHeight * zoom, cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={!dragState ? handleMouseMove : undefined}
      >
        <div
          className="cms-canvas__bg"
          style={{ width: canvasWidth, height: canvasHeight, backgroundColor, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          {/* Grid pattern */}
          <svg className="cms-canvas__grid" width={canvasWidth} height={canvasHeight}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* ── Snap Guide Lines ── */}
          {snapLines.map((line, i) => (
            <div
              key={i}
              className="cms-snap-line"
              style={line.axis === 'x'
                ? { left: line.pos, top: 0, width: 1, height: canvasHeight }
                : { top: line.pos, left: 0, height: 1, width: canvasWidth }
              }
            />
          ))}

          {/* ── Photo Slots ── */}
          {[...slots].sort((a, b) => a.zIndex - b.zIndex).map((slot) => {
            const isSelected = slot.id === selectedSlotId;
            const colorIdx = slots.indexOf(slot) % slotColors.length;
            const oc = ownerColors[slot.owner];
            const bgColor = oc ? oc.bg : slotColors[colorIdx];
            const bdColor = isSelected ? '#fff' : (oc ? oc.border : slotBorders[colorIdx]);
            const ownerLabel = slot.owner === 'userA' ? '🔵 A' : slot.owner === 'userB' ? '🟣 B' : '';
            return (
              <div
                key={slot.id}
                className={`cms-slot ${isSelected ? 'cms-slot--selected' : ''}`}
                style={{
                  left: slot.x, top: slot.y, width: slot.width, height: slot.height,
                  ...getShapeStyles(slot),
                  transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
                  backgroundColor: bgColor,
                  borderColor: bdColor,
                  zIndex: slot.zIndex,
                }}
              >
                <div className="cms-slot__label">
                  {ownerLabel && <span className="cms-slot__owner-badge">{ownerLabel}</span>}
                  <span className="cms-slot__icon">📷</span>
                  <span>{slot.label}</span>
                  <span className="cms-slot__dims">{slot.width}×{slot.height}</span>
                  {slot.aspectRatioLocked && <span className="cms-slot__lock">🔒</span>}
                </div>
                {isSelected && (
                  <TransformHandles />
                )}
              </div>
            );
          })}

          {/* ── Overlay Preview ── */}
          {overlayPreview && (
            <img src={overlayPreview} alt="Overlay" className="cms-canvas__overlay" style={{ width: canvasWidth, height: canvasHeight }} />
          )}

          {/* ── Text Elements ── */}
          {textElements.map(te => {
            const isSelected = te.id === selectedTextId;
            const textY = te.y >= 0 ? te.y : undefined;
            const textBottom = te.y < 0 ? Math.abs(te.y) : undefined;
            return (
              <div
                key={te.id}
                className={`cms-text-element ${isSelected ? 'cms-text-element--selected' : ''}`}
                style={{
                  left: te.x, top: textY, bottom: textBottom,
                  fontSize: te.fontSize, fontFamily: te.fontFamily,
                  color: te.color, textAlign: te.textAlign,
                }}
              >
                {te.content}
              </div>
            );
          })}

          {/* ── Decoration Stickers ── */}
          {decorations.map(deco => {
            const isSelected = deco.id === selectedDecoId;
            return (
              <div
                key={deco.id}
                className={`cms-deco ${isSelected ? 'cms-deco--selected' : ''}`}
                style={{
                  left: deco.x, top: deco.y, width: deco.width, height: deco.height,
                  transform: deco.rotation ? `rotate(${deco.rotation}deg)` : undefined,
                  opacity: deco.opacity !== undefined ? deco.opacity : 1,
                  zIndex: deco.zIndex,
                }}
              >
                <img src={deco.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                {isSelected && (
                  <TransformHandles />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
