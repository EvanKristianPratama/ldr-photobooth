#include "image/processor.h"
#include <opencv2/imgproc.hpp>
#include <opencv2/imgcodecs.hpp>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <sys/stat.h>
#include <cstdlib>

// Helper: Converts BGR to high-contrast monochrome (thermal print dithered look)
static cv::Mat ApplyThermalFilter(const cv::Mat& src) {
    cv::Mat gray, result;
    cv::cvtColor(src, gray, cv::COLOR_BGR2GRAY);
    
    // Equalize histogram to bring out textures and local contrast
    cv::equalizeHist(gray, gray);
    
    // Increase contrast further
    gray.convertTo(gray, -1, 1.25, -20);
    
    // Convert back to BGR for standard pipeline compatibility
    cv::cvtColor(gray, result, cv::COLOR_GRAY2BGR);
    return result;
}

// Helper: Performs center-cropping to match target aspect ratio exactly, avoiding stretching
static cv::Mat AutoCropToAspect(const cv::Mat& src, double targetAspect) {
    int srcW = src.cols;
    int srcH = src.rows;
    double srcAspect = (double)srcW / srcH;
    
    int cropW = srcW;
    int cropH = srcH;
    
    if (srcAspect > targetAspect) {
        // Source is wider than target aspect ratio (crop horizontally)
        cropW = (int)(srcH * targetAspect);
    } else {
        // Source is taller than target aspect ratio (crop vertically)
        cropH = (int)(srcW / targetAspect);
    }
    
    int cropX = (srcW - cropW) / 2;
    int cropY = (srcH - cropH) / 2;
    
    cv::Rect roi(cropX, cropY, cropW, cropH);
    return src(roi).clone();
}

// Helper: Renders an authentic pixel-perfect mock barcode
static void DrawMockBarcode(cv::Mat& canvas, cv::Rect rect, const std::string& code, cv::Scalar color, cv::Scalar bg) {
    // Fill white/receipt color backing
    cv::rectangle(canvas, rect, bg, -1);
    
    int xStart = rect.x + 20;
    int yStart = rect.y + 10;
    int barcodeW = rect.width - 40;
    int barcodeH = rect.height - 30;
    
    // Seed generator based on code string so it's reproducible
    unsigned int seed = 0;
    for (char c : code) seed += c;
    srand(seed > 0 ? seed : 9999);
    
    int curX = xStart;
    while (curX < xStart + barcodeW - 10) {
        int barW = (rand() % 4) + 1;    // 1 to 4 px wide bar
        int spaceW = (rand() % 5) + 2;  // 2 to 6 px space
        
        cv::rectangle(canvas, cv::Rect(curX, yStart, barW, barcodeH), color, -1);
        curX += barW + spaceW;
    }
    
    // Text code label below barcode
    std::string text = "* " + code + " *";
    int fontFace = cv::FONT_HERSHEY_SIMPLEX;
    double fontScale = 0.38;
    int thickness = 1;
    int baseline = 0;
    cv::Size textSize = cv::getTextSize(text, fontFace, fontScale, thickness, &baseline);
    
    int textX = rect.x + (rect.width - textSize.width) / 2;
    int textY = rect.y + rect.height - 5;
    cv::putText(canvas, text, cv::Point(textX, textY), fontFace, fontScale, color, thickness, cv::LINE_AA);
}

