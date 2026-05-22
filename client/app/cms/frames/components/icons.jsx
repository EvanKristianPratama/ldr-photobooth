import React from 'react';

/**
 * Shared SVG icon components for CMS Frame Editor.
 * Replaces dozens of duplicated inline SVGs across components.
 */

const icon = (children, size = 14) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2">
    {children}
  </svg>
);

// ── Layer Type Icons ──
export const CameraIcon = ({ size = 14 }) => icon(
  <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
  size
);

export const TextIcon = ({ size = 14 }) => icon(
  <><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>,
  size
);

export const LayersIcon = ({ size = 14 }) => icon(
  <><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></>,
  size
);

export const PanelIcon = ({ size = 14 }) => icon(
  <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></>,
  size
);

export const GridIcon = ({ size = 14 }) => icon(
  <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18M3 15h18"/></>,
  size
);

// ── Action Icons ──
export const ChevronUpIcon = ({ size = 12 }) => icon(
  <polyline points="18 15 12 9 6 15"/>,
  size
);

export const ChevronDownIcon = ({ size = 12 }) => icon(
  <polyline points="6 9 12 15 18 9"/>,
  size
);

export const LockIcon = ({ size = 12 }) => icon(
  <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  size
);

export const UnlockIcon = ({ size = 12 }) => icon(
  <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>,
  size
);

export const EyeIcon = ({ size = 12 }) => icon(
  <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  size
);

export const EyeOffIcon = ({ size = 12 }) => icon(
  <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
  size
);

export const CopyIcon = ({ size = 12 }) => icon(
  <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  size
);

export const TrashIcon = ({ size = 12 }) => icon(
  <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  size
);

export const UndoIcon = ({ size = 14 }) => icon(
  <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>,
  size
);

export const RedoIcon = ({ size = 14 }) => icon(
  <path d="M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>,
  size
);

export const ArrowLeftIcon = ({ size = 12 }) => icon(
  <path d="M19 12H5M12 19l-7-7 7-7"/>,
  size
);

export const SettingsIcon = ({ size = 14 }) => icon(
  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  size
);

// ── Toolbar Icons ──
export const CanvasIcon = ({ size = 14 }) => icon(
  <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/></>,
  size
);

export const FileIcon = ({ size = 14 }) => icon(
  <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  size
);

export const GlobeIcon = ({ size = 14 }) => icon(
  <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  size
);

export const SoloUserIcon = ({ size = 14 }) => icon(
  <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  size
);

export const DuoUserIcon = ({ size = 14 }) => icon(
  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  size
);

export const SmileIcon = ({ size = 14 }) => icon(
  <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
  size
);

export const FolderIcon = ({ size = 14 }) => icon(
  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>,
  size
);

export const PlusIcon = ({ size = 14 }) => icon(
  <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  size
);

// ── Alignment Icons ──
export const AlignCenterHIcon = ({ size = 12 }) => icon(
  <><line x1="12" y1="2" x2="12" y2="22"/><rect x="6" y="6" width="12" height="12" rx="1"/></>,
  size
);

export const AlignCenterVIcon = ({ size = 12 }) => icon(
  <><line x1="2" y1="12" x2="22" y2="12"/><rect x="6" y="6" width="12" height="12" rx="1"/></>,
  size
);

export const AlignLeftIcon = ({ size = 12 }) => icon(
  <><line x1="4" y1="2" x2="4" y2="22"/><rect x="8" y="6" width="12" height="12" rx="1"/></>,
  size
);

export const AlignRightIcon = ({ size = 12 }) => icon(
  <><line x1="20" y1="2" x2="20" y2="22"/><rect x="4" y="6" width="12" height="12" rx="1"/></>,
  size
);
