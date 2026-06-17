# 🖨️ Dokumentasi Sistem Print Bluetooth ESC/POS — FUTU LDR Photobooth

## Overview

Sistem ini mencetak foto langsung dari browser ke printer thermal Iware XS80S (80mm) via **Chrome Web Bluetooth API** menggunakan perintah **ESC/POS** (Epson Standard Code for Point of Sale).

Semua logika ESC/POS dan Bluetooth dienkapsulasi dalam module service terpisah (`escposService.js`) agar komponen UI tetap bersih dan maintainable.

---

## Arsitektur Pipeline

```
mergedImage (data URL foto berwarna)
    │
    ▼
┌──────────────────────────────┐
│ paperService.js              │
│ drawToReceipt80mm()          │
│ - Resize ke 800px width      │
│ - Konversi ke grayscale      │
│ - Kontras tinggi thermal     │
│ → Output: JPEG data URL B&W  │
└──────────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│ escposService.js             │
│ imageToEscPosBytes()         │
│ - Resize ke 576px (80mm)     │
│ - Floyd-Steinberg dithering  │
│ - Auto-crop trailing white   │
│ - Pack ke STRIP-BASED raster │
│   (GS v 0 per 24 baris)     │
│ → Output: Uint8Array (bytes) │
└──────────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│ escposService.js             │
│ sendViaBluetooth()           │
│ Chrome Web Bluetooth API     │
│ - requestDevice()            │
│ - gatt.connect()             │
│ - _discoverWriteCharacteristic() │
│ - _transmitChunks (128B/8ms) │
│ → Output: cetak fisik 🖨️    │
└──────────────────────────────┘
```

---

## Module: `escposService.js`

### File: `client/app/services/escposService.js`

Module utama yang mengekstrak semua logika ESC/POS dan BLE dari komponen UI.

### Exports

| Export | Type | Deskripsi |
|--------|------|-----------|
| `imageToEscPosBytes(img, options?)` | Function | Konversi gambar → ESC/POS binary (strip-based raster) |
| `sendViaBluetooth(bytes, options?)` | Function | Kirim data via Chrome Web Bluetooth API |
| `ESCPOS_DEFAULTS` | Object | Konstanta default (tuned untuk Iware XS80S) |

### Konstanta Default (`ESCPOS_DEFAULTS`)

| Key | Value | Deskripsi |
|-----|-------|-----------|
| `PRINT_WIDTH` | 576 | Lebar cetak dalam dots (80mm @ 203 DPI) |
| `WIDTH_BYTES` | 72 | Bytes per baris raster (576 / 8) |
| `STRIP_HEIGHT` | 24 | Tinggi setiap strip raster (standar thermal head) |
| `PADDING_BOTTOM` | 20 | Padding safety setelah konten terakhir |
| `BLE_CHUNK_SIZE` | 128 | Bytes per BLE write operation |
| `BLE_DELAY_WITHOUT_RESPONSE` | 8 | Delay (ms) untuk writeWithoutResponse |
| `BLE_DELAY_WITH_RESPONSE` | 2 | Delay (ms) untuk writeWithResponse |
| `CONTRAST_FACTOR` | 0.12 | Faktor kontras soft equalization |
| `FEED_LINES_BEFORE_CUT` | 6 | Jumlah baris feed sebelum potong kertas |

### Internal Functions

| Function | Deskripsi |
|----------|-----------|
| `_convertToGrayscale(pixels, w, h)` | RGBA → grayscale + soft contrast (ITU-R BT.601) |
| `_applyFloydSteinberg(map, w, h)` | Floyd-Steinberg dithering (grayscale → pure B/W) |
| `_findLastContentRow(map, w, h)` | Scan bottom-up untuk auto-crop whitespace |
| `_packStripToRasterBytes(map, w, startRow, stripH)` | Pack 1 strip → GS v 0 header + pixel data |
| `_buildEscPosBuffer(strips)` | Assemble header + strips + footer → Uint8Array |
| `_discoverWriteCharacteristic(server)` | BLE GATT characteristic discovery |
| `_transmitChunks(char, data, options)` | Chunked BLE write dengan rate-limiting |

