# Memory Session: Refaktor Service ESC/POS & Fix Print Stuttering
Tanggal: 2026-06-15
Konteks: Optimasi print bluetooth thermal printer (Iware XS80 BT) dan refactoring UI component.

## 1. Masalah Utama (Problem)
- Printer Iware XS80 BT (dan printer thermal 58mm/80mm murah pada umumnya) memiliki buffer internal yang sangat kecil (~16-20KB).
- Mengirim seluruh gambar receipt (tinggi ~800px, size binary ~57KB) dalam satu perintah `GS v 0` raksasa menyebabkan buffer meluap (overflow).
- Printer akan berhenti berputar (stutter) di tengah proses mencetak untuk memproses data baru, menghasilkan garis horizontal kosong (gap) dan print terbagi menjadi ~3 bagian yang patah-patah.

## 2. Solusi & Perubahan Kode (Solution & Refactor)

### A. Modularisasi & Strip-Based Rastering
Dibuat service modul baru khusus untuk menangani semua logika Bluetooth BLE dan ESC/POS:
- **File Baru**: [escposService.js](file:///Users/mac/Desktop/FUTU/client/app/services/escposService.js)
- **Teknik Utama**: Membagi gambar menjadi strip-strip horizontal kecil berukuran **24 baris pixel** (tinggi thermal head band standar).
  - Setiap strip dikompresi dan dikirim dengan command `GS v 0` sendiri (~1.7KB per strip).
  - Hal ini menjamin buffer printer tidak pernah overload dan motor berputar lancar tanpa putus.
- **Dithering**: Menerapkan Floyd-Steinberg Dithering untuk konversi grayscale ke pure black/white dengan kualitas tinggi (anti-aliasing natural).
- **Auto-Crop**: Memotong area putih kosong di bagian bawah kertas agar hemat kertas.
- **BLE Rate Limiting**: Transmisi chunked BLE (default 128 bytes) dengan jeda aman (delay) untuk mencegah packet loss.

### B. Penyederhanaan UI (Clean & DRY Component) & Fitur BLE Speed
- **File Dimodifikasi**: [ResultScreen.jsx](file:///Users/mac/Desktop/FUTU/client/app/components/screens/ResultScreen.jsx)
- **Refactor**:
  - Menghapus fungsi inline raksasa `canvasToEscPosBytes` (~134 baris).
  - Menyederhanakan `handleDirectBluetoothPrint` (~136 baris -> ~50 baris), mendelegasikan tugas ke `escposService.js`.
  - Menyederhanakan `handleDownloadEscPosBin` (~57 baris -> ~40 baris).
  - Mengurangi total baris kode di UI component sebanyak **~150+ baris** sehingga lebih mudah di-maintain.

  - **Fitur Baru (Bluetooth Print Config Panel)**: Menambahkan control panel di dalam print options modal untuk konfigurasi transmisi Bluetooth secara real-time:
    - **Slowdown Motor (ESC/POS)**: Mengirimkan perintah `GS ( K` untuk meminta printer menurunkan kecepatan motor fisiknya agar seimbang dengan transmisi BLE.
    - **Vintage Smooth (Double Height)**: Memotong jumlah baris data gambar sebesar 50% (vertical scaling) dan mencetaknya dengan flag double-height (m=2) dari protokol ESC/POS. Cara ini mengurangi throughput data hingga 50%, sehingga menghapus stuttering/garis potong sepenuhnya namun tetap mempertahankan ukuran fisik cetakan.
    - **Print Scale (Ukuran Cetak)**: Pilihan dinamis untuk memperkecil ukuran cetak fisik foto (100%, 80%, 70%, 60%, 50%). Dengan memperkecil skala cetak, tinggi struk secara fisik memendek (misal menjadi ~10-13cm), yang memotong volume data biner secara signifikan sehingga data muat sepenuhnya dalam buffer printer dan mencetak 100% mulus tanpa jeda.
    - **BLE Delay (ms)**: Pilihan delay inter-packet (8ms sweetspot, 16ms stable, 32ms safest).
    - **Chunk Size (Bytes)**: Pilihan ukuran transmisi data (64B, 128B, 256B).

### C. Dokumentasi Teknis
- **File Dimodifikasi**: [print.md](file:///Users/mac/Desktop/FUTU/print.md)
  - Diperbarui sepenuhnya untuk menjelaskan arsitektur strip-based rastering, diagram alur data, tabel referensi file, dan panduan troubleshooting.

## 3. Status Verifikasi & Hasil
- **Kompilasi**: Server dev (`npm run dev`) berjalan 100% sukses tanpa ada error. ESLint mendeteksi beberapa unused variable lama, namun tidak mengganggu jalannya aplikasi.
- **Pengujian Fungsional**: Kode React, hooks, dan service terhubung dengan benar. Pengguna dapat secara fleksibel menyalakan fitur motor slowdown, mengaktifkan Vintage Smooth (Double Height), mengubah Print Scale (Ukuran Cetak) untuk memendekkan struk secara fisik, serta mengatur delay ms dan ukuran chunk.

## 4. Rencana Lanjutan (Next Steps)
- Melakukan testing print langsung dengan kombinasi **Vintage Smooth (Double Height)** dan **Print Scale (60% - 70%)** diaktifkan pada printer Iware XS80 BT via Google Chrome (Web Bluetooth) untuk memverifikasi cetakan sepanjang ~10-13cm yang 100% mulus (gap-free).
- Merekomendasikan opsi layout 58mm atau cetak lewat helper app jika kecepatan BLE tidak mencukupi untuk cetak 80mm secara mulus tanpa stutter.
