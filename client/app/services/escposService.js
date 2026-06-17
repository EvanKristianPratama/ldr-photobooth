/**
 * @fileoverview ESC/POS Thermal Printer Service
 *
 * Dedicated service for converting images to ESC/POS binary commands and
 * transmitting them via Chrome Web Bluetooth API to thermal receipt printers.
 *
 * Architecture:
 *   Image → Grayscale → Floyd-Steinberg Dithering → Strip-based Raster → BLE Transmission
 *
 * Key design decision: Images are sent as multiple 24-row raster strips
 * (GS v 0 per strip) rather than one monolithic raster command. This prevents
 * buffer overflow on printers with small internal buffers (e.g., Iware XS80 BT
 * with ~16-20KB buffer), which causes the print head motor to stutter and
 * produce visible horizontal gap lines.
 *
 * @module escposService
 * @see print.md — Full protocol documentation
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default configuration for ESC/POS print operations.
 * These values are tuned for Iware XS80S via Chrome Web Bluetooth.
 *
 * @readonly
 * @enum {number}
 */
export const ESCPOS_DEFAULTS = Object.freeze({
  /** Print width in dots (80mm @ 203 DPI = 576 pixels) */
  PRINT_WIDTH: 576,

  /** Number of bytes per raster row (PRINT_WIDTH / 8) */
  WIDTH_BYTES: 72,

  /** Height of each raster strip in dots (standard 24-dot thermal head band) */
  STRIP_HEIGHT: 24,

  /** Safety padding rows appended after the last content row */
  PADDING_BOTTOM: 20,

  /** BLE chunk size in bytes — safe universal value below typical MTU (200-512) */
  BLE_CHUNK_SIZE: 128,

  /** Delay (ms) between chunks when using writeWithoutResponse (no flow control) */
  BLE_DELAY_WITHOUT_RESPONSE: 8,


  /** Delay (ms) between chunks when using writeWithResponse (ACK-based) */
  BLE_DELAY_WITH_RESPONSE: 2,

  /** Soft contrast factor applied during grayscale equalization (0.12 = gentle) */
  CONTRAST_FACTOR: 0.12,

  /** Feed lines appended before paper cut (ensures image clears the cutter) */
  FEED_LINES_BEFORE_CUT: 6,
});

/**
 * Standard BLE service UUIDs commonly used by thermal receipt printers.
 * @readonly
 */
const BLE_PRINTER_SERVICE_UUIDS = Object.freeze([
  '000018f0-0000-1000-8000-00805f9b34fb', // Printer GATT Service
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile
  '0000e808-0000-1000-8000-00805f9b34fb', // Generic raw write
]);

/**
 * ESC/POS command byte sequences.
 * @readonly
 */
const CMD = Object.freeze({
  /** ESC @ — Initialize/reset printer to default state */
  INIT:           [0x1B, 0x40],
  /** ESC 3 0 — Set line spacing to 0 dots (no gap between raster strips) */
  LINE_SPACING_0: [0x1B, 0x33, 0x00],
  /** LF — Line feed (advance paper one line) */
  LF:             [0x0A],
  /** GS V 66 0 — Partial cut paper */
  PARTIAL_CUT:    [0x1D, 0x56, 0x42, 0x00],
});

// ─────────────────────────────────────────────────────────────────────────────
// Image Processing (Private)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert RGBA pixel data to a grayscale map with soft contrast equalization.
 *
 * Uses standard ITU-R BT.601 luminance weights: 0.299R + 0.587G + 0.114B
 * Transparent pixels (alpha < 50) are mapped to white (255).
 *
 * @param {Uint8ClampedArray} pixels - RGBA pixel array from canvas getImageData
 * @param {number} width  - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {Int32Array} Grayscale values (0-255) for each pixel, in row-major order
 * @private
 */
function _convertToGrayscale(pixels, width, height) {
  const map = new Int32Array(width * height);
  const factor = ESCPOS_DEFAULTS.CONTRAST_FACTOR;

  for (let i = 0; i < map.length; i++) {
    const idx = i * 4;
    const a = pixels[idx + 3];

    if (a < 50) {
      map[i] = 255; // Transparent → white (paper)
      continue;
    }

    const gray = Math.round(
      0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]
    );

    // Soft contrast: push brights brighter, darks darker — gently
    map[i] = gray > 128
      ? Math.min(255, Math.round(gray + (gray - 128) * factor))
      : Math.max(0, Math.round(gray - (128 - gray) * factor));
  }

  return map;
}

