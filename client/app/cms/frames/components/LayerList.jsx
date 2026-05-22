import React from 'react';
import {
  CameraIcon, TextIcon, LayersIcon, PanelIcon, GridIcon,
  ChevronUpIcon, ChevronDownIcon, LockIcon, UnlockIcon,
  EyeIcon, EyeOffIcon, CopyIcon, TrashIcon,
} from './icons';

/**
 * LayerList — Unified global layer panel showing all layers (slots, text, decorations, overlay, background).
 * Extracted from the IIFE in page.jsx for clarity and reusability.
 */

const LAYER_ICONS = {
  slot: CameraIcon,
  text: TextIcon,
  deco: LayersIcon,
  overlay: PanelIcon,
  background: GridIcon,
};

function LayerActionButtons({ layer, onReorder, onToggleLock, onToggleHide, onDuplicate, onDelete }) {
  const isSpecial = layer.type === 'background' || layer.type === 'overlay';

  return (
    <div className="cms-layer-chip__actions" onClick={e => e.stopPropagation()}>
      <button className="cms-layer-btn" title="Move Up" onClick={() => onReorder(layer.id, layer.type, 'up')}>
        <ChevronUpIcon />
      </button>
      <button className="cms-layer-btn" title="Move Down" onClick={() => onReorder(layer.id, layer.type, 'down')}>
        <ChevronDownIcon />
      </button>
      {!isSpecial && (
        <>
          <button
            className={`cms-layer-btn ${layer.locked ? 'state-active--warning' : ''}`}
            title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
            onClick={() => onToggleLock(layer.id, layer.type, !layer.locked)}
          >
            {layer.locked ? <LockIcon /> : <UnlockIcon />}
          </button>
          <button
            className={`cms-layer-btn ${layer.hidden ? 'state-active' : ''}`}
            title={layer.hidden ? 'Show Layer' : 'Hide Layer'}
            onClick={() => onToggleHide(layer.id, layer.type, !layer.hidden)}
          >
            {layer.hidden ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button className="cms-layer-btn" title="Duplicate Layer" onClick={() => onDuplicate(layer.id, layer.type)}>
            <CopyIcon />
          </button>
          <button className="cms-layer-btn cms-layer-btn--danger" title="Delete Layer" onClick={() => onDelete(layer.id, layer.type)}>
            <TrashIcon />
          </button>
        </>
      )}
    </div>
  );
}

export default function LayerList({
  slots,
  textElements,
  decorations,
  overlayPreview,
  backgroundZIndex,
  overlayZIndex,
  selectedSlotId,
  selectedTextId,
  selectedDecoId,
  onSelectSlot,
  onSelectText,
  onSelectDeco,
  onDeselectAll,
  onReorder,
  onToggleLock,
  onToggleHide,
  onDuplicate,
  onDelete,
}) {
  // Build unified layer array
  const allLayers = [
    ...slots.map(s => ({
      id: s.id, type: 'slot', label: s.label,
      zIndex: s.zIndex, locked: !!s.locked, hidden: !!s.hidden, owner: s.owner,
    })),
    ...textElements.map((t, idx) => ({
      id: t.id, type: 'text',
      label: t.content.length > 20 ? t.content.slice(0, 20) + '…' : t.content,
      zIndex: t.zIndex || (50 + idx), locked: !!t.locked, hidden: !!t.hidden,
    })),
    ...decorations.map(d => ({
      id: d.id, type: 'deco', label: 'Stiker',
      zIndex: d.zIndex, locked: !!d.locked, hidden: !!d.hidden,
    })),
  ];

  if (overlayPreview) {
    allLayers.push({ id: 'overlay', type: 'overlay', label: 'Overlay Frame (PNG)', zIndex: overlayZIndex ?? 90, locked: false, hidden: false });
  }
  allLayers.push({ id: 'background', type: 'background', label: 'Background Canvas', zIndex: backgroundZIndex ?? 10, locked: false, hidden: false });

  allLayers.sort((a, b) => b.zIndex - a.zIndex);

  const selectedId = selectedSlotId || selectedTextId || selectedDecoId || null;

  const handleSelect = (layer) => {
    if (layer.type === 'slot') onSelectSlot(layer.id);
    else if (layer.type === 'text') onSelectText(layer.id);
    else if (layer.type === 'deco') onSelectDeco(layer.id);
    else onDeselectAll();
  };

  return (
    <div className="cms-panel-section">
      <div className="cms-panel-section__title">
        <span className="cms-panel-section__title-inner">
          <PanelIcon /> Daftar Layer Global
        </span>
      </div>
      <div className="cms-layer-list">
        {allLayers.map(layer => {
          const IconComp = LAYER_ICONS[layer.type] || GridIcon;
          return (
            <div
              key={layer.id}
              className={`cms-layer-chip ${selectedId === layer.id ? 'active' : ''} ${layer.hidden ? 'state-hidden' : ''}`}
              onClick={() => handleSelect(layer)}
            >
              <span className="cms-layer-chip__icon"><IconComp /></span>
              <span className="cms-layer-chip__title">
                {layer.label}
                {layer.type === 'slot' && layer.owner && layer.owner !== 'any' && (
                  <span className={`cms-slot-chip__owner cms-slot-chip__owner--${layer.owner === 'userA' ? 'a' : 'b'}`} style={{ marginLeft: '8px' }}>
                    {layer.owner === 'userA' ? 'A' : 'B'}
                  </span>
                )}
              </span>
              <LayerActionButtons
                layer={layer}
                onReorder={onReorder}
                onToggleLock={onToggleLock}
                onToggleHide={onToggleHide}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