---

## TAHAP 1: Pre-processing Gambar (`paperService.js`)

### Fungsi: `drawToReceipt80mm(img)`
**File:** `client/app/services/paperService.js` baris 54-111

**Input:** HTMLImageElement (foto berwarna)
**Output:** JPEG data URL (grayscale kontras tinggi)

### Proses:
1. **Resize** ke lebar 800px (tinggi proporsional)
2. **Grayscale conversion** menggunakan luminance standar:
   ```
   gray = 0.299 * R + 0.587 * G + 0.114 * B
   ```
3. **Kontras tinggi thermal** — 3 zona:
   - `gray > 185` → putih (255) — kertas struk kosong
   - `gray < 55` → hitam (0) — tinta thermal pekat
   - `55-185` → stretched linear: `((gray - 55) / 130) * 255`
4. Output sebagai JPEG quality 0.9

### Kenapa 800px bukan 576px?
Karena `drawToReceipt80mm` hanya untuk **preview/download**. Konversi ke 576px (resolusi printer) dilakukan di tahap berikutnya oleh `imageToEscPosBytes`.

---

## TAHAP 2: Konversi ke ESC/POS Binary (`escposService.js`)

### Fungsi: `imageToEscPosBytes(imgElement, options?)`
**File:** `client/app/services/escposService.js`

**Input:** HTMLImageElement (dari receipt B&W JPEG)
**Output:** `Uint8Array` — raw ESC/POS binary commands

### Sub-tahap:

#### 2A. Resize ke Print Width (576 dots)
```javascript
const printWidth = 576; // 80mm @ 203 DPI = 576 pixels
const scale = printWidth / imgElement.width;
const printHeight = Math.round(imgElement.height * scale);
```
- Canvas baru 576 x proportionalHeight
- `imageSmoothingQuality = 'high'` untuk anti-alias

#### 2B. Grayscale + Soft Contrast (`_convertToGrayscale`)
```javascript
const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

// Soft contrast stretch (faktor 0.12)
if (gray > 128) eq = gray + (gray - 128) * 0.12;  // terang → lebih terang
else eq = gray - (128 - gray) * 0.12;              // gelap → lebih gelap
```
- Faktor 0.12 sangat lembut — mencegah grain kasar
- Pixel transparan (alpha < 50) → putih

#### 2C. Floyd-Steinberg Dithering (`_applyFloydSteinberg`)
Algoritma klasik yang mengkonversi grayscale → pure hitam/putih dengan ilusi gradasi:

```
Untuk setiap pixel:
  threshold > 128 → putih (255), else → hitam (0)
  error = oldValue - newValue
  
  Distribusi error ke tetangga:
  pixel[x+1]     += error * 7/16  (→ kanan)
  pixel[x-1,y+1] += error * 3/16  (↙ bawah-kiri)
  pixel[x,y+1]   += error * 5/16  (↓ bawah)
  pixel[x+1,y+1] += error * 1/16  (↘ bawah-kanan)
```

Visualisasi pattern distribusi error:
```
        [*]  7/16
  3/16  5/16  1/16
```

#### 2D. Auto-Crop Trailing Whitespace (`_findLastContentRow`)
```javascript
// Scan dari bawah ke atas, cari baris pertama yang punya pixel hitam
for (let y = printHeight - 1; y >= 0; y--) { ... }
effectiveHeight = lastContentRow + 1 + 20; // +20px padding safety
```
- Membuang area putih kosong di bawah gambar
- Menghemat kertas dan waktu print

#### 2E. Build Strip-Based Raster (FIX UTAMA!) 🔑

**SEBELUM (v1 — menyebabkan print patah 3 bagian):**
```
Satu GS v 0 raksasa:
[1D 76 30 00 48 00 yL yH] [72 × 800 = 57,600 bytes data]
                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                            Terlalu besar untuk buffer 16-20KB!

Printer buffer:  [████████████] → cetak → [kosong...tunggu data] → [████████████] → cetak → ...
Motor:           ON ──────────── OFF ─────────────────────────────── ON ────────── OFF ─── ...
Hasil:           ┃ BAGIAN 1 ┃ ═══ GAP ═══ ┃ BAGIAN 2 ┃ ═══ GAP ═══ ┃ BAGIAN 3 ┃
```