/**
 * Apply Floyd-Steinberg dithering to convert a grayscale map to pure black/white.
 *
 * Distributes quantization error to neighboring pixels:
 *   [*]  7/16 →
 *   3/16 ↓5/16 ↘1/16
 *
 * Mutates the input map in-place for memory efficiency.
 *
 * @param {Int32Array} map - Grayscale pixel map (mutated to 0 or 255)
 * @param {number} width  - Image width in pixels
 * @param {number} height - Image height in pixels
 * @private
 */
function _applyFloydSteinberg(map, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = map[idx];
      const newVal = oldVal > 128 ? 255 : 0;

      map[idx] = newVal;
      const err = oldVal - newVal;

      if (x + 1 < width)                    map[idx + 1]             += Math.round(err * 7 / 16);
      if (y + 1 < height) {
        if (x - 1 >= 0)                     map[idx + width - 1]     += Math.round(err * 3 / 16);
                                             map[idx + width]         += Math.round(err * 5 / 16);
        if (x + 1 < width)                  map[idx + width + 1]     += Math.round(err * 1 / 16);
      }
    }
  }
}

/**
 * Scan bottom-up to find the last row containing a black pixel.
 * Used to auto-crop trailing whitespace and save paper.
 *
 * @param {Int32Array} map - Dithered pixel map (0=black, 255=white)
 * @param {number} width  - Image width in pixels
 * @param {number} height - Image height in pixels
 * @returns {number} Index of the last row with content, or -1 if entirely white
 * @private
 */
function _findLastContentRow(map, width, height) {
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      if (map[y * width + x] === 0) return y;
    }
  }
  return -1;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS Raster Builder (Private)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pack one horizontal strip of dithered pixels into a GS v 0 raster command.
 *
 * Command format: 1D 76 30 m xL xH yL yH [pixel data...]
 *   m  = 0 (normal density)
 *   xL/xH = width in bytes (72 for 576 dots)
 *   yL/yH = strip height in dots
 *
 * Pixel packing: MSB-first, 1=black, 0=white
 *   e.g., 8 pixels [■■□□■□■□] = 0b11001010 = 0xCA
 *
 * @param {Int32Array} map        - Dithered pixel map
 * @param {number}     width      - Image width in pixels (must be divisible by 8)
 * @param {number}     startRow   - First row index of this strip
 * @param {number}     stripHeight - Number of rows in this strip
 * @returns {number[]} Array of bytes: GS v 0 header + packed pixel data
 * @private
 */
function _packStripToRasterBytes(map, width, startRow, stripHeight, doubleHeight = false) {
  const widthBytes = width / 8;
  const bytes = [];

  // GS v 0 header for this strip
  bytes.push(
    0x1D, 0x76, 0x30,
    doubleHeight ? 0x02 : 0x00,      // m = 2 (double height) or 0 (normal)
    widthBytes & 0xFF,               // xL
    (widthBytes >> 8) & 0xFF,        // xH
    stripHeight & 0xFF,              // yL
    (stripHeight >> 8) & 0xFF        // yH
  );

  // Pack pixel data row by row
  for (let y = startRow; y < startRow + stripHeight; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixelIdx = y * width + xByte * 8 + bit;
        if (pixelIdx < map.length && map[pixelIdx] === 0) {
          byteVal |= (1 << (7 - bit)); // MSB = leftmost pixel, 1 = black
        }
      }
      bytes.push(byteVal);
    }
  }

  return bytes;
}

/**
 * Assemble a complete ESC/POS command buffer from raster strips.
 *
 * Structure:
 *   [ESC @]              — Initialize printer
 *   [ESC 3 0]            — Zero line spacing
 *   [GS v 0 strip 0]    — Raster strip 0 (24 rows)
 *   [GS v 0 strip 1]    — Raster strip 1 (24 rows)
 *   ...
 *   [GS v 0 strip N]    — Last strip (≤24 rows)
 *   [LF × 6]            — Feed paper past cutter
 *   [GS V 66 0]         — Partial cut
 *
 * @param {number[][]} strips - Array of packed strip byte arrays
 * @returns {Uint8Array} Complete ESC/POS binary buffer ready for transmission
 * @private
 */
