/**
 * Konfigurasi standar ukuran kertas cetak photobooth.
 * Menggunakan pixel berdasarkan target resolusi (DPI).
 * Standar 300 DPI untuk kualitas cetak.
 */

export const DPI = 300;

export const PAPER_SIZES = {
  // 4R (4x6 inch)
  FOUR_R: {
    id: '4r',
    label: '4R (4x6")',
    width: 4 * DPI,  // 1200px
    height: 6 * DPI, // 1800px
    aspectRatio: 4 / 6,
    orientation: 'portrait',
  },
  
  // 2R (2x3 inch) biasanya digabung menjadi 4R
  TWO_R: {
    id: '2r',
    label: '2R (2.5x3.5")', // Sering dianggap 2R, meski aslinya variatif
    width: 2.5 * DPI,
    height: 3.5 * DPI,
    aspectRatio: 2.5 / 3.5,
  },

  // Strip standard photobooth (2x6 inch)
  STRIP_2x6: {
    id: 'strip_2x6',
    label: 'Strip (2x6")',
    width: 2 * DPI, // 600px
    height: 6 * DPI, // 1800px
    aspectRatio: 2 / 6,
  }
};

/**
 * Menerapkan skala dinamis untuk sel/foto agar fit ke frame tertentu
 */
export const CANVAS_BASE_CONFIG = {
  cellW: 500,
  cellH: 750,
  gap: 40,
  headerH: 150,
  footerH: 200
};
