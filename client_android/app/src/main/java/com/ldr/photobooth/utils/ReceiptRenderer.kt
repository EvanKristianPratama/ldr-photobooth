package com.ldr.photobooth.utils

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.random.Random

object ReceiptRenderer {

    /**
     * Converts a source Bitmap to a dithered monochrome thermal receipt look.
     * Includes histogram equalization (contrast stretching) followed by high-contrast Floyd-Steinberg dithering.
     */
    fun applyThermalFilter(src: Bitmap): Bitmap {
        val width = src.width
        val height = src.height
        
        // 1. Create a grayscale array
        val grayPixels = IntArray(width * height)
        val pixels = IntArray(width * height)
        src.getPixels(pixels, 0, width, 0, 0, width, height)
        
        // Convert to grayscale and calculate min/max for contrast stretching
        var minVal = 255
        var maxVal = 0
        
        for (i in pixels.indices) {
            val color = pixels[i]
            val r = (color shr 16) and 0xFF
            val g = (color shr 8) and 0xFF
            val b = color and 0xFF
            // Grayscale luminance
            val gray = (0.299f * r + 0.587f * g + 0.114f * b).toInt().coerceIn(0, 255)
            grayPixels[i] = gray
            if (gray < minVal) minVal = gray
            if (gray > maxVal) maxVal = gray
        }
        
        // 2. Perform contrast stretching (equivalent to hist equalization for dither)
        val range = (maxVal - minVal).toFloat()
        if (range > 0) {
            for (i in grayPixels.indices) {
                val stretched = ((grayPixels[i] - minVal) / range * 255f).toInt().coerceIn(0, 255)
                // Boost midtone contrast
                grayPixels[i] = if (stretched > 128) {
                    (stretched + (stretched - 128) * 0.4f).toInt().coerceIn(0, 255)
                } else {
                    (stretched - (128 - stretched) * 0.4f).toInt().coerceIn(0, 255)
                }
            }
        }
        
        // 3. Floyd-Steinberg Error Diffusion Dithering
        val ditherMap = Array(height) { IntArray(width) }
        for (y in 0 until height) {
            for (x in 0 until width) {
                ditherMap[y][x] = grayPixels[y * width + x]
            }
        }
        
        val outputPixels = IntArray(width * height)
        
        for (y in 0 until height) {
            for (x in 0 until width) {
                val oldPixel = ditherMap[y][x]
                val newPixel = if (oldPixel > 128) 255 else 0
                outputPixels[y * width + x] = newPixel
                
                val error = oldPixel - newPixel
                
                // Diffuse error to neighbors
                if (x + 1 < width) {
                    ditherMap[y][x + 1] += (error * 7 / 16)
                }
                if (y + 1 < height) {
                    if (x - 1 >= 0) {
                        ditherMap[y + 1][x - 1] += (error * 3 / 16)
                    }
                    ditherMap[y + 1][x] += (error * 5 / 16)
                    if (x + 1 < width) {
                        ditherMap[y + 1][x + 1] += (error * 1 / 16)
                    }
                }
            }
        }
        
        // 4. Construct BGR/RGB bitmap from dithered monochrome array
        val result = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val finalPixels = IntArray(width * height)
        for (i in outputPixels.indices) {
            val v = outputPixels[i]
            // Standard thermal paper warm white background or pure white/black
            finalPixels[i] = if (v == 255) 0xFFF4F6F5.toInt() else 0xFF1A1A2E.toInt()
        }
        result.setPixels(finalPixels, 0, width, 0, 0, width, height)
        return result
    }

    /**
     * Center crops a bitmap to a desired aspect ratio to prevent squishing or stretching.
     */
    private fun centerCrop(src: Bitmap, targetAspect: Float): Bitmap {
        val srcW = src.width.toFloat()
        val srcH = src.height.toFloat()
        val srcAspect = srcW / srcH
        
        val cropW: Int
        val cropH: Int
        if (srcAspect > targetAspect) {
            cropH = src.height
            cropW = (srcH * targetAspect).toInt()
        } else {
            cropW = src.width
            cropH = (srcW / targetAspect).toInt()
        }
        
        val cropX = (src.width - cropW) / 2
        val cropY = (src.height - cropH) / 2
        
        return Bitmap.createBitmap(src, cropX, cropY, cropW, cropH)
    }