function _buildEscPosBuffer(strips, options = {}) {
  const buffer = [];

  // Header: initialize + zero line spacing
  buffer.push(...CMD.INIT);

  if (options.slowdown) {
    // GS ( K pL=2 pH=0 fn=50 m=1 (Select print speed 1 = slowest)
    buffer.push(0x1D, 0x28, 0x4B, 0x02, 0x00, 0x32, 0x01);
  }

  buffer.push(...CMD.LINE_SPACING_0);


  // Raster strips
  for (const strip of strips) {
    buffer.push(...strip);
  }

  // Footer: feed lines + partial cut
  for (let i = 0; i < ESCPOS_DEFAULTS.FEED_LINES_BEFORE_CUT; i++) {
    buffer.push(...CMD.LF);
  }
  buffer.push(...CMD.PARTIAL_CUT);

  return new Uint8Array(buffer);
}

// ─────────────────────────────────────────────────────────────────────────────
// BLE Bluetooth (Private)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Discover a writable GATT characteristic on the connected BLE server.
 * Scans all primary services and returns the first characteristic that
 * supports `write` or `writeWithoutResponse`.
 *
 * @param {BluetoothRemoteGATTServer} server - Connected GATT server
 * @returns {Promise<BluetoothRemoteGATTCharacteristic>} Writable characteristic
 * @throws {Error} If no writable characteristic is found
 * @private
 */
async function _discoverWriteCharacteristic(server) {
  const services = await server.getPrimaryServices();

  for (const service of services) {
    try {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          return char;
        }
      }
    } catch (e) {
      console.warn(`[escpos] Failed to scan service ${service.uuid}:`, e);
    }
  }

  throw new Error(
    'No writable characteristic found. Ensure the device is a GATT-capable thermal printer.'
  );
}

/**
 * Transmit binary data to a BLE characteristic in safe-sized chunks with
 * rate-limiting delays to prevent buffer overflow.
 *
 * Uses `.slice()` (not `.subarray()`) to create independent copies of each
 * chunk, avoiding race conditions from shared ArrayBuffer references when
 * BLE writes are still pending.
 *
 * @param {BluetoothRemoteGATTCharacteristic} characteristic - Target BLE characteristic
 * @param {Uint8Array} data    - Complete binary payload to transmit
 * @param {object}     [options]
 * @param {number}     [options.chunkSize=128]       - Bytes per BLE write
 * @param {number}     [options.delayWithoutResponse=8] - Ms delay for writeWithoutResponse
 * @param {number}     [options.delayWithResponse=2]    - Ms delay for writeWithResponse
 * @param {function}   [options.onProgress]           - Callback(sent, total) for progress tracking
 * @returns {Promise<void>}
 * @private
 */
