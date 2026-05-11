# Analisis Ukuran Kertas & Rencana Struktur Layer Frame

## 1. Status Ukuran Saat Ini: Apakah Fix 4R?

**Jawaban:** Saat ini **BELUM FIX 4R**. 

Kode saat ini (`useFrame.js`) menggunakan kalkulasi dimensi dinamis berdasarkan jumlah orang (partisipan) dan jumlah jepretan (shots).
- Lebar Cell: `500px`
- Tinggi Cell: `750px`
- Gap: `40px`

Sebagai contoh, jika ada 2 orang (Duo) x 4 shot:
- Total Lebar = `(500 * 2) + (40 * 3) = 1120px`
- Total Tinggi = `(750 * 4) + (40 * 5) + Header + Footer ≈ 3550px`
- Rasio ini adalah sekitar `1 : 3.17`, yang mana merupakan **Photobooth Strip**, bukan standar cetak 4R (Rasio `2 : 3` / `4 x 6 inch`).

### Cara Mendapatkan 4R (2x Strip dalam 1 Kertas)
Secara industri, photobooth biasanya mencetak **2 lembar strip 2x6 inch** secara bersebelahan di atas satu lembar kertas ukuran **4x6 inch (4R)**. Nanti kertas 4R tersebut dipotong di tengah menjadi dua buah strip 2x6.

---

## 2. Usulan Folder Struktur Baru (Best Practice)

Saya telah menambahkan folder baru di `client/app/configs/canvas` untuk memisahkan logika dimensi dan konsep layering yang Anda minta.

```text
📂 client/app/configs/canvas
├── 📄 paperSizes.js     <- Definisi ukuran kertas standard (4R, 2R, Strip)
└── 📄 layerRegistry.js  <- Definisi urutan tumpukan (Z-Index) saat Render Canvas
```

### Manfaat Pemisahan Ini:
1. **Scalable**: Ketika nanti menambah ukuran kertas baru (misal: Square, Instax Mini), Anda hanya perlu mengubah file konfigurasi, bukan logika render utamanya.
2. **Layering Siap Pakai**: Dengan mendefinisikan `layerRegistry`, proses rendering stiker, overlay frame, dan foto akan selalu berada di urutan yang konsisten tanpa saling tindih secara tidak sengaja.

---

## 3. Cara Menerapkan Konsep Layering (Render Pipeline)

Untuk mendukung konsep layering (misal Frame Overlay vs Background, ditambah Stiker di atasnya), ubah urutan pemanggilan fungsi `ctx` pada `useFrame.js` mengikuti urutan ini:

| Urutan | Layer | Tanggung Jawab |
| :--- | :--- | :--- |
| 1 | **BACKGROUND** | `ctx.fillStyle = activeFrameColor` (Kanvas paling dasar) |
| 2 | **UNDERLAY** | Frame background / dekorasi dasar di bawah foto |
| 3 | **PHOTOS** | Penggambaran foto-foto hasil jepretan user |
| 4 | **FRAME_OVERLAY** | PNG Frame transparan (yang melubangi foto) |
| 5 | **TEXT** | Tulisan Nama, Lokasi, Tanggal |
| 6 | **STICKERS** | Stiker emoji/custom yang ditaruh oleh user |
| 7 | **POST_PROCESSING** | Efek visual global seperti Film Grain & Glare |

---

## 4. Contoh Kode Gabungan 2 Strip ke 4R (Mock Logic)

Jika ingin hasil akhirnya otomatis tergabung menjadi satu kanvas 4R, berikut adalah logika dasarnya:

```javascript
const create4RFromStrips = async (stripCanvas) => {
  const canvas4R = document.createElement('canvas');
  // Target 300 DPI (4x6 inch) = 1200x1800 px (Portrait) atau 1800x1200 (Landscape)
  canvas4R.width = 1800;
  canvas4R.height = 1200; 
  const ctx = canvas4R.getContext('2d');
  
  // Strip pertama di kiri
  ctx.drawImage(stripCanvas, 0, 0, 900, 1200); 
  
  // Strip kedua di kanan (Salinan yang sama)
  ctx.drawImage(stripCanvas, 900, 0, 900, 1200); 
  
  return canvas4R.toDataURL('image/jpeg');
};
```