    /**
     * Helper to render a seeded pixel-perfect retro barcode.
     */
    private fun drawBarcode(canvas: Canvas, x: Float, y: Float, width: Float, height: Float, seedStr: String, paint: Paint) {
        val seed = seedStr.hashCode().toLong()
        val random = Random(seed)
        
        // Draw white background
        val bgPaint = Paint().apply { color = 0xFFF4F6F5.toInt(); style = Paint.Style.FILL }
        canvas.drawRect(x, y, x + width, y + height, bgPaint)
        
        val xStart = x + 30f
        val yStart = y + 10f
        val barcodeW = width - 60f
        val barcodeH = height - 35f
        
        paint.color = 0xFF1A1A2E.toInt()
        paint.strokeWidth = 1f
        paint.style = Paint.Style.FILL
        
        var curX = xStart
        val endX = xStart + barcodeW
        
        while (curX < endX - 10f) {
            val barW = random.nextInt(2, 6).toFloat()
            val spaceW = random.nextInt(3, 8).toFloat()
            
            canvas.drawRect(curX, yStart, curX + barW, yStart + barcodeH, paint)
            curX += barW + spaceW
        }
        
        // Text code label below barcode
        val label = "* " + seedStr.take(12).uppercase(Locale.getDefault()) + " *"
        paint.textSize = 20f
        paint.textAlign = Paint.Align.CENTER
        canvas.drawText(label, x + width / 2f, y + height - 8f, paint)
    }

    /**
     * Compiles taken photo list into a stunning 80mm long high-resolution dithered thermal receipt.
     */
    fun compile80mmReceipt(
        photos: List<Bitmap>,
        receiptTitle: String,
        receiptSubtitle: String,
        receiptSlogan: String
    ): Bitmap {
        // Receipt Specs (Standard scaled width 800px)
        val canvasWidth = 800
        val photoCount = photos.size
        
        // Compute geometry
        val marginX = 50f
        val photoW = canvasWidth - marginX * 2f // 700px wide
        val photoH = 500f                       // Clean landscape ratio 7:5
        val spacingY = 40f
        
        // Heights
        val headerHeight = 360
        val photosGridHeight = photoCount * (photoH + spacingY) - spacingY
        val footerHeight = 480
        val canvasHeight = (headerHeight + photosGridHeight + footerHeight).toInt()
        
        // Build Bitmap and Canvas
        val receipt = Bitmap.createBitmap(canvasWidth, canvasHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(receipt)
        
        // Warm thermal receipt paper background
        canvas.drawColor(0xFFF4F6F5.toInt())
        
        // Paints
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF1A1A2E.toInt()
            style = Paint.Style.FILL
        }
        
        val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = 0xFF1A1A2E.toInt()
            strokeWidth = 2f
            style = Paint.Style.STROKE
        }
        
        // --- 1. RENDER RECEIPT HEADER ---
        val tearOff = "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"
        textPaint.textSize = 18f
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText(tearOff, canvasWidth / 2f, 35f, textPaint)
        
        // Large stark vintage/minimal header
        textPaint.textSize = 42f
        textPaint.textAlign = Paint.Align.LEFT
        canvas.drawText(receiptTitle.uppercase(Locale.getDefault()), marginX, 90f, textPaint)
        
        // Subtitle details
        textPaint.textSize = 18f
        canvas.drawText(receiptSubtitle.uppercase(Locale.getDefault()), marginX, 125f, textPaint)
        
        // Divider
        linePaint.pathEffect = null
        canvas.drawLine(marginX, 150f, canvasWidth - marginX, 150f, linePaint)
        