**SESUDAH (v2 — fix strip-based):**
```
Banyak GS v 0 kecil (24 baris per strip):
[1D 76 30 00 48 00 18 00] [72 × 24 = 1,728 bytes] ← strip 0
[1D 76 30 00 48 00 18 00] [72 × 24 = 1,728 bytes] ← strip 1
[1D 76 30 00 48 00 18 00] [72 × 24 = 1,728 bytes] ← strip 2
... × 33 strip total

Setiap strip hanya ~1.7KB → SELALU muat di buffer printer!

Printer buffer:  [█strip█] → cetak → [█strip█] → cetak → [█strip█] → cetak → ...
Motor:           ON ──────────────────────────────────────────────────────────── ...
Hasil:           ┃════════════════ GAMBAR HALUS TANPA GAP ═══════════════════┃
```

**Kenapa strip height = 24?**
- Standard thermal print head memiliki **24 heating elements** vertikal
- ESC/POS standard `ESC *` (GS v 0 juga) native support 24-dot band
- 24 baris × 72 bytes/baris = **1,728 bytes per strip** — jauh di bawah buffer minimum (~4KB)
- Overhead header per strip hanya 8 bytes (0.5% dari total strip size)

#### 2F. Assemble ESC/POS Buffer (`_buildEscPosBuffer`)

**Header commands:**
```
Byte Sequence          | Deskripsi
──────────────────────────────────────────
0x1B 0x40              | ESC @ — Initialize/reset printer
0x1B 0x33 0x00         | ESC 3 0 — Set line spacing = 0 (tanpa gap antar strip)
```

**Strip raster commands (×N strips):**
```
Per strip:
0x1D 0x76 0x30 m xL xH yL yH [data...]

  0x1D 0x76 0x30 = GS v 0 — Print raster bit image
  m   = 0 (normal mode, 1:1 density)
  xL  = 72 (widthBytes = 576/8)
  xH  = 0
  yL  = 24 (stripHeight)  ← BUKAN total height!
  yH  = 0
```

**Pixel data packing (per baris dalam strip):**
```
Setiap baris = 72 bytes (576 piksel / 8 bit per byte)
  
Byte packing (MSB first):
  Bit 7 = pixel paling kiri  → 1 = hitam, 0 = putih
  Bit 6 = pixel kedua
  ...
  Bit 0 = pixel paling kanan

Contoh: 8 pixel [■ ■ □ □ ■ □ ■ □] = 0b11001010 = 0xCA
```

**Footer commands:**
```
0x0A × 6               | LF × 6 — Feed 6 baris kosong (agar gambar keluar dari cutter)
0x1D 0x56 0x42 0x00    | GS V 66 0 — Partial cut paper
```

### Struktur Data Final (Uint8Array):
```
[ESC @] [ESC 3 0] [GS v 0 strip₀][data₀] [GS v 0 strip₁][data₁] ... [GS v 0 stripₙ][dataₙ] [LF×6] [GS V cut]
  2B      3B       8B    1728B      8B    1728B             8B    ≤1728B               6B      4B

Total size ≈ (8 + 72 × 24) × numStrips + 15 bytes header/footer
Contoh: gambar 800px tinggi → 34 strips → ~59,074 bytes
(Sedikit lebih besar dari v1 karena overhead header per strip, tapi hasilnya HALUS)
```

---

## TAHAP 3: Transmisi Bluetooth (`sendViaBluetooth`)

### Fungsi: `sendViaBluetooth(escPosBytes, options?)`
**File:** `client/app/services/escposService.js`

### Alur Koneksi BLE:

#### 3A. Request Device
```javascript
navigator.bluetooth.requestDevice({
  acceptAllDevices: true,
  optionalServices: BLE_PRINTER_SERVICE_UUIDS, // 3 UUID standard
});
```
- `acceptAllDevices: true` — tampilkan semua BLE device
- 3 UUID service yang umum di thermal printer