std::string ImageProcessor::CompileAndSave(
    const std::vector<CapturedPhoto>& photos,
    const LayoutOption& layout,
    const FrameOption& frame,
    const std::string& timestamp,
    const std::string& receiptTitle,
    const std::string& receiptSubtitle,
    const std::string& receiptSlogan
) {
    std::cout << "[Processor] Compiling layout: " << layout.name << " with frame: " << frame.name << "..." << std::endl;
    
    bool isReceipt = frame.isReceipt;
    
    // Convert Raylib colors (RGBA) to OpenCV colors (BGR)
    cv::Scalar bgBGR = isReceipt ? cv::Scalar(240, 244, 243) : cv::Scalar(frame.color.b, frame.color.g, frame.color.r); // Warm warm-white receipt paper
    cv::Scalar textBGR(frame.textColor.b, frame.textColor.g, frame.textColor.r);
    
    // Thin border lines color (stark contrast to background)
    cv::Scalar borderBGR(frame.textColor.b, frame.textColor.g, frame.textColor.r);
    
    cv::Mat canvas;
    int canvasWidth = 0;
    int canvasHeight = 0;
    
    // Setup margins and geometry based on layout selection
    if (layout.isCustom) {
        // Paper size determines canvas width
        canvasWidth = (layout.paperSize == PaperSize::PAPER_2R) ? 600 : 1200;
        canvasHeight = isReceipt ? 2100 : 1800;
        
        // Attempt to load background image
        bool bgLoaded = false;
        if (!layout.backgroundPath.empty()) {
            cv::Mat bgImage = cv::imread(layout.backgroundPath, cv::IMREAD_COLOR);
            if (!bgImage.empty()) {
                cv::resize(bgImage, canvas, cv::Size(canvasWidth, canvasHeight), 0, 0, cv::INTER_CUBIC);
                bgLoaded = true;
                std::cout << "[Processor] Background image loaded: " << layout.backgroundPath << std::endl;
            } else {
                std::cerr << "[Processor] WARNING: Could not load background: " << layout.backgroundPath << std::endl;
            }
        }
        
        // Fallback to solid color if no background loaded
        if (!bgLoaded) {
            canvas = cv::Mat(canvasHeight, canvasWidth, CV_8UC3, bgBGR);
        }
        
        // Determine rendering order: use zOrder if available, else default 0..N
        std::vector<int> renderOrder;
        if (!layout.zOrder.empty()) {
            renderOrder = layout.zOrder;
        } else {
            for (size_t i = 0; i < layout.slotRects.size(); ++i) {
                renderOrder.push_back((int)i);
            }
        }
        
        // Loop over slots in z-order (bottom to top) and crop/resize/copy each captured photo
        for (int idx : renderOrder) {
            size_t i = (size_t)idx;
            if (i >= layout.slotRects.size()) continue;
            if (i >= photos.size() || !photos[i].isTaken) continue;
            
            // Skip hidden slots
            if (!layout.slotVisible.empty() && i < layout.slotVisible.size() && !layout.slotVisible[i]) continue;
            
            const auto& r = layout.slotRects[i];
            
            // Validate bounds to prevent crash
            if (r.width <= 0 || r.height <= 0) continue;
            
            // Safe clamp bounding box onto canvas
            int rx = std::max(0, std::min(canvasWidth - 10, (int)r.x));
            int ry = std::max(0, std::min(canvasHeight - 10, (int)r.y));
            int rw = std::max(10, std::min(canvasWidth - rx, (int)r.width));
            int rh = std::max(10, std::min(canvasHeight - ry, (int)r.height));
            
            cv::Mat processedPhoto = isReceipt ? ApplyThermalFilter(photos[i].mat) : photos[i].mat.clone();
            
            // Check and apply photo rotation before aspect cropping to avoid any stretching
            if (i < layout.slotRotation.size() && layout.slotRotation[i] != 0.0f) {
                float rotDeg = layout.slotRotation[i];
                cv::Mat rotatedPhoto;
                if (rotDeg == 90.0f) {
                    cv::rotate(processedPhoto, rotatedPhoto, cv::ROTATE_90_CLOCKWISE);
                } else if (rotDeg == 180.0f) {
                    cv::rotate(processedPhoto, rotatedPhoto, cv::ROTATE_180);
                } else if (rotDeg == 270.0f) {
                    cv::rotate(processedPhoto, rotatedPhoto, cv::ROTATE_90_COUNTERCLOCKWISE);
                } else {
                    rotatedPhoto = processedPhoto.clone();
                }
                processedPhoto = rotatedPhoto;
            }
            
            // Aspect crop
            cv::Mat croppedPhoto = AutoCropToAspect(processedPhoto, (double)rw / rh);
            
            cv::Mat resizedPhoto;
            cv::resize(croppedPhoto, resizedPhoto, cv::Size(rw, rh), 0, 0, cv::INTER_CUBIC);
            
            // Draw clean border
            cv::rectangle(resizedPhoto, cv::Point(0, 0), cv::Point(rw - 1, rh - 1), borderBGR, isReceipt ? 1 : 2, cv::LINE_AA);
            
            // Copy onto canvas
            cv::Mat targetROI = canvas(cv::Rect(rx, ry, rw, rh));
            resizedPhoto.copyTo(targetROI);
        }
        
        // Render text and image overlays onto canvas
        for (const auto& ov : layout.overlays) {
            if (!ov.visible) continue;
            
            int ox = std::max(0, std::min(canvasWidth - 10, (int)ov.rect.x));
            int oy = std::max(0, std::min(canvasHeight - 10, (int)ov.rect.y));
            int ow = std::max(10, std::min(canvasWidth - ox, (int)ov.rect.width));
            int oh = std::max(10, std::min(canvasHeight - oy, (int)ov.rect.height));
            
            if (ov.type == OverlayType::TEXT && !ov.content.empty()) {
                // Render text overlay using OpenCV
                double fontScale = ov.fontSize / 40.0;
                cv::Scalar textColor(ov.color.b, ov.color.g, ov.color.r); // BGR
                int thickness = std::max(1, (int)(fontScale * 2));
                cv::putText(canvas, ov.content, cv::Point(ox, oy + (int)(ov.fontSize * 0.8)),
                           cv::FONT_HERSHEY_DUPLEX, fontScale, textColor, thickness, cv::LINE_AA);
            } else if (ov.type == OverlayType::IMAGE && !ov.content.empty()) {
                // Load and render image overlay
                cv::Mat ovImg = cv::imread(ov.content, cv::IMREAD_UNCHANGED);
                if (!ovImg.empty()) {
                    cv::Mat resized;
                    cv::resize(ovImg, resized, cv::Size(ow, oh), 0, 0, cv::INTER_CUBIC);
                    
                    // Handle alpha channel if present
                    if (resized.channels() == 4) {
                        cv::Mat channels[4];
                        cv::split(resized, channels);
                        cv::Mat bgr;
                        cv::merge(std::vector<cv::Mat>{channels[0], channels[1], channels[2]}, bgr);
                        cv::Mat mask = channels[3];
                        cv::Mat roi = canvas(cv::Rect(ox, oy, ow, oh));
                        bgr.copyTo(roi, mask);
                    } else {
                        // No alpha, direct copy
                        if (resized.channels() != 3) {
                            cv::cvtColor(resized, resized, cv::COLOR_GRAY2BGR);
                        }
                        cv::Mat roi = canvas(cv::Rect(ox, oy, ow, oh));
                        resized.copyTo(roi);
                    }
                    std::cout << "[Processor] Overlay image rendered: " << ov.content << std::endl;
                }
            }
        }
        
        // Render receipt headers/footers or Swiss stamp if needed!
        if (isReceipt) {
            // Draw standard barcode & slogan at bottom
            std::string tearOff = "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *";
            cv::putText(canvas, tearOff, cv::Point(45, 35), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, receiptTitle.c_str(), cv::Point(45, 75), cv::FONT_HERSHEY_DUPLEX, 1.1, textBGR, 2, cv::LINE_AA);
            cv::putText(canvas, receiptSubtitle.c_str(), cv::Point(45, 110), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            
            int footerY = canvasHeight - 200;
            DrawMockBarcode(canvas, cv::Rect(300, footerY, canvasWidth - 600, 75), timestamp, textBGR, bgBGR);
            cv::putText(canvas, receiptSlogan.c_str(), cv::Point(490, footerY + 110), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
        } else {
            // Draw Swiss Cross Stamp and labels in a minimal margins area
            int footerY = canvasHeight - 80;
            cv::line(canvas, cv::Point(45, footerY), cv::Point(canvasWidth - 45, footerY), borderBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "STRIPS CUSTOM COLLAGE", cv::Point(45, footerY + 35), cv::FONT_HERSHEY_DUPLEX, 0.7, textBGR, 2, cv::LINE_AA);
            
            std::string dateStr = "TIMESTAMP: " + timestamp;
            cv::putText(canvas, dateStr, cv::Point(canvasWidth - 380, footerY + 30), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            
            // Draw elegant mini Swiss Cross
            int crossSize = 24;
            int crossX = canvasWidth - 45 - crossSize;
            int crossY = footerY + 15;
            cv::rectangle(canvas, cv::Rect(crossX, crossY, crossSize, crossSize), cv::Scalar(70, 57, 230), -1, cv::LINE_AA);
            int barThick = 4;
            int barLen = 14;
            cv::rectangle(canvas, cv::Rect(crossX + (crossSize - barLen)/2, crossY + (crossSize - barThick)/2, barLen, barThick), cv::Scalar(255, 255, 255), -1, cv::LINE_AA);
            cv::rectangle(canvas, cv::Rect(crossX + (crossSize - barThick)/2, crossY + (crossSize - barLen)/2, barThick, barLen), cv::Scalar(255, 255, 255), -1, cv::LINE_AA);
        }
    } else if (layout.isVerticalStrip) {
        // 4R Layout (2R x 2 strips side-by-side)
        canvasWidth = 1200; // Standard 4R width
        canvasHeight = isReceipt ? 2100 : 1800; // Taller for receipt header and footer
        
        // We compile a single 2R strip (600px wide) in temporary memory
        int stripWidth = 600;
        cv::Mat strip(canvasHeight, stripWidth, CV_8UC3, bgBGR);
        
        int marginX = 35;
        int marginTop = isReceipt ? 240 : 35; // Push photos down to leave room for receipt header
        int spacingY = 25;
        
        int photoW = stripWidth - (marginX * 2); // 530 px
        int photoH = 370;                         // Clean geometric landscape ratio
        
        for (int i = 0; i < layout.photoCount; ++i) {
            if (i >= (int)photos.size() || !photos[i].isTaken) continue;
            
            cv::Mat processedPhoto = isReceipt ? ApplyThermalFilter(photos[i].mat) : photos[i].mat.clone();
            
            // Auto crop to avoid "gepeng" (stretched/squished images)
            cv::Mat croppedPhoto = AutoCropToAspect(processedPhoto, (double)photoW / photoH);
            
            cv::Mat resizedPhoto;
            cv::resize(croppedPhoto, resizedPhoto, cv::Size(photoW, photoH), 0, 0, cv::INTER_CUBIC);
            
            // Draw clean 2px minimalist border around the photo (or 1px for receipt)
            cv::rectangle(resizedPhoto, cv::Point(0, 0), cv::Point(photoW - 1, photoH - 1), borderBGR, isReceipt ? 1 : 2, cv::LINE_AA);
            
            // Copy onto our single strip
            int posY = marginTop + i * (photoH + spacingY);
            cv::Mat targetROI = strip(cv::Rect(marginX, posY, photoW, photoH));
            resizedPhoto.copyTo(targetROI);
        }
        
        if (isReceipt) {
            // --- Thermal Receipt Header (Top of Strip) ---
            std::string tearOff = "* * * * * * * * * * * * * * * * * * * * * * * * *";
            cv::putText(strip, tearOff, cv::Point(35, 35), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            cv::putText(strip, receiptTitle.c_str(), cv::Point(35, 75), cv::FONT_HERSHEY_DUPLEX, 1.1, textBGR, 2, cv::LINE_AA);
            cv::putText(strip, receiptSubtitle.c_str(), cv::Point(35, 110), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            cv::putText(strip, "--------------------------------------------------", cv::Point(35, 135), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            
            std::string dateStr = "DATE: 2026-05-25  TIME: " + (timestamp.length() > 14 ? (timestamp.substr(9, 2) + ":" + timestamp.substr(11, 2)) : "17:30");
            cv::putText(strip, dateStr, cv::Point(35, 160), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            std::string orderStr = "ORDER: #9821-" + (timestamp.length() > 14 ? timestamp.substr(9, 6) : "173000");
            cv::putText(strip, orderStr, cv::Point(35, 185), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(strip, "CASHIER: ROBOT", cv::Point(35, 210), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(strip, "--------------------------------------------------", cv::Point(35, 230), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            
            // --- Thermal Receipt Footer (Bottom of Strip) ---
            int footerStartY = marginTop + layout.photoCount * (photoH + spacingY) - spacingY + 35;
            cv::putText(strip, "--------------------------------------------------", cv::Point(35, footerStartY), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            cv::putText(strip, "ITEM DESCRIPTION          QTY      PRICE", cv::Point(35, footerStartY + 25), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(strip, "RETINA PHOTO ACQUISITION   4       $ 0.00", cv::Point(35, footerStartY + 50), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(strip, "STRIPS RETINA BORDER       1       $ 0.00", cv::Point(35, footerStartY + 70), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(strip, "THERMAL PAPER PREMIUM      1       $ 0.00", cv::Point(35, footerStartY + 90), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(strip, "--------------------------------------------------", cv::Point(35, footerStartY + 110), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            
            cv::putText(strip, "TOTAL AMOUNT (TAX INCL.)           $ 0.00", cv::Point(35, footerStartY + 135), cv::FONT_HERSHEY_DUPLEX, 0.45, textBGR, 2, cv::LINE_AA);
            cv::putText(strip, "--------------------------------------------------", cv::Point(35, footerStartY + 155), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            
            // Draw Mock Barcode
            DrawMockBarcode(strip, cv::Rect(50, footerStartY + 165, stripWidth - 100, 75), timestamp, textBGR, bgBGR);
            
            cv::putText(strip, receiptSlogan.c_str(), cv::Point(180, footerStartY + 265), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(strip, tearOff, cv::Point(35, footerStartY + 290), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
        } else {
            // --- Swiss Typographic Footer (Classic Strip) ---
            int footerStartY = marginTop + layout.photoCount * (photoH + spacingY) - spacingY + 35;
            
            // Stark Swiss grid separation line (1px thin)
            cv::line(strip, cv::Point(35, footerStartY), cv::Point(stripWidth - 35, footerStartY), borderBGR, 1, cv::LINE_AA);
            
            // Large stark header
            cv::putText(strip, "STRIPS BOOTH", cv::Point(35, footerStartY + 50), 
                        cv::FONT_HERSHEY_DUPLEX, 0.9, textBGR, 2, cv::LINE_AA);
            
            // Minimalist details
            cv::putText(strip, "LDR PHOTOBOOTH // MEMORY REG.", cv::Point(35, footerStartY + 85), 
                        cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            
            std::string dateStr = "RUN // " + timestamp;
            cv::putText(strip, dateStr, cv::Point(35, footerStartY + 110), 
                        cv::FONT_HERSHEY_SIMPLEX, 0.4, borderBGR, 1, cv::LINE_AA);
            
            // Draw elegant mini Swiss Cross stamp in the bottom-right corner
            int crossSize = 26;
            int crossX = stripWidth - 35 - crossSize;
            int crossY = footerStartY + 45;
            
            // Red background square box
            cv::rectangle(strip, cv::Rect(crossX, crossY, crossSize, crossSize), cv::Scalar(70, 57, 230), -1, cv::LINE_AA); // Swiss Red
            // White cross bars
            int barThick = 6;
            int barLen = 16;
            // Horizontal bar
            cv::rectangle(strip, 
                          cv::Rect(crossX + (crossSize - barLen)/2, crossY + (crossSize - barThick)/2, barLen, barThick), 
                          cv::Scalar(255, 255, 255), -1, cv::LINE_AA);
            // Vertical bar
            cv::rectangle(strip, 
                          cv::Rect(crossX + (crossSize - barThick)/2, crossY + (crossSize - barLen)/2, barThick, barLen), 
                          cv::Scalar(255, 255, 255), -1, cv::LINE_AA);
        }
        
        // NOW duplicate the strip side-by-side onto final 1200px wide 4R canvas
        canvas = cv::Mat(canvasHeight, canvasWidth, CV_8UC3, bgBGR);
        strip.copyTo(canvas(cv::Rect(0, 0, stripWidth, canvasHeight)));
        strip.copyTo(canvas(cv::Rect(stripWidth, 0, stripWidth, canvasHeight)));
        
        // Draw a central vertical dashed guide line for "CUT HERE"
        for (int y = 0; y < canvasHeight; y += 20) {
            cv::line(canvas, cv::Point(stripWidth, y), cv::Point(stripWidth, y + 10), borderBGR, 1, cv::LINE_AA);
        }
        
    } else {
        // Grid Layout (e.g. 2x2 Grid or 3x2 Grid)
        canvasWidth = 1200;
        canvasHeight = isReceipt ? 2100 : 1800; // Standard 4R print canvas height
        canvas = cv::Mat(canvasHeight, canvasWidth, CV_8UC3, bgBGR);
        
        int cols = layout.cols;
        int rows = layout.rows;
        
        int marginX = 60;
        int spacingX = 40;
        int spacingY = 40;
        
        int photoW = (canvasWidth - (marginX * 2) - (spacingX * (cols - 1))) / cols;
        int photoH = photoW; // Maintain perfect aesthetic square grid layout
        
        int gridHeight = (rows * photoH) + (spacingY * (rows - 1));
        
        // Push down for receipt header or center-align vertically for clean print
        int marginTop = isReceipt ? 260 : (canvasHeight - gridHeight) / 2;
        
        for (int r = 0; r < rows; ++r) {
            for (int c = 0; c < cols; ++c) {
                int index = r * cols + c;
                if (index >= (int)photos.size() || !photos[index].isTaken) continue;
                
                cv::Mat processedPhoto = isReceipt ? ApplyThermalFilter(photos[index].mat) : photos[index].mat.clone();
                
                // Auto crop to avoid "gepeng" (stretched/squished images)
                cv::Mat croppedPhoto = AutoCropToAspect(processedPhoto, (double)photoW / photoH);
                
                cv::Mat resizedPhoto;
                cv::resize(croppedPhoto, resizedPhoto, cv::Size(photoW, photoH), 0, 0, cv::INTER_CUBIC);
                
                // Border outline (1px for receipt)
                cv::rectangle(resizedPhoto, cv::Point(0, 0), cv::Point(photoW - 1, photoH - 1), borderBGR, isReceipt ? 1 : 2, cv::LINE_AA);
                
                int posX = marginX + c * (photoW + spacingX);
                int posY = marginTop + r * (photoH + spacingY);
                
                cv::Mat targetROI = canvas(cv::Rect(posX, posY, photoW, photoH));
                resizedPhoto.copyTo(targetROI);
            }
        }
        
        if (isReceipt) {
            // --- Thermal Receipt Header (Top of Grid) ---
            std::string tearOff = "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *";
            cv::putText(canvas, tearOff, cv::Point(45, 35), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, receiptTitle.c_str(), cv::Point(45, 75), cv::FONT_HERSHEY_DUPLEX, 1.1, textBGR, 2, cv::LINE_AA);
            cv::putText(canvas, receiptSubtitle.c_str(), cv::Point(45, 110), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "----------------------------------------------------------------------------------------------------------------", cv::Point(45, 135), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            
            std::string dateStr = "DATE: 2026-05-25  TIME: " + (timestamp.length() > 14 ? (timestamp.substr(9, 2) + ":" + timestamp.substr(11, 2)) : "17:30");
            cv::putText(canvas, dateStr, cv::Point(45, 160), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            std::string orderStr = "ORDER: #9821-" + (timestamp.length() > 14 ? timestamp.substr(9, 6) : "173000");
            cv::putText(canvas, orderStr, cv::Point(45, 185), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "CASHIER: ROBOT", cv::Point(45, 210), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "----------------------------------------------------------------------------------------------------------------", cv::Point(45, 230), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            
            // --- Thermal Receipt Footer (Bottom of Grid) ---
            int footerStartY = marginTop + gridHeight + 45;
            cv::putText(canvas, "----------------------------------------------------------------------------------------------------------------", cv::Point(45, footerStartY), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "ITEM DESCRIPTION                                                                             QTY          PRICE", cv::Point(45, footerStartY + 25), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "RETINA PHOTO ACQUISITION (GRID SET)                                                           6           $ 0.00", cv::Point(45, footerStartY + 50), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "STRIPS RETINA BORDER PRINT (GRID)                                                             1           $ 0.00", cv::Point(45, footerStartY + 70), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "THERMAL PAPER PREMIUM                                                                         1           $ 0.00", cv::Point(45, footerStartY + 90), cv::FONT_HERSHEY_SIMPLEX, 0.4, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "----------------------------------------------------------------------------------------------------------------", cv::Point(45, footerStartY + 110), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            
            cv::putText(canvas, "TOTAL AMOUNT (TAX INCL.)                                                                                  $ 0.00", cv::Point(45, footerStartY + 135), cv::FONT_HERSHEY_DUPLEX, 0.5, textBGR, 2, cv::LINE_AA);
            cv::putText(canvas, "----------------------------------------------------------------------------------------------------------------", cv::Point(45, footerStartY + 155), cv::FONT_HERSHEY_SIMPLEX, 0.5, borderBGR, 1, cv::LINE_AA);
            
            // Draw Mock Barcode
            DrawMockBarcode(canvas, cv::Rect(300, footerStartY + 165, canvasWidth - 600, 75), timestamp, textBGR, bgBGR);
            
            cv::putText(canvas, receiptSlogan.c_str(), cv::Point(490, footerStartY + 265), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, tearOff, cv::Point(45, footerStartY + 290), cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            
        } else {
            // --- Swiss Typographic Footer (Grid Style) ---
            int footerStartY = marginTop + gridHeight + 45;
            
            // Grid separation divider line
            cv::line(canvas, cv::Point(45, footerStartY), cv::Point(canvasWidth - 45, footerStartY), borderBGR, 1, cv::LINE_AA);
            
            // Left Column: Main branding
            cv::putText(canvas, "STRIPS BOOTH SYSTEM", cv::Point(45, footerStartY + 50), 
                        cv::FONT_HERSHEY_DUPLEX, 1.0, textBGR, 2, cv::LINE_AA);
            
            std::string descText = "LAYOUT: " + layout.name + " // COMPOSITION SUCCESSFUL";
            cv::putText(canvas, descText, cv::Point(45, footerStartY + 85), 
                        cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            
            // Right Column: Date & Timestamp
            std::string dateStr = "TIMESTAMP: " + timestamp;
            cv::putText(canvas, dateStr, cv::Point(canvasWidth - 420, footerStartY + 50), 
                        cv::FONT_HERSHEY_SIMPLEX, 0.45, textBGR, 1, cv::LINE_AA);
            cv::putText(canvas, "LDR PHOTOBOOTH // CO-OP ENG. v1.0", cv::Point(canvasWidth - 420, footerStartY + 75), 
                        cv::FONT_HERSHEY_SIMPLEX, 0.4, borderBGR, 1, cv::LINE_AA);
            
            // Draw elegant Swiss Cross badge right next to the right metadata
            int crossSize = 30;
            int crossX = canvasWidth - 45 - crossSize;
            int crossY = footerStartY + 45;
            
            // Red box
            cv::rectangle(canvas, cv::Rect(crossX, crossY, crossSize, crossSize), cv::Scalar(70, 57, 230), -1, cv::LINE_AA);
            // White cross
            int barThick = 6;
            int barLen = 18;
            cv::rectangle(canvas, 
                          cv::Rect(crossX + (crossSize - barLen)/2, crossY + (crossSize - barThick)/2, barLen, barThick), 
                          cv::Scalar(255, 255, 255), -1, cv::LINE_AA);
            cv::rectangle(canvas, 
                          cv::Rect(crossX + (crossSize - barThick)/2, crossY + (crossSize - barLen)/2, barThick, barLen), 
                          cv::Scalar(255, 255, 255), -1, cv::LINE_AA);
        }
    }
    
    // Save image to file
    std::string filename = "exports/swiss_booth_" + timestamp + ".png";
    
    // Make sure exports directory exists
    struct stat info;
    if (stat("exports", &info) != 0) {
        mkdir("exports", 0777);
    }
    
    std::cout << "[Processor] Exporting image file to " << filename << "..." << std::endl;
    bool success = cv::imwrite(filename, canvas);
    if (!success) {
        std::cerr << "[Processor] ERROR: Failed to write PNG to disk!" << std::endl;
        return "";
    }
    
    std::cout << "[Processor] Render saved successfully." << std::endl;
    return filename;
}