        // Transaction Info
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val dateText = "DATE: " + SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) + "   TIME: " + SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val orderNo = "ORDER #: #9821-" + timestamp.takeLast(6)
        
        textPaint.textSize = 17f
        canvas.drawText(dateText, marginX, 185f, textPaint)
        canvas.drawText(orderNo, marginX, 215f, textPaint)
        canvas.drawText("OPERATOR: NATIVE_ANDROID_BOOTH", marginX, 245f, textPaint)
        
        canvas.drawLine(marginX, 265f, canvasWidth - marginX, 265f, linePaint)
        
        // --- 2. RENDER DITHERED CAPTURED PHOTOS ---
        val startPhotosY = headerHeight.toFloat()
        
        for (i in 0 until photoCount) {
            val rawPhoto = photos[i]
            
            // Apply Floyd-Steinberg retro dithering
            val filteredPhoto = applyThermalFilter(rawPhoto)
            
            // Center crop to aspect ratio 7:5
            val cropped = centerCrop(filteredPhoto, photoW / photoH)
            
            // Copy onto canvas
            val dstRect = Rect(
                marginX.toInt(),
                (startPhotosY + i * (photoH + spacingY)).toInt(),
                (canvasWidth - marginX).toInt(),
                (startPhotosY + i * (photoH + spacingY) + photoH).toInt()
            )
            canvas.drawBitmap(cropped, null, dstRect, null)
            
            // Draw neat border
            canvas.drawRect(dstRect, linePaint)
            
            // Unload temporary assets
            cropped.recycle()
            filteredPhoto.recycle()
        }
        
        // --- 3. RENDER RECEIPT FOOTER ---
        val footerStartY = startPhotosY + photosGridHeight + 40f
        
        // Divider
        canvas.drawLine(marginX, footerStartY, canvasWidth - marginX, footerStartY, linePaint)
        
        // Item description & Qty
        textPaint.textSize = 17f
        textPaint.textAlign = Paint.Align.LEFT
        canvas.drawText("ITEM DESCRIPTION", marginX, footerStartY + 30f, textPaint)
        
        textPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText("QTY", canvasWidth - marginX - 100f, footerStartY + 30f, textPaint)
        canvas.drawText("PRICE", canvasWidth - marginX, footerStartY + 30f, textPaint)
        
        val items = listOf(
            "THERMAL CAPTURE ACQUISITION" to (photoCount.toString() to "$ 0.00"),
            "RETINA COLLAGE PROCESSING" to ("1" to "$ 0.00"),
            "PREMIUM THERMAL PAPER" to ("1" to "$ 0.00")
        )
        
        var curItemY = footerStartY + 65f
        textPaint.textSize = 16f
        for ((desc, qtyPrice) in items) {
            textPaint.textAlign = Paint.Align.LEFT
            canvas.drawText(desc, marginX, curItemY, textPaint)
            
            textPaint.textAlign = Paint.Align.RIGHT
            canvas.drawText(qtyPrice.first, canvasWidth - marginX - 100f, curItemY, textPaint)
            canvas.drawText(qtyPrice.second, canvasWidth - marginX, curItemY, textPaint)
            
            curItemY += 30f
        }
        
        canvas.drawLine(marginX, curItemY + 10f, canvasWidth - marginX, curItemY + 10f, linePaint)
        
        // Total Amount
        textPaint.textSize = 20f
        textPaint.textAlign = Paint.Align.LEFT
        canvas.drawText("TOTAL AMOUNT (TAX INCL.)", marginX, curItemY + 50f, textPaint)
        textPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText("$ 0.00", canvasWidth - marginX, curItemY + 50f, textPaint)
        
        canvas.drawLine(marginX, curItemY + 75f, canvasWidth - marginX, curItemY + 75f, linePaint)
        
        // Render Seeded Barcode
        drawBarcode(canvas, marginX, curItemY + 95f, canvasWidth - marginX * 2f, 110f, timestamp, textPaint)
        
        // Slogan / Slogan Label
        textPaint.textSize = 18f
        textPaint.textAlign = Paint.Align.CENTER
        canvas.drawText(receiptSlogan.uppercase(Locale.getDefault()), canvasWidth / 2f, curItemY + 245f, textPaint)
        
        // Dotted tear off at the very end
        canvas.drawText(tearOff, canvasWidth / 2f, curItemY + 285f, textPaint)
        
        return receipt
    }
}