#### 3B. GATT Connect
```javascript
const server = await device.gatt.connect();
```
- Establish koneksi GATT (Generic Attribute Profile)
- Chrome handle MTU negotiation otomatis

#### 3C. Service & Characteristic Discovery (`_discoverWriteCharacteristic`)
```javascript
const services = await server.getPrimaryServices();
// Scan semua service → cari characteristic yang bisa write
for (const service of services) {
  const characteristics = await service.getCharacteristics();
  for (const char of characteristics) {
    if (char.properties.write || char.properties.writeWithoutResponse) {
      return char; // Prioritas: yang pertama ditemukan
    }
  }
}
```

#### 3D. Chunk Transmission (`_transmitChunks`) — KRITIS!
```javascript
const chunkSize = ESCPOS_DEFAULTS.BLE_CHUNK_SIZE;       // 128 bytes
const delay = useWriteWithoutResponse ? 8 : 2;           // ms

for (let offset = 0; offset < data.length; offset += chunkSize) {
  const chunk = data.slice(offset, offset + chunkSize);  // .slice() = safe copy
  
  if (useWriteWithoutResponse) {
    await characteristic.writeValueWithoutResponse(chunk);
  } else {
    await characteristic.writeValueWithResponse(chunk);
  }
  
  await new Promise(r => setTimeout(r, delay));
}
```

### Parameter Kritis & Alasannya:

| Parameter | Value | Kenapa |
|-----------|-------|--------|
| `BLE_CHUNK_SIZE` | **128 bytes** | BLE MTU setelah negosiasi biasanya 200-512. 128 aman untuk semua printer. Terlalu besar (512) → GATT error. Terlalu kecil (20) → lambat & stuttering |
| `BLE_DELAY_WITHOUT_RESPONSE` | **8ms** | writeWithoutResponse tidak punya flow control bawaan. Tanpa delay → buffer overflow di printer. Terlalu besar (50ms+) → motor stutter (garis horizontal) |
| `BLE_DELAY_WITH_RESPONSE` | **2ms** | writeWithResponse sudah punya ACK, jadi delay minimal cukup. Hanya untuk micro-breathing room |
| `.slice()` | (bukan `.subarray()`) | `.slice()` membuat copy baru → lebih aman karena BLE write bisa async. `.subarray()` share memory → risk race condition |

### Kenapa Delay Penting untuk Iware XS80S?

```
Delay terlalu besar (>15ms):
  ┌─────┐  ···gap···  ┌─────┐  ···gap···  ┌─────┐
  │chunk│             │chunk│             │chunk│
  └─────┘             └─────┘             └─────┘
  Motor: ON → OFF → ON → OFF → ON...
  Hasil: GARIS HORIZONTAL (motor stutter) ❌

Delay optimal (8ms):
  ┌─────┐──┌─────┐──┌─────┐──┌─────┐
  │chunk│  │chunk│  │chunk│  │chunk│
  └─────┘  └─────┘  └─────┘  └─────┘
  Motor: ON ─────────────────────...
  Hasil: HALUS tanpa gap ✅

Tanpa delay (0ms):
  ┌─────┐┌─────┐┌─────┐┌─────┐
  │chunk││chunk││chunk││chunk│ ← BLE buffer overflow!
  └─────┘└─────┘└─────┘└─────┘
  Hasil: GATT ERROR / data loss ❌
```

---

## Diagram Byte Flow Lengkap

```
Browser (Chrome)
    │
    │  writeValueWithoutResponse(chunk)  ← 128 bytes
    │  await delay(8ms)
    │  writeValueWithoutResponse(chunk)  ← 128 bytes
    │  await delay(8ms)
    │  ... repeat sampai habis ...
    │
    ▼
┌─────────────────────────┐
│  Chrome BLE Stack       │
│  - Segmentasi ke BLE    │
│    packet (20-244 bytes) │
│  - ATT Write Command    │
└─────────────────────────┘
    │
    │  BLE Radio 2.4GHz
    │
    ▼
┌─────────────────────────┐
│  Iware XS80S Printer    │
│  - BLE GATT Server      │
│  - Internal buffer      │
│  - ESC/POS interpreter  │
│    (proses per strip)    │
│  - Thermal print head   │
│  - Paper motor          │
│  - Auto-cutter          │
└─────────────────────────┘
    │
    ▼
  🧾 Printed Receipt (HALUS, tanpa gap!)
```

