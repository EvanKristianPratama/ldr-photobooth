/**
 * Mendefinisikan urutan render (Z-Index) dari sebuah frame photobooth.
 * Mempermudah penambahan fitur layering di masa depan (stiker, watermark, overlay, background).
 */

export const RENDER_LAYERS = {
  // Latar belakang paling bawah (Warna solid / Image background)
  BACKGROUND: {
    id: 'background',
    zIndex: 0,
    label: 'Background'
  },
  
  // Frame yang berada DI BAWAH foto (jika fotonya transparan / ditumpuk)
  UNDERLAY: {
    id: 'underlay',
    zIndex: 10,
    label: 'Frame Underlay'
  },
  
  // Slot untuk foto utama hasil jepretan
  PHOTOS: {
    id: 'photos',
    zIndex: 20,
    label: 'Captured Photos'
  },
  
  // Frame PNG utama yang memiliki lubang transparan (Overlay)
  FRAME_OVERLAY: {
    id: 'frame_overlay',
    zIndex: 30,
    label: 'Main Frame'
  },
  
  // Tulisan/Text dinamis (Nama, Lokasi, Tanggal)
  TEXT: {
    id: 'text',
    zIndex: 40,
    label: 'Dynamic Text'
  },
  
  // Stiker-stiker yang bisa digeser (User Generated Content)
  STICKERS: {
    id: 'stickers',
    zIndex: 50,
    label: 'User Stickers'
  },
  
  // Efek visual global (Grain, Glare, Filter warna di atas semuanya)
  POST_PROCESSING: {
    id: 'post_processing',
    zIndex: 60,
    label: 'Visual Effects'
  }
};

/**
 * Urutan penggambaran yang harus diikuti oleh engine render canvas.
 */
export const RENDER_ORDER = Object.values(RENDER_LAYERS).sort((a, b) => a.zIndex - b.zIndex);
