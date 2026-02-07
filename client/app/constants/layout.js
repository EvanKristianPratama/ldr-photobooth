export const LAYOUTS = {
  layout1: { shots: 1, label: 'Layout 1' },
  layout2: { shots: 2, label: 'Layout 2' },
  layout3: { shots: 3, label: 'Layout 3' }
};

export const FRAME_CANVAS = {
  cellW: 1200,
  cellH: 1800,
  gap: 100,
  headerH: 170,
  footerH: 260
};

export const COUNTDOWN_SECONDS = 6;
export const SHOT_DELAY_MS = 2000;
export const PROCESSING_RETRY_LIMIT = 40;
export const PROCESSING_RETRY_DELAY_MS = 500;
export const CHUNK_SIZE = 64 * 1024;

export const DEFAULT_FRAME_SRC = '/frame.png';

export const FRAME_PRESETS = [
  {
    id: 'default',
    label: 'Default',
    mode: 'default',
    description: 'Layout asli'
  },
  {
    id: 'classic',
    label: 'Classic',
    mode: 'custom',
    src: '/frames/classic.svg',
    description: 'Border clean'
  },
  {
    id: 'soft',
    label: 'Soft',
    mode: 'custom',
    src: '/frames/soft.svg',
    description: 'Pastel vibes'
  },
  {
    id: 'midnight',
    label: 'Midnight',
    mode: 'custom',
    src: '/frames/midnight.svg',
    description: 'Dark glam'
  }
];

export const STEP_LABELS = [
  { id: 'join', label: 'Join', icon: '👋' },
  { id: 'room', label: 'Room', icon: '🏠' },
  { id: 'layout-select', label: 'Layout', icon: '🎨' },
  { id: 'countdown', label: 'Capture', icon: '📸' },
  { id: 'processing', label: 'Processing', icon: '⏳' },
  { id: 'frame-select', label: 'Frame', icon: '🖼' },
  { id: 'result', label: 'Download', icon: '💾' }
];
