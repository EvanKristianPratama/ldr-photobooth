import 'dart:math' as math;
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;

class FrameMerger {
  static const int cellW = 500;
  static const int cellH = 750;
  static const int gap = 40;
  static const int headerH = 150;
  static const int footerH = 200;

  static Future<Uint8List?> mergePhotos({
    required int count,
    required List<Uint8List> photoList, // Decoded photo bytes
    required String frameColor,       // e.g. "#FFD93D"
    required String frameTextColor,   // e.g. "#FFFFFF"
    required String photoFilter,      // "none", "bw", "sepia", "vintage", "warm", "cold"
    required int frameNoise,          // 0 to 100
    required String frameGlare,       // "none", "warm", "retro", "aurora", "fire", "nebula", "sunset", "vintage", "rainbow", "cyberpunk"
    required String orientation,      // "portrait", "landscape"
    required String frameLayout,      // "strip", "grid"
    required String locTextLeft,
    required String locTextRight,
    required String frameDate,
  }) async {
    try {
      final isPortrait = orientation == 'portrait';
      final int cw = isPortrait ? cellW : cellH;
      final int ch = isPortrait ? cellH : cellW;

      final int totalW = (cw * 1) + (gap * 2);
      final int totalH = (ch * count) + (gap * (count + 1)) + headerH + footerH;

      // Create primary background canvas filled with specified frame color
      final Color bgHexColor = _parseHexColor(frameColor);
      final canvas = img.Image(width: totalW, height: totalH);
      img.fill(canvas, color: img.ColorRgb8(bgHexColor.red, bgHexColor.green, bgHexColor.blue));

      // Draw each photo tile onto the main canvas
      for (int i = 0; i < count; i++) {
        if (i >= photoList.length) break;
        
        img.Image? originalTile = img.decodeImage(photoList[i]);
        if (originalTile == null) continue;

        // Crop & Resize photo tile to fit specified target cell ratio and size
        final img.Image croppedTile = _cropAndResize(originalTile, cw, ch);

        // Apply our custom high-performance pixel-level filters
        _applyPixelFilter(croppedTile, photoFilter);

        // Draw tile onto the main canvas
        final int targetX = gap;
        final int targetY = headerH + gap + (i * (ch + gap));
        img.compositeImage(canvas, croppedTile, dstX: targetX, dstY: targetY);
      }

      // Apply Analog Film Grain Effect
      if (frameNoise > 0) {
        _applyFilmGrain(canvas, frameNoise);
      }

      // Apply Retro Camera Glare / Light Leak Effect
      if (frameGlare != 'none') {
        _applyCameraGlare(canvas, frameGlare);
      }

      // Render custom texts (Locations, names, dates) onto header & footer
      // Note: In pure Dart 'image' package, we draw basic characters or use built-in fonts.
      // For highly customizable font drawing, we output canvas and let Flutter render it,
      // or we use img.drawString with standard retro fonts. Let's draw with standard string:
      final Color textHexColor = _parseHexColor(frameTextColor);
      final imgColor = img.ColorRgb8(textHexColor.red, textHexColor.green, textHexColor.blue);
      
      // Draw left & right locations and date on footer
      img.drawString(canvas, locTextLeft.toUpperCase(), font: img.arial24, x: gap + 10, y: totalH - footerH + 30, color: imgColor);
      img.drawString(canvas, locTextRight.toUpperCase(), font: img.arial24, x: totalW - gap - 180, y: totalH - footerH + 30, color: imgColor);
      img.drawString(canvas, frameDate, font: img.arial14, x: totalW ~/ 2 - 35, y: totalH - footerH + 75, color: imgColor);

      // Encode finalized image to highly compressed premium JPG bytes
      return Uint8List.fromList(img.encodeJpg(canvas, quality: 88));
    } catch (e) {
      debugPrint('FrameMerger Error: $e');
      return null;
    }
  }

  static Color _parseHexColor(String hex) {
    String cleanHex = hex.replaceAll('#', '');
    if (cleanHex.length == 6) {
      cleanHex = 'FF$cleanHex';
    }
    return Color(int.parse(cleanHex, radix: 16));
  }