async function _transmitChunks(characteristic, data, options = {}) {
  const {
    chunkSize = ESCPOS_DEFAULTS.BLE_CHUNK_SIZE,
    delayWithoutResponse = ESCPOS_DEFAULTS.BLE_DELAY_WITHOUT_RESPONSE,
    delayWithResponse = ESCPOS_DEFAULTS.BLE_DELAY_WITH_RESPONSE,
    onProgress,
  } = options;

  const useWriteWithoutResponse = characteristic.properties.writeWithoutResponse;
  const delay = useWriteWithoutResponse ? delayWithoutResponse : delayWithResponse;

  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const chunk = data.slice(offset, offset + chunkSize); // .slice() = safe independent copy

    if (useWriteWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValueWithResponse(chunk);
    }

    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    if (onProgress) {
      onProgress(Math.min(offset + chunkSize, data.length), data.length);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an image element to ESC/POS binary raster data using strip-based encoding.
 *
 * Pipeline:
 *   1. Resize to print width (576px for 80mm)
 *   2. Convert to grayscale with soft contrast equalization
 *   3. Apply Floyd-Steinberg dithering (grayscale → pure B/W)
 *   4. Auto-crop trailing whitespace
 *   5. Slice into 24-row strips, each with its own GS v 0 header
 *   6. Assemble complete ESC/POS buffer with init + strips + feed + cut
 *
 * Why strip-based? Sending one giant GS v 0 command with the full image height
 * causes buffer overflow on printers with small internal buffers (e.g., 16-20KB
 * on Iware XS80 BT). The printer runs out of buffered data mid-print, causing
 * the motor to stop and restart — producing visible horizontal gap lines.
 * Strip-based encoding keeps each raster command small (~1.7KB per 24 rows),
 * ensuring the printer buffer never runs dry.
 *
 * @param {HTMLImageElement} imgElement - Source image (can be color or B/W)
 * @param {object} [options]
 * @param {number} [options.printWidth=576]    - Target width in dots (576 for 80mm @ 203 DPI)
 * @param {number} [options.stripHeight=24]    - Rows per raster strip (24 = standard thermal head)
 * @returns {Uint8Array} Complete ESC/POS binary buffer ready for BLE transmission
 *
 * @example
 * const img = document.querySelector('img');
 * const bytes = imageToEscPosBytes(img);
 * // bytes.length ≈ 58,000 for a typical 800px-tall receipt image
 */
export function imageToEscPosBytes(imgElement, options = {}) {
  const {
    printWidth = ESCPOS_DEFAULTS.PRINT_WIDTH,
    stripHeight = ESCPOS_DEFAULTS.STRIP_HEIGHT,
    slowdown = false,
    doubleHeight = false,
    scale = 1.0,
  } = options;


  // ── Step 1: Resize to print width with scaling ──
  const targetWidth = Math.max(8, Math.round((printWidth * scale) / 8) * 8); // align to byte boundaries
  const proportionalHeight = imgElement.height * (targetWidth / imgElement.width);
  const printHeight = doubleHeight ? Math.round(proportionalHeight / 2) : Math.round(proportionalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = printWidth;
  canvas.height = printHeight;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // White background
  ctx.fillRect(0, 0, printWidth, printHeight);

  // Center the image horizontally
  const dx = Math.max(0, Math.round((printWidth - targetWidth) / 2));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgElement, dx, 0, targetWidth, printHeight);

  const { data: pixels } = ctx.getImageData(0, 0, printWidth, printHeight);

  // ── Step 2: Grayscale + soft contrast ──
  const ditherMap = _convertToGrayscale(pixels, printWidth, printHeight);

  // ── Step 3: Floyd-Steinberg dithering ──
  _applyFloydSteinberg(ditherMap, printWidth, printHeight);

  // ── Step 4: Auto-crop trailing whitespace ──
  const lastContentRow = _findLastContentRow(ditherMap, printWidth, printHeight);
  const effectiveHeight = lastContentRow !== -1
    ? Math.min(printHeight, lastContentRow + 1 + ESCPOS_DEFAULTS.PADDING_BOTTOM)
    : printHeight;

  // ── Step 5: Build raster strips (24 rows each) ──
  const strips = [];
  for (let row = 0; row < effectiveHeight; row += stripHeight) {
    const currentStripHeight = Math.min(stripHeight, effectiveHeight - row);
    strips.push(_packStripToRasterBytes(ditherMap, printWidth, row, currentStripHeight, doubleHeight));
  }

  // ── Step 6: Assemble final buffer ──
  return _buildEscPosBuffer(strips, { slowdown });
}

/**
 * Send ESC/POS binary data to a Bluetooth thermal printer via Chrome Web Bluetooth API.
 *
 * Handles the full BLE lifecycle:
 *   1. Prompt user to select a BLE device (browser dialog)
 *   2. Connect to GATT server
 *   3. Discover writable characteristic
 *   4. Transmit data in safe-sized chunks with rate-limiting delays
 *
 * @param {Uint8Array} escPosBytes - Pre-compiled ESC/POS binary data
 * @param {object}     [options]
 * @param {function}   [options.onStatus]   - Callback(status: string, detail?: string) for UI updates
 * @param {function}   [options.onProgress] - Callback(sent: number, total: number) for progress bar
 * @returns {Promise<void>}
 * @throws {Error} On BLE connection failure, missing characteristic, or transmission error
 *
 * @example
 * const bytes = imageToEscPosBytes(img);
 * await sendViaBluetooth(bytes, {
 *   onStatus: (status, detail) => console.log(status, detail),
 *   onProgress: (sent, total) => console.log(`${sent}/${total} bytes`),
 * });
 */
export async function sendViaBluetooth(escPosBytes, options = {}) {
  const {
    onStatus,
    onProgress,
    chunkSize,
    delayWithoutResponse,
    delayWithResponse,
  } = options;

  // ── 1. Request device ──
  onStatus?.('requesting', 'Waiting for user to select a Bluetooth printer...');

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BLE_PRINTER_SERVICE_UUIDS,
  });

  // ── 2. Connect GATT ──
  onStatus?.('connecting', `Connecting to ${device.name || 'Printer'}...`);
  const server = await device.gatt.connect();

  // ── 3. Discover write characteristic ──
  onStatus?.('discovering', 'Searching for write characteristic...');
  const writeChar = await _discoverWriteCharacteristic(server);

  // ── 4. Transmit ──
  onStatus?.('printing', 'Transmitting ESC/POS data...');
  await _transmitChunks(writeChar, escPosBytes, {
    chunkSize,
    delayWithoutResponse,
    delayWithResponse,
    onProgress,
  });

  onStatus?.('done', 'Print complete');
}

