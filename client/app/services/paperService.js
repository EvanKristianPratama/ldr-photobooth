import { PAPER_SIZES } from '../configs/canvas/paperSizes';

/**
 * Memproses image canvas ke format kertas cetak final (4R, 2R, dsb).
 * Termasuk logika duplikasi untuk Photobooth Strip klasik.
 */
export const convertToPaperSize = async (imgSrc, config = {}) => {
  const { 
    targetPaper = 'AUTO', // 'AUTO', '4R', '2R_STRIP'
    layout = 'strip', 
    sessionMode = 'solo', 
    count = 4,
    frameColor = '#ffffff' 
  } = config;

  // Load image element dari source data URL
  const img = await new Promise((resolve) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.src = imgSrc;
  });

  // 1. Logika Penentuan Format Otomatis
  let finalPaper = targetPaper;
  if (finalPaper === 'AUTO') {
    // Jika Wide/Grid, langsung jadikan 4R
    if (layout === 'grid' || sessionMode === 'duo') {
      finalPaper = '4R';
    } else if (sessionMode === 'solo' && layout === 'strip') {
      // Kalau strip solo, defaultnya kita packing 2 strip ke 4R biar siap cetak hemat kertas
      finalPaper = '4R_DUPLICATED_STRIP';
    } else {
      finalPaper = 'ORIGINAL'; // Biarkan ukuran dinamis aslinya
    }
  }

  // 2. Proses Penggabungan / Scaling
  if (finalPaper === '4R_DUPLICATED_STRIP') {
    return drawDuplicatedStripTo4R(img, frameColor);
  } else if (finalPaper === '4R') {
    return drawToFixedPaper(img, PAPER_SIZES.FOUR_R, frameColor);
  } else if (finalPaper === 'RECEIPT_80MM') {
    return drawToReceipt80mm(img);
  }

  // Jika tidak ada modifikasi, kembalikan aslinya
  return imgSrc;
};

/**
 * Memproses gambar menjadi format struk (receipt) lebar 80mm (800px) 
 * dengan konversi seluruh elemen ke hitam putih kontras tinggi (thermal style).
 */
const drawToReceipt80mm = (img) => {
  const canvas = document.createElement('canvas');
  
  // Lebar standar 80mm di-render pada 800px agar tajam.
  const targetW = 800;
  // Tinggi menyesuaikan rasio asli agar tidak terpotong atau terdistorsi.
  const targetH = Math.round(img.height * (targetW / img.width));
  
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  
  // Gambar image asli ke canvas baru
  ctx.drawImage(img, 0, 0, targetW, targetH);
  
  // Ambil data pixel untuk diproses menjadi hitam putih thermal kontras tinggi
  try {
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Hitung luminance standar (grayscale)
      let gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Terapkan kurva kontras tinggi untuk simulasi cetakan kertas thermal.
      // Warna yang sangat terang dijadikan putih mutlak (kertas struk).
      // Warna yang gelap dijadikan hitam pekat (tinta thermal).
      // Midtones disesuaikan agar tetap terlihat tajam.
      if (gray > 185) {
        gray = 255;
      } else if (gray < 55) {
        gray = 0;
      } else {
        // Kontras peregangan untuk sisa rentang abu-abu
        gray = ((gray - 55) / 130) * 255;
        // Clamp nilai
        gray = Math.max(0, Math.min(255, gray));
      }
      
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
  } catch (e) {
    console.error('LDR Receipt B&W processing failed, fallback to filter:', e);
    // Fallback menggunakan filter CSS jika getImageData gagal/akses lintas asal
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.filter = 'grayscale(100%) contrast(150%) brightness(100%)';
    ctx.drawImage(img, 0, 0, targetW, targetH);
    ctx.filter = 'none';
  }
  
  return canvas.toDataURL('image/jpeg', 0.9);
};

/**
 * Menduplikasi satu strip vertikal menjadi dua buah strip berdampingan 
 * di atas kanvas landscape 4R (6x4 inch). Standar print photobooth.
 */
const drawDuplicatedStripTo4R = (img, fillColor = '#ffffff') => {
  const canvas = document.createElement('canvas');
  
  // Target 4R Landscape (6 x 4 inch @ 300DPI = 1800 x 1200)
  const targetW = 1800;
  const targetH = 1200;
  
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  
  // Background dinamis sesuai frame
  ctx.fillStyle = fillColor;
  ctx.fillRect(0, 0, targetW, targetH);
  
  // Hitung skala proporsional agar strip masuk ke tinggi kertas (targetH)
  // Kita asumsikan layout landscape, jadi 2 strip diletakkan memanjang secara tegak.
  // Tapi 4R landscape = 1800x1200. Tiap strip dapat jatah lebar 900px.
  
  const scale = targetH / img.height;
  const scaledW = img.width * scale;
  
  // Letakkan strip 1 (tengah area kiri: 0 - 900)
  const posX1 = (targetW / 4) - (scaledW / 2);
  ctx.drawImage(img, posX1, 0, scaledW, targetH);
  
  // Letakkan strip 2 (tengah area kanan: 900 - 1800)
  const posX2 = (3 * targetW / 4) - (scaledW / 2);
  ctx.drawImage(img, posX2, 0, scaledW, targetH);
  
  // Tambahkan garis bantu potong super tipis di tengah (optional)
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.moveTo(targetW / 2, 0);
  ctx.lineTo(targetW / 2, targetH);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.9);
};

/**
 * Memaksa (Fit) image ke satu ukuran kertas tertentu (Misal fix 4R Portrait).
 */
const drawToFixedPaper = (img, paperConfig, fillColor = '#ffffff') => {
  const canvas = document.createElement('canvas');
  let targetW = paperConfig.width;
  let targetH = paperConfig.height;
  
  // Dinamis: Jika gambar sumber adalah Landscape, tukar dimensi kertas ke Landscape agar sinkron!
  const isImgLandscape = img.width > img.height;
  const isPaperLandscape = targetW > targetH;
  
  if (isImgLandscape !== isPaperLandscape) {
    // Flip dimensi
    const temp = targetW;
    targetW = targetH;
    targetH = temp;
  }
  
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = fillColor;
  ctx.fillRect(0, 0, targetW, targetH);
  
  // Hitung fitting (Object-fit: contain) agar tidak gepeng
  const imgRatio = img.width / img.height;
  const targetRatio = targetW / targetH;
  
  let drawW, drawH, x, y;
  if (imgRatio > targetRatio) {
    drawW = targetW;
    drawH = targetW / imgRatio;
    x = 0;
    y = (targetH - drawH) / 2;
  } else {
    drawH = targetH;
    drawW = targetH * imgRatio;
    x = (targetW - drawW) / 2;
    y = 0;
  }
  
  ctx.drawImage(img, x, y, drawW, drawH);
  
  return canvas.toDataURL('image/jpeg', 0.9);
};
