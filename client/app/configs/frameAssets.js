/**
 * Menyimpan preset visual statis untuk editor frame agar komponen view tetap bersih.
 */

export const FRAME_LAYOUT_OPTIONS = [
  { id: 'strip', label: 'Strip' },
  { id: 'grid', label: 'Wide' }
];

export const FRAME_FONTS = [
  { id: "'Quicksand', sans-serif", label: 'Modern', preview: 'Aa' },
  { id: "'Gaegu', cursive", label: 'Doodle', preview: 'Aa' },
  { id: "'Pastel Crayon', cursive", label: 'Crayon', preview: 'Aa' },
  { id: "'Calculator', monospace", label: 'Calculator', preview: 'Aa' },
  { id: "'VT323', monospace", label: 'LCD Retro', preview: 'Aa' },
  { id: "'Silkscreen', monospace", label: 'Pixel', preview: 'Aa' },
  { id: "'Special Elite', cursive", label: 'Typewriter', preview: 'Aa' },
  { id: "'Pacifico', cursive", label: 'Retro Neon', preview: 'Aa' },
  { id: "'Caveat', cursive", label: 'Script', preview: 'Aa' },
  { id: "'Playfair Display', serif", label: 'Elegant', preview: 'Aa' }
];

export const FRAME_COLORS = [
  { bg: '#ffffff', text: '#1a1a2e', date: '#aaa' },
  { bg: '#1a1a2e', text: '#fffdf5', date: 'rgba(255,255,255,0.3)' },
  { bg: '#ffd93d', text: '#1a1a2e', date: '#666' },
  { bg: '#ff6b9d', text: '#1a1a2e', date: 'rgba(0,0,0,0.4)' },
  { bg: '#06d6a0', text: '#1a1a2e', date: 'rgba(0,0,0,0.4)' },
  { bg: '#c77dff', text: '#1a1a2e', date: 'rgba(0,0,0,0.4)' },
];

export const TEXT_COLORS = [
  '#ffffff',
  '#1a1a2e',
  '#ffd93d',
  '#ff6b9d',
  '#06d6a0',
  '#c77dff'
];

export const PHOTO_FILTERS = [
  { id: 'none', label: 'Normal', color: '#eee' },
  { id: 'bw', label: 'B&W', color: '#666' },
  { id: 'sepia', label: 'Sepia', color: '#a68069' },
  { id: 'vintage', label: 'Retro', color: '#8e735b' },
  { id: 'warm', label: 'Warm', color: '#ffb38a' },
  { id: 'cold', label: 'Cold', color: '#8ac6ff' },
];

export const FRAME_GLARES = [
  { id: 'none', label: 'None' },
  { id: 'warm', label: 'Warm' },
  { id: 'retro', label: 'Retro' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'fire', label: 'Fire' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'vintage', label: 'Vintage Wash' },
  { id: 'rainbow', label: 'Rainbow' },
  { id: 'cyberpunk', label: 'Cyberpunk' }
];

export const STICKER_PACK = [
  '✨', '💖', '⭐', '🎈', '🍀', '🎀', '🍭', '🌸', '🌈', '🍦', 
  '🍩', '🦋', '🐱', '🐶', '🦄', '🍎', '🍓', '🍕', '🍔', '🍟'
];