  static img.Image _cropAndResize(img.Image src, int targetW, int targetH) {
    final double srcRatio = src.width / src.height;
    final double targetRatio = targetW / targetH;
    
    int sw, sh, sx, sy;
    if (srcRatio > targetRatio) {
      sh = src.height;
      sw = (sh * targetRatio).round();
      sx = ((src.width - sw) / 2).round();
      sy = 0;
    } else {
      sw = src.width;
      sh = (sw / targetRatio).round();
      sx = 0;
      sy = ((src.height - sh) / 2).round();
    }

    final img.Image cropped = img.copyCrop(src, x: sx, y: sy, width: sw, height: sh);
    return img.copyResize(cropped, width: targetW, height: targetH);
  }

  static void _applyPixelFilter(img.Image image, String filter) {
    if (filter == 'none') return;

    for (final pixel in image) {
      final double r = pixel.r.toDouble();
      final double g = pixel.g.toDouble();
      final double b = pixel.b.toDouble();

      if (filter == 'bw') {
        final double gray = 0.299 * r + 0.587 * g + 0.114 * b;
        pixel.r = gray;
        pixel.g = gray;
        pixel.b = gray;
      } else if (filter == 'sepia') {
        pixel.r = math.min(255.0, (r * 0.393) + (g * 0.769) + (b * 0.189));
        pixel.g = math.min(255.0, (r * 0.349) + (g * 0.686) + (b * 0.168));
        pixel.b = math.min(255.0, (r * 0.272) + (g * 0.534) + (b * 0.131));
      } else if (filter == 'vintage') {
        final double nr = (r * 0.393) + (g * 0.769) + (b * 0.189);
        final double ng = (r * 0.349) + (g * 0.686) + (b * 0.168);
        final double nb = (r * 0.272) + (g * 0.534) + (b * 0.131);
        final double finalR = r * 0.5 + nr * 0.5;
        final double finalG = g * 0.5 + ng * 0.5;
        final double finalB = b * 0.5 + nb * 0.5;
        pixel.r = math.min(255.0, math.max(0.0, ((finalR - 128) * 1.25) + 128 - 10));
        pixel.g = math.min(255.0, math.max(0.0, ((finalG - 128) * 1.25) + 128 - 10));
        pixel.b = math.min(255.0, math.max(0.0, ((finalB - 128) * 1.25) + 128 - 10));
      } else if (filter == 'warm') {
        pixel.r = math.min(255.0, r * 1.15);
        pixel.g = math.min(255.0, g * 1.06);
        pixel.b = math.min(255.0, b * 0.85);
      } else if (filter == 'cold') {
        pixel.r = math.min(255.0, r * 0.85);
        pixel.g = math.min(255.0, g * 1.02);
        pixel.b = math.min(255.0, b * 1.18);
      }
    }
  }

  static void _applyFilmGrain(img.Image image, int noiseIntensity) {
    final rand = math.Random();
    // Map 0-100 scale to max 45 intensity factor
    final double maxOpacity = (noiseIntensity / 100.0) * 45.0;

    for (final pixel in image) {
      final double randVal = rand.nextDouble() * 255.0;
      final double blend = maxOpacity / 255.0;
      pixel.r = (pixel.r * (1.0 - blend) + randVal * blend).round();
      pixel.g = (pixel.g * (1.0 - blend) + randVal * blend).round();
      pixel.b = (pixel.b * (1.0 - blend) + randVal * blend).round();
    }
  }