---

## Known Constraints & Gotchas

### ⚠️ JANGAN diubah tanpa testing:

1. **`BLE_CHUNK_SIZE = 128`** — Sudah teruji stabil. 512 menyebabkan GATT error pada Iware. 64 menyebabkan print lambat.

2. **`BLE_DELAY_WITHOUT_RESPONSE = 8`** — Sweet spot. Di bawah 5ms → buffer overflow. Di atas 15ms → motor stutter (garis horizontal pada hasil print).

3. **`STRIP_HEIGHT = 24`** — Standar industri thermal head. Jangan ubah ke nilai besar (seperti total height). Ini adalah fix utama untuk masalah print patah-patah.

4. **Tidak ada MTU probing** — Probe mengirim data ke printer yang bisa korupsi raster stream. Chunk 128 bytes sudah universal safe.

5. **Tidak ada reconnect logic** — Reconnect mid-print menyebabkan data loss. Lebih baik gagal total dan retry dari awal.

6. **`.slice()` bukan `.subarray()`** — `.slice()` membuat copy independen. `.subarray()` share buffer → bisa corrupt kalau BLE write masih pending.

### ⚠️ Printer Compatibility:
- **Iware XS80S** ✅ Tested, working (strip-based raster)
- **POS-58** ⚠️ Belum ditest. Mungkin perlu `printWidth = 384` (58mm)
- **Non-GATT printer** ❌ Tidak support (butuh Serial Port Profile, bukan BLE GATT)

---

## File Reference

| File | Fungsi | Deskripsi |
|------|--------|-----------|
| `client/app/services/escposService.js` | `imageToEscPosBytes()` | Image → strip-based ESC/POS binary |
| `client/app/services/escposService.js` | `sendViaBluetooth()` | BLE chunked transmission |
| `client/app/services/escposService.js` | `ESCPOS_DEFAULTS` | Tuned constants untuk Iware XS80S |
| `client/app/services/paperService.js` | `drawToReceipt80mm()` | Pre-process gambar ke B&W |
| `client/app/components/screens/ResultScreen.jsx` | `handleDirectBluetoothPrint()` | UI handler — delegates ke service |

---

## ESC/POS Command Reference (yang dipakai)

| Command | Hex | Deskripsi |
|---------|-----|-----------|
| ESC @ | `1B 40` | Initialize printer — reset semua setting |
| ESC 3 n | `1B 33 00` | Set line spacing ke n dots (0 = tanpa gap antar strip) |
| GS v 0 | `1D 76 30 00 xL xH yL yH` | Print raster bit image (1 strip per command) |
| LF | `0A` | Line feed (geser kertas 1 baris) |
| GS V | `1D 56 42 00` | Partial cut (potong kertas) |

### GS v 0 Detail:
```
1D 76 30 m xL xH yL yH [d1 d2 ... dk]

m  = mode (0=normal, 1=double-width, 2=double-height, 3=quadruple)
xL = (width_bytes) & 0xFF          → 72 untuk 576 dots
xH = (width_bytes) >> 8            → 0
yL = (strip_height) & 0xFF         → 24 (BUKAN total height!)
yH = (strip_height) >> 8           → 0
dk = pixel data (k = xL + xH×256) × (yL + yH×256) bytes
```

---

## Changelog

### v2.0 — Strip-based Raster (Current)
- **FIX:** Print patah-patah 3 bagian → HALUS tanpa gap
- **REFACTOR:** Ekstrak semua ESC/POS logic ke `escposService.js`
- **ARCH:** `ResultScreen.jsx` hanya panggil service (DRY, SRP)
- **DOC:** JSDoc lengkap pada semua exports dan internal functions

### v1.0 — Single Raster (Deprecated)
- Mengirim seluruh gambar sebagai 1× `GS v 0` command
- Menyebabkan motor stutter pada printer dengan buffer kecil (<20KB)
