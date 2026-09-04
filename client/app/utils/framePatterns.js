/**
 * Utilitas untuk menggambar pola latar belakang bingkai (Frame Patterns)
 * pada kanvas photobooth secara dinamis & tajam.
 */

// Helper: hitung relative luminance warna hex/rgb
function getLuminance(colorStr) {
  if (!colorStr) return 1;
  let r = 255, g = 255, b = 255;
  const str = colorStr.trim();
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (str.startsWith('rgb')) {
    const match = str.match(/\d+/g);
    if (match && match.length >= 3) {
      r = parseInt(match[0], 10);
      g = parseInt(match[1], 10);
      b = parseInt(match[2], 10);
    }
  }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Gambar pola ke context kanvas 2D
 * @param {CanvasRenderingContext2D} ctx - Context kanvas
 * @param {number} width - Lebar kanvas
 * @param {number} height - Tinggi kanvas
 * @param {string} patternType - Tipe pattern ('none', 'polkadot', 'topography', dll.)
 * @param {string} frameColor - Warna bingkai aktif
 */
export function drawFramePattern(ctx, width, height, patternType, frameColor = '#ffffff') {
  if (!patternType || patternType === 'none') return;

  ctx.save();

  const isLightBg = getLuminance(frameColor) > 0.55;
  // Kontras adaptif: jika bg terang, warna pola semi-transparan gelap; jika gelap, warna putih halus
  const patternFillColor = isLightBg ? 'rgba(25, 25, 35, 0.15)' : 'rgba(255, 255, 255, 0.22)';
  const patternStrokeColor = isLightBg ? 'rgba(25, 25, 35, 0.18)' : 'rgba(255, 255, 255, 0.25)';

  switch (patternType) {
    case 'polkadot': {
      // Polkadot bersusun selang-seling (offset polka)
      const stepX = 40;
      const stepY = 36;
      const radius = 5;

      ctx.fillStyle = patternFillColor;
      for (let y = 0; y < height + stepY; y += stepY) {
        const isRowOdd = Math.floor(y / stepY) % 2 === 1;
        const offsetX = isRowOdd ? stepX / 2 : 0;
        for (let x = -stepX; x < width + stepX; x += stepX) {
          ctx.beginPath();
          ctx.arc(x + offsetX, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'topography': {
      // Pola garis kontur elevasi topografi (Topographic Contour Lines)
      ctx.strokeStyle = patternStrokeColor;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Buat beberapa pusat kontur bukit/elevasi dengan variasi ketinggian
      const centers = [
        { x: width * 0.2, y: height * 0.15, rings: 14, maxR: 420 },
        { x: width * 0.85, y: height * 0.35, rings: 18, maxR: 500 },
        { x: width * 0.35, y: height * 0.65, rings: 16, maxR: 460 },
        { x: width * 0.8, y: height * 0.88, rings: 15, maxR: 440 },
        { x: width * 0.05, y: height * 0.92, rings: 12, maxR: 380 },
      ];

      centers.forEach((c, cIdx) => {
        const ringStep = c.maxR / c.rings;
        for (let i = 1; i <= c.rings; i++) {
          const baseR = i * ringStep;
          ctx.beginPath();
          const segments = 48;
          for (let s = 0; s <= segments; s++) {
            const angle = (s / segments) * Math.PI * 2;
            // Distorsi organik membentuk kurva peta topografi asli
            const wave1 = Math.sin(angle * 2 + cIdx * 1.5) * (baseR * 0.14);
            const wave2 = Math.cos(angle * 3 + cIdx) * (baseR * 0.08);
            const wave3 = Math.sin(angle * 5) * 6;
            const r = baseR + wave1 + wave2 + wave3;
            const px = c.x + Math.cos(angle) * r;
            const py = c.y + Math.sin(angle) * r;

            if (s === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.closePath();
          ctx.stroke();
        }
      });

      // Tambahkan beberapa garis kontur melintang pemersatu
      const waveLinesCount = 8;
      const waveSpacing = height / (waveLinesCount + 1);
      for (let w = 1; w <= waveLinesCount; w++) {
        const baseY = w * waveSpacing;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 15) {
          const y = baseY + Math.sin(x * 0.008 + w) * 25 + Math.cos(x * 0.015 - w * 0.5) * 15;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }

    case 'checkered': {
      // Papan catur / Gingham retro
      const size = 32;
      ctx.fillStyle = patternFillColor;
      for (let y = 0; y < height; y += size) {
        const isRowOdd = Math.floor(y / size) % 2 === 1;
        for (let x = 0; x < width; x += size) {
          const isColOdd = Math.floor(x / size) % 2 === 1;
          if ((isRowOdd && !isColOdd) || (!isRowOdd && isColOdd)) {
            ctx.fillRect(x, y, size, size);
          }
        }
      }
      break;
    }

    case 'stripes': {
      // Garis diagonal 45 derajat estetik
      ctx.strokeStyle = patternStrokeColor;
      ctx.lineWidth = 14;
      const stripeGap = 36;
      const diagMax = width + height;
      for (let d = -height; d < diagMax; d += stripeGap) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + height, height);
        ctx.stroke();
      }
      break;
    }

    case 'hearts': {
      // Taburan hati kecil
      const stepX = 54;
      const stepY = 48;
      ctx.fillStyle = patternFillColor;

      for (let y = 10; y < height + stepY; y += stepY) {
        const isRowOdd = Math.floor(y / stepY) % 2 === 1;
        const offsetX = isRowOdd ? stepX / 2 : 0;
        for (let x = 10; x < width + stepX; x += stepX) {
          const cx = x + offsetX;
          const cy = y;
          const s = 0.8; // scale
          ctx.save();
          ctx.translate(cx, cy);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(0, -6 * s, -8 * s, -6 * s, -8 * s, 0);
          ctx.bezierCurveTo(-8 * s, 6 * s, 0, 10 * s, 0, 13 * s);
          ctx.bezierCurveTo(0, 10 * s, 8 * s, 6 * s, 8 * s, 0);
          ctx.bezierCurveTo(8 * s, -6 * s, 0, -6 * s, 0, 0);
          ctx.fill();
          ctx.restore();
        }
      }
      break;
    }

    case 'stars': {
      // Taburan bintang sparkle 4-pointed
      const stepX = 50;
      const stepY = 50;
      ctx.fillStyle = patternFillColor;

      for (let y = 15; y < height + stepY; y += stepY) {
        const isRowOdd = Math.floor(y / stepY) % 2 === 1;
        const offsetX = isRowOdd ? stepX / 2 : 0;
        for (let x = 15; x < width + stepX; x += stepX) {
          const cx = x + offsetX;
          const cy = y;
          const r = 7;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.quadraticCurveTo(0, 0, 0, r);
          ctx.quadraticCurveTo(0, 0, -r, 0);
          ctx.quadraticCurveTo(0, 0, 0, -r);
          ctx.fill();
          ctx.restore();
        }
      }
      break;
    }

    case 'grid': {
      // Grid minimalis
      const gridSize = 32;
      ctx.strokeStyle = patternStrokeColor;
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }

    case 'wavy': {
      // Gelombang retro berulang
      const waveSpacing = 36;
      ctx.strokeStyle = patternStrokeColor;
      ctx.lineWidth = 2.5;

      for (let y = 10; y < height + waveSpacing; y += waveSpacing) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 10) {
          const py = y + Math.sin(x * 0.05) * 6;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        ctx.stroke();
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();
}