  static void _applyCameraGlare(img.Image image, String glareType) {
    final int w = image.width;
    final int h = image.height;

    for (final pixel in image) {
      final int x = pixel.x;
      final int y = pixel.y;

      double blend = 0.0;
      int gr = 0, gg = 0, gb = 0;

      if (glareType == 'warm') {
        // Soft Warm Orange radial leak from top-left
        final double dist = math.sqrt(x * x + y * y);
        final double maxDist = h * 0.75;
        if (dist < maxDist) {
          blend = (1.0 - (dist / maxDist)) * 0.38;
          gr = 255; gg = 130; gb = 40;
        }
      } else if (glareType == 'retro') {
        // Linear pink-purple leak from left edge
        if (x < w * 0.9) {
          blend = (1.0 - (x / (w * 0.9))) * 0.28;
          gr = 255; gg = 0; gb = 128;
        }
      } else if (glareType == 'aurora') {
        // Neon teal radial leak from bottom-right
        final double dx = (w - x).toDouble();
        final double dy = (h - y).toDouble();
        final double dist = math.sqrt(dx * dx + dy * dy);
        final double maxDist = h * 0.7;
        if (dist < maxDist) {
          blend = (1.0 - (dist / maxDist)) * 0.35;
          gr = 0; gg = 240; gb = 160;
        }
      } else if (glareType == 'fire') {
        // Fire red radial leak from top-right
        final double dx = (w - x).toDouble();
        final double dist = math.sqrt(dx * dx + y * y);
        final double maxDist = h * 0.75;
        if (dist < maxDist) {
          blend = (1.0 - (dist / maxDist)) * 0.42;
          gr = 255; gg = 40; gb = 0;
        }
      } else if (glareType == 'nebula') {
        // Purple-magenta radial leak from bottom-left
        final double dy = (h - y).toDouble();
        final double dist = math.sqrt(x * x + dy * dy);
        final double maxDist = h * 0.75;
        if (dist < maxDist) {
          blend = (1.0 - (dist / maxDist)) * 0.35;
          gr = 180; gg = 0; gb = 255;
        }
      } else if (glareType == 'sunset') {
        // Sunset pink-orange linear leak from bottom edge
        final double dy = (h - y).toDouble();
        final double maxDist = h * 0.45;
        if (dy < maxDist) {
          blend = (1.0 - (dy / maxDist)) * 0.35;
          gr = 255; gg = 60; gb = 100;
        }
      } else if (glareType == 'vintage') {
        // Antique golden radial wash in center
        final double dx = x - (w / 2);
        final double dy = y - (h / 2);
        final double dist = math.sqrt(dx * dx + dy * dy);
        final double maxDist = h * 0.8;
        if (dist < maxDist) {
          blend = (1.0 - (dist / maxDist)) * 0.28;
          gr = 255; gg = 230; gb = 150;
        }
      } else if (glareType == 'rainbow') {
        // Diagonal rainbow prism
        final double diag = (x + y).toDouble();
        final double maxDiag = (w + h).toDouble();
        blend = 0.18;
        if (diag < maxDiag * 0.2) {
          gr = 255; gg = 50; gb = 50; // Red
        } else if (diag < maxDiag * 0.4) {
          gr = 255; gg = 150; gb = 0; // Orange
        } else if (diag < maxDiag * 0.6) {
          gr = 255; gg = 255; gb = 0; // Yellow
        } else if (diag < maxDiag * 0.8) {
          gr = 0; gg = 255; gb = 100; // Green
        } else {
          gr = 150; gg = 50; gb = 255; // Violet
        }
      } else if (glareType == 'cyberpunk') {
        // Dual corners cyan & magenta
        final double distTL = math.sqrt(x * x + y * y);
        final double dxBR = (w - x).toDouble();
        final double dyBR = (h - y).toDouble();
        final double distBR = math.sqrt(dxBR * dxBR + dyBR * dyBR);
        final double maxDist = h * 0.6;

        if (distTL < maxDist) {
          blend = (1.0 - (distTL / maxDist)) * 0.35;
          gr = 0; gg = 255; gb = 255; // Cyan
        } else if (distBR < maxDist) {
          blend = (1.0 - (distBR / maxDist)) * 0.35;
          gr = 255; gg = 0; gb = 255; // Magenta
        }
      }

      if (blend > 0.0) {
        // Soft Screen composite blending operation
        pixel.r = math.min(255, (pixel.r + gr * blend).round());
        pixel.g = math.min(255, (pixel.g + gg * blend).round());
        pixel.b = math.min(255, (pixel.b + gb * blend).round());
      }
    }
  }
}
