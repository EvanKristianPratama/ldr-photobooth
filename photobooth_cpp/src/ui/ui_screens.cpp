#include "ui/ui.h"
#include <iostream>
#include <cmath>

// ── SCREEN 1: START SCREEN ──
void UIManager::DrawStartScreen(Vector2 mousePos, bool& startPressed) {
    // Layout consists of a beautiful off-center structural grid
    ClearBackground(COLOR_PURE_SNOW);
    
    // Giant typographic branding centerpiece
    SafeDrawText(fontBold, "STRIPS", { 80, 200 }, 120.0f, 2.0f, COLOR_DEEP_INK);
    SafeDrawText(fontBold, "BOOTH.", { 80, 310 }, 120.0f, 2.0f, COLOR_SWISS_RED);
    
    // Minimal subheader description block (aligned to grid column)
    float descY = 460.0f;
    SafeDrawText(fontRegular, "MINIMALIST HARDWARE CONTROL SYSTEM", { 85, descY }, 16.0f, 1.0f, COLOR_DEEP_INK);
    SafeDrawText(fontRegular, "HIGH-FIDELITY IMAGE STITCHING // 60 FPS CAM DRIVER", { 85, descY + 25 }, 13.0f, 1.0f, COLOR_SLATE_GRAY);
    SafeDrawText(fontRegular, "DESIGN INSPIRED BY BRUNO MONGLUZZI // ETH-ZURICH", { 85, descY + 45 }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
    
    // Interactive action block (Large Swiss flat block button)
    Rectangle btnBounds = { 85, descY + 90, 280, 60 };
    if (DrawButton(btnBounds, "TAP TO START BOOTH", true, mousePos) || IsKeyPressed(KEY_ENTER)) {
        startPressed = true;
    }
    
    // Vertical side brand section (Clean minimal logo)
    if (logoTexture.id != 0) {
        float aspect = (float)logoTexture.height / logoTexture.width;
        float logoW = 160.0f;
        float logoH = logoW * aspect;
        // Move logo to the top left
        float logoX = 70.0f;
        float logoY = 60.0f;
        
        DrawTexturePro(
            logoTexture,
            { 0, 0, (float)logoTexture.width, (float)logoTexture.height },
            { logoX, logoY, logoW, logoH },
            { 0, 0 }, 0.0f, WHITE
        );
    } else {
        // Fallback typography branding if image failed to load
        DrawRectangle(70, 60, 4, 120, COLOR_SWISS_RED);
        SafeDrawText(fontBold, "LDR", { 90, 60 }, 40.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "PHOTOBOOTH CO.", { 90, 105 }, 14.0f, 1.0f, COLOR_SLATE_GRAY);
    }
    
    // Little grid cross markers
    DrawLine(WINDOW_WIDTH - 200, WINDOW_HEIGHT - 100, WINDOW_WIDTH - 160, WINDOW_HEIGHT - 100, COLOR_SLATE_GRAY);
    DrawLine(WINDOW_WIDTH - 180, WINDOW_HEIGHT - 120, WINDOW_WIDTH - 180, WINDOW_HEIGHT - 80, COLOR_SLATE_GRAY);
}

// ── SCREEN 2: CHOOSE LAYOUT ──
void UIManager::DrawLayoutScreen(
    Vector2 mousePos,
    const std::vector<LayoutOption>& layouts,
    int& selectedLayout,
    bool& layoutConfirmed
) {
    ClearBackground(COLOR_PURE_SNOW);
    DrawHeader("CHOOSE STRUCTURE", "SELECT THE PHOTOCUT DISTRIBUTION GRID");
    DrawFooter("02 // STRUCTURE");
    
    // Responsive card sizing: fit up to 3 visible, scroll if more
    int maxVisible = 3;
    int layoutCount = (int)layouts.size();
    int spacingX = 30;
    
    int availableW = WINDOW_WIDTH - 120; // 60px margin each side
    int cardWidth = (availableW - spacingX * (std::min(layoutCount, maxVisible) - 1)) / std::min(layoutCount, maxVisible);
    if (cardWidth > 380) cardWidth = 380;
    int cardHeight = 420;
    
    int totalWidth = (cardWidth * layoutCount) + (spacingX * (layoutCount - 1));
    int startX = (WINDOW_WIDTH - std::min(totalWidth, availableW)) / 2;
    int startY = 150;
    
    // Horizontal scroll offset for many layouts
    static float scrollOffset = 0.0f;
    if (layoutCount > maxVisible) {
        float wheel = GetMouseWheelMove();
        scrollOffset -= wheel * 60.0f;
        float maxScroll = (float)(totalWidth - availableW);
        if (scrollOffset < 0) scrollOffset = 0;
        if (scrollOffset > maxScroll) scrollOffset = maxScroll;
    } else {
        scrollOffset = 0;
    }
    
    // Enable scissor clipping for overflow
    BeginScissorMode(40, startY - 10, WINDOW_WIDTH - 80, cardHeight + 20);
    
    for (int i = 0; i < layoutCount; ++i) {
        float cardX = (float)(startX + i * (cardWidth + spacingX)) - scrollOffset;
        Rectangle cardBounds = { cardX, (float)startY, (float)cardWidth, (float)cardHeight };
        
        // Skip drawing if completely off-screen
        if (cardX + cardWidth < 30 || cardX > WINDOW_WIDTH - 30) continue;
        
        bool hovered = CheckCollisionPointRec(mousePos, cardBounds);
        
        Color borderCol = COLOR_LIGHT_GRAY;
        float borderThickness = 1.0f;
        Color cardBg = COLOR_PURE_SNOW;
        
        if (i == selectedLayout) {
            borderCol = COLOR_SWISS_RED;
            borderThickness = 4.0f;
        } else if (hovered) {
            borderCol = COLOR_DEEP_INK;
            borderThickness = 2.0f;
        }
        
        // Draw flat card panel
        DrawRectangleRec(cardBounds, cardBg);
        DrawRectangleLinesEx(cardBounds, borderThickness, borderCol);
        
        // Label header
        SafeDrawText(fontBold, layouts[i].name, { cardBounds.x + 20, cardBounds.y + 18 }, 18.0f, 1.0f, COLOR_DEEP_INK);
        
        // Draw large minimalist vector grid preview mock
        float mockX = cardBounds.x + 25;
        float mockY = cardBounds.y + 55;
        float mockW = cardWidth - 50;
        float mockH = 280;
        
        DrawRectangle(mockX, mockY, mockW, mockH, COLOR_LIGHT_GRAY);
        DrawRectangleLinesEx({mockX, mockY, mockW, mockH}, 1.0f, COLOR_DEEP_INK);
        
        if (layouts[i].isCustom) {
            // Draw visual custom slots scaled to preview
            float scaleRefW = (layouts[i].paperSize == PaperSize::PAPER_2R) ? 600.0f : 1200.0f;
            float scaleRefH = 1800.0f;
            for (size_t s = 0; s < layouts[i].slotRects.size(); ++s) {
                // Skip hidden slots in preview
                if (!layouts[i].slotVisible.empty() && s < layouts[i].slotVisible.size() && !layouts[i].slotVisible[s]) continue;
                
                const auto& r = layouts[i].slotRects[s];
                float sx = mockX + (r.x / scaleRefW) * mockW;
                float sy = mockY + (r.y / scaleRefH) * mockH;
                float sw = (r.width / scaleRefW) * mockW;
                float sh = (r.height / scaleRefH) * mockH;
                DrawRectangle(sx, sy, sw, sh, COLOR_PURE_SNOW);
                DrawRectangleLinesEx({sx, sy, sw, sh}, 1.0f, COLOR_DEEP_INK);
                
                // Slot number label
                std::string slotLbl = std::to_string(s + 1);
                Vector2 lblSz = MeasureTextEx(fontBold, slotLbl.c_str(), 11.0f, 1.0f);
                SafeDrawText(fontBold, slotLbl, { sx + (sw - lblSz.x)/2, sy + (sh - lblSz.y)/2 }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
            }
        } else if (layouts[i].isVerticalStrip) {
            // Draw stacked vertical strip preview
            int count = layouts[i].photoCount;
            float margin = 10.0f;
            float phAreaH = mockH - (margin * 2.0f);
            float slotH = (phAreaH - (6.0f * (count - 1))) / count;
            for (int k = 0; k < count; ++k) {
                float py = mockY + margin + k * (slotH + 6.0f);
                DrawRectangle(mockX + margin, py, mockW - margin * 2, slotH, COLOR_PURE_SNOW);
                DrawRectangleLinesEx({mockX + margin, py, mockW - margin * 2, slotH}, 1.0f, COLOR_DEEP_INK);
            }
        } else {
            // Draw grid rectangles based on rows/cols
            int cols = layouts[i].cols;
            int rows = layouts[i].rows;
            float margin = 10.0f;
            float gap = 6.0f;
            float slotW = (mockW - margin * 2 - gap * (cols - 1)) / cols;
            float slotH = (mockH - margin * 2 - gap * (rows - 1)) / rows;
            
            for (int r = 0; r < rows; ++r) {
                for (int c = 0; c < cols; ++c) {
                    float px = mockX + margin + c * (slotW + gap);
                    float py = mockY + margin + r * (slotH + gap);
                    DrawRectangle(px, py, slotW, slotH, COLOR_PURE_SNOW);
                    DrawRectangleLinesEx({px, py, slotW, slotH}, 1.0f, COLOR_DEEP_INK);
                }
            }
        }
        
        // Specs text at bottom of card
        std::string specs = std::to_string(layouts[i].photoCount) + " PHOTOS";
        if (layouts[i].isCustom) {
            specs += " // COLLAGE";
            specs += (layouts[i].paperSize == PaperSize::PAPER_2R) ? " // 2R" : " // 4R";
        } else if (layouts[i].isVerticalStrip) {
            specs += " // STRIP 2R";
        } else {
            specs += " // " + std::to_string(layouts[i].cols) + "x" + std::to_string(layouts[i].rows) + " GRID";
        }
        SafeDrawText(fontRegular, specs, { cardBounds.x + 20, cardBounds.y + cardHeight - 50 }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
        
        // Check selection click
        if (hovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
            selectedLayout = i;
        }
    }
    
    EndScissorMode();
    
    // Scroll indicator dots if more than 3 layouts
    if (layoutCount > maxVisible) {
        float dotY = startY + cardHeight + 12;
        float dotStartX = WINDOW_WIDTH / 2.0f - layoutCount * 6.0f;
        for (int i = 0; i < layoutCount; ++i) {
            Color dotColor = (i == selectedLayout) ? COLOR_SWISS_RED : COLOR_LIGHT_GRAY;
            DrawCircle(dotStartX + i * 14, dotY, 4, dotColor);
        }
    }
    
    // Bottom Action button
    Rectangle nextBtnBounds = { (float)(WINDOW_WIDTH/2 - 150), (float)(startY + cardHeight + 35), 300, 50 };
    if (DrawButton(nextBtnBounds, "CONFIRM GRID STRUCTURE", true, mousePos)) {
        layoutConfirmed = true;
    }
}

// ── SCREEN 3: LIVE CAPTURE SCREEN ──
void UIManager::DrawCaptureScreen(
    int photoIndex,
    int totalPhotos,
    float countdown,
    Texture2D cameraTexture,
    bool isFlashActive
) {
    ClearBackground(COLOR_PURE_SNOW);
    DrawHeader("CAPTURING IMAGES", "MAINTAIN POSE // COUNTDOWN ACTIVE");
    DrawFooter("03 // ACQUISITION");
    
    // Main structural grid: Left Camera column, Right info column
    int camX = 60;
    int camY = 140;
    int camW = 760;
    int camH = 520;
    
    // Bezel box around camera
    DrawRectangleLinesEx({(float)camX - 4, (float)camY - 4, (float)camW + 8, (float)camH + 8}, 2.0f, COLOR_DEEP_INK);
    
    if (cameraTexture.id != 0) {
        // Draw the live webcam texture stretched inside boundaries
        DrawTexturePro(
            cameraTexture,
            { 0, 0, (float)cameraTexture.width, (float)cameraTexture.height },
            { (float)camX, (float)camY, (float)camW, (float)camH },
            { 0, 0 }, 0.0f, WHITE
        );
    } else {
        // Fallback gray box
        DrawRectangle(camX, camY, camW, camH, COLOR_LIGHT_GRAY);
    }
    
    // Display massive countdown overlay in center
    if (countdown > 0.05f) {
        // Semitransparent Swiss background overlay
        DrawRectangle(camX, camY, camW, camH, { 26, 26, 26, 80 });
        
        // Massive text showing whole numbers
        int seconds = (int)ceil(countdown);
        std::string countStr = std::to_string(seconds);
        
        float cdFontSize = 140.0f;
        Vector2 size = MeasureTextEx(fontBold, countStr.c_str(), cdFontSize, 1.0f);
        Vector2 pos = {
            camX + (camW - size.x)/2.0f,
            camY + (camH - size.y)/2.0f
        };
        
        // Draw backing drop offset
        SafeDrawText(fontBold, countStr, { pos.x + 4, pos.y + 4 }, cdFontSize, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontBold, countStr, pos, cdFontSize, 1.0f, COLOR_SWISS_RED);
    }
    
    // --- Right Sidebar Panel: Capture Tracking Status ---
    int sideX = camX + camW + 40;
    int sideY = camY;
    
    SafeDrawText(fontBold, "SEQUENCE TRACKER", { (float)sideX, (float)sideY }, 20.0f, 1.0f, COLOR_DEEP_INK);
    DrawLine(sideX, sideY + 28, WINDOW_WIDTH - 60, sideY + 28, COLOR_DEEP_INK);
    
    // Current slot progress bar
    float barY = sideY + 45.0f;
    std::string indexStr = "ACQUIRING: PHOTO " + std::to_string(photoIndex + 1) + " OF " + std::to_string(totalPhotos);
    SafeDrawText(fontBold, indexStr, { (float)sideX, barY }, 14.0f, 1.0f, COLOR_SWISS_RED);
    
    // Interactive geometric progress ticks
    int tickH = 20;
    int tickSpacing = 8;
    int tickTotalW = WINDOW_WIDTH - 60 - sideX;
    int tickW = (tickTotalW - (tickSpacing * (totalPhotos - 1))) / totalPhotos;
    
    for (int i = 0; i < totalPhotos; ++i) {
        Rectangle tickBounds = { (float)(sideX + i * (tickW + tickSpacing)), barY + 24.0f, (float)tickW, (float)tickH };
        Color tickColor = COLOR_LIGHT_GRAY;
        
        if (i < photoIndex) {
            tickColor = COLOR_DEEP_INK; // Already captured
        } else if (i == photoIndex) {
            // Blinking active state color using absolute time
            float phase = sin(GetTime() * 10.0f);
            tickColor = (phase > 0.0f) ? COLOR_SWISS_RED : COLOR_DEEP_INK;
        }
        
        DrawRectangleRec(tickBounds, tickColor);
    }
    
    // Minimal aesthetic quotes
    float tipsY = barY + 80.0f;
    SafeDrawText(fontBold, "INSTRUCTIONS:", { (float)sideX, tipsY }, 12.0f, 1.0f, COLOR_DEEP_INK);
    SafeDrawText(fontRegular, "- STAND CENTERED IN THE FRAME AREA", { (float)sideX, tipsY + 20 }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
    SafeDrawText(fontRegular, "- WAIT FOR STARK WHITE FLASH FEEDBACK", { (float)sideX, tipsY + 36 }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
    SafeDrawText(fontRegular, "- AVOID RAPID MOTION DURING ACQUISITION", { (float)sideX, tipsY + 52 }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
    
    // Dynamic Flash Trigger Overlay (Full stark white canvas cover)
    if (isFlashActive) {
        DrawRectangle(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT, WHITE);
    }
}

// ── SCREEN 3b: RETAKE REVIEW SCREEN ──
void UIManager::DrawReviewScreen(
    Vector2 mousePos,
    Texture2D photoTexture,
    int photoIndex,
    bool& requestRetake,
    bool& requestKeep
) {
    ClearBackground(COLOR_PURE_SNOW);
    DrawHeader("REVIEW ACQUIRED IMAGE", "VALIDATE THE IMAGE FRAME POSE OR RE-SHOOT");
    DrawFooter("03B // REVIEW");
    
    int camX = 60;
    int camY = 140;
    int camW = 760;
    int camH = 520;
    
    DrawRectangleLinesEx({(float)camX - 4, (float)camY - 4, (float)camW + 8, (float)camH + 8}, 2.0f, COLOR_DEEP_INK);
    
    if (photoTexture.id != 0) {
        DrawTexturePro(
            photoTexture,
            { 0, 0, (float)photoTexture.width, (float)photoTexture.height },
            { (float)camX, (float)camY, (float)camW, (float)camH },
            { 0, 0 }, 0.0f, WHITE
        );
    } else {
        DrawRectangle(camX, camY, camW, camH, COLOR_LIGHT_GRAY);
    }
    
    // Review options on the sidebar
    int sideX = camX + camW + 40;
    int sideY = camY;
    
    std::string indexStr = "REVIEWING SLOT // " + std::to_string(photoIndex + 1);
    SafeDrawText(fontBold, indexStr, { (float)sideX, (float)sideY }, 20.0f, 1.0f, COLOR_DEEP_INK);
    DrawLine(sideX, sideY + 28, WINDOW_WIDTH - 60, sideY + 28, COLOR_DEEP_INK);
    
    SafeDrawText(fontRegular, "DOES THIS POSE ALIGN CORRECTLY?", { (float)sideX, (float)(sideY + 45) }, 13.0f, 1.0f, COLOR_SLATE_GRAY);
    SafeDrawText(fontRegular, "IF SATISFIED, KEEP AND PUSH NEXT OR", { (float)sideX, (float)(sideY + 65) }, 12.0f, 1.0f, COLOR_SLATE_GRAY);
    SafeDrawText(fontRegular, "RETREAD SHUTTER SEQUENCE.", { (float)sideX, (float)(sideY + 81) }, 12.0f, 1.0f, COLOR_SLATE_GRAY);
    
    // Giant structural flat control buttons
    Rectangle keepBtn = { (float)sideX, (float)(sideY + 130), (float)(WINDOW_WIDTH - 60 - sideX), 60 };
    Rectangle retakeBtn = { (float)sideX, (float)(sideY + 205), (float)(WINDOW_WIDTH - 60 - sideX), 50 };
    
    if (DrawButton(keepBtn, "KEEP & CONTINUE", true, mousePos) || IsKeyPressed(KEY_SPACE)) {
        requestKeep = true;
    }
    
    if (DrawButton(retakeBtn, "RE-TAKE PHOTO", false, mousePos) || IsKeyPressed(KEY_R)) {
        requestRetake = true;
    }
}

// ── SCREEN 4: CHOOSE FRAME COLOR/STYLE ──
void UIManager::DrawFrameScreen(
    Vector2 mousePos,
    const std::vector<FrameOption>& frames,
    int& selectedFrame,
    Texture2D previewTexture,
    bool& frameConfirmed
) {
    ClearBackground(COLOR_PURE_SNOW);
    DrawHeader("CUSTOMIZE CANVAS BORDERS", "CHOOSE SWISS PRINT STYLING COLOR WAY");
    DrawFooter("04 // FRAMING");
    
    // Left: Live photo composition strip/grid preview
    int previewX = 80;
    int previewY = 135;
    int previewW = 380;
    int previewH = 515;
    
    DrawRectangleLinesEx({(float)previewX - 4, (float)previewY - 4, (float)previewW + 8, (float)previewH + 8}, 2.0f, COLOR_DEEP_INK);
    
    if (previewTexture.id != 0) {
        DrawTexturePro(
            previewTexture,
            { 0, 0, (float)previewTexture.width, (float)previewTexture.height },
            { (float)previewX, (float)previewY, (float)previewW, (float)previewH },
            { 0, 0 }, 0.0f, WHITE
        );
    } else {
        DrawRectangle(previewX, previewY, previewW, previewH, COLOR_LIGHT_GRAY);
        SafeDrawText(fontBold, "PREVIEW STITCH", { (float)(previewX + 70), (float)(previewY + 240) }, 18.0f, 1.0f, COLOR_DEEP_INK);
    }
    
    // Right: Framing select listing
    int panelX = previewX + previewW + 60;
    int panelY = previewY;
    
    SafeDrawText(fontBold, "FRAME SELECTOR GRID", { (float)panelX, (float)panelY }, 20.0f, 1.0f, COLOR_DEEP_INK);
    DrawLine(panelX, panelY + 28, WINDOW_WIDTH - 80, panelY + 28, COLOR_DEEP_INK);
    
    int optH = 46;
    int optSpacing = 12;
    int colW = (WINDOW_WIDTH - 80 - panelX - 20) / 2;
    
    for (size_t i = 0; i < frames.size(); ++i) {
        int col = i % 2;
        int row = i / 2;
        Rectangle optBounds = { 
            (float)(panelX + col * (colW + 20)), 
            (float)(panelY + 45 + row * (optH + optSpacing)), 
            (float)colW, 
            (float)optH 
        };
        
        bool hovered = CheckCollisionPointRec(mousePos, optBounds);
        
        Color borderCol = COLOR_LIGHT_GRAY;
        float borderThickness = 1.0f;
        
        if ((int)i == selectedFrame) {
            borderCol = COLOR_SWISS_RED;
            borderThickness = 3.0f;
        } else if (hovered) {
            borderCol = COLOR_DEEP_INK;
            borderThickness = 2.0f;
        }
        
        DrawRectangleRec(optBounds, COLOR_PURE_SNOW);
        DrawRectangleLinesEx(optBounds, borderThickness, borderCol);
        
        // Color badge swatch (Left-side circle inside options list)
        DrawCircle(optBounds.x + 20, optBounds.y + optH/2, 10, frames[i].color);
        DrawCircleLines(optBounds.x + 20, optBounds.y + optH/2, 10, COLOR_DEEP_INK);
        
        // Title
        SafeDrawText(fontBold, frames[i].name, { optBounds.x + 40, optBounds.y + 14 }, 12.0f, 1.0f, COLOR_DEEP_INK);
        
        if (hovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
            selectedFrame = i;
        }
    }
    
    // Confirm & Compile button
    Rectangle confirmBtn = { (float)panelX, (float)(WINDOW_HEIGHT - 170), (float)(WINDOW_WIDTH - 80 - panelX), 55 };
    if (DrawButton(confirmBtn, "COMPILE AND SAVE HIGH-RES STACK", true, mousePos)) {
        frameConfirmed = true;
    }
}

// ── SCREEN 5: FINAL EXPORT RESULT SCREEN ──
void UIManager::DrawResultScreen(
    Vector2 mousePos,
    const std::string& exportedPath,
    Texture2D finalTexture,
    bool& requestRestart,
    bool& requestDownload,
    bool& requestPrint
) {
    ClearBackground(COLOR_PURE_SNOW);
    DrawHeader("STITCH COMPILED SUCCESSFULLY", "SAVED TO EXPORTS DISK");
    DrawFooter("05 // EXPORT STATUS");
    
    // Display output centered
    int previewW = 320;
    int previewH = 500;
    int previewX = 80;
    int previewY = 135;
    
    DrawRectangleLinesEx({(float)previewX - 4, (float)previewY - 4, (float)previewW + 8, (float)previewH + 8}, 2.0f, COLOR_DEEP_INK);
    
    if (finalTexture.id != 0) {
        DrawTexturePro(
            finalTexture,
            { 0, 0, (float)finalTexture.width, (float)finalTexture.height },
            { (float)previewX, (float)previewY, (float)previewW, (float)previewH },
            { 0, 0 }, 0.0f, WHITE
        );
    } else {
        DrawRectangle(previewX, previewY, previewW, previewH, COLOR_LIGHT_GRAY);
    }
    
    int sideX = previewX + previewW + 60;
    int sideY = previewY;
    
    SafeDrawText(fontBold, "SWISS RENDER CONGRATS", { (float)sideX, (float)sideY }, 20.0f, 1.0f, COLOR_SWISS_RED);
    DrawLine(sideX, sideY + 28, WINDOW_WIDTH - 80, sideY + 28, COLOR_DEEP_INK);
    
    SafeDrawText(fontBold, "DISPATCH FILE DETAILS:", { (float)sideX, (float)(sideY + 45) }, 13.0f, 1.0f, COLOR_DEEP_INK);
    
    // File path block (Handle line wrapping elegantly)
    std::string shortPath = exportedPath;
    if (shortPath.length() > 50) {
        shortPath = "exports/" + shortPath.substr(shortPath.find_last_of("/\\") + 1);
    }
    SafeDrawText(fontRegular, shortPath, { (float)sideX, (float)(sideY + 70) }, 12.0f, 1.0f, COLOR_DEEP_INK);
    
    // Aesthetic grids
    float qryY = sideY + 115.0f;
    SafeDrawText(fontBold, "MEMORIES RECORDED SUCCESSFULLY", { (float)sideX, qryY }, 12.0f, 1.0f, COLOR_DEEP_INK);
    SafeDrawText(fontRegular, "THE RESULT HAS BEEN EXPORTED AT FULL 300 DPI", { (float)sideX, qryY + 20 }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
    SafeDrawText(fontRegular, "PRINT FORMAT COMPATIBLE WITH CITIZEN & DNP THERMALS", { (float)sideX, qryY + 36 }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
    
    // Premium Print button (Primary action)
    Rectangle printBtn = { (float)sideX, (float)(WINDOW_HEIGHT - 320), (float)(WINDOW_WIDTH - 80 - sideX), 55 };
    std::string printText = "🖨️ PRINT RECIPT / PHOTO STRIP";
    if (!selectedPrinterName.empty()) {
        printText += " (" + selectedPrinterName + ")";
    }
    if (DrawButton(printBtn, printText, true, mousePos) || IsKeyPressed(KEY_P)) {
        requestPrint = true;
    }
    
    // Premium Download/Save to Desktop button
    Rectangle downloadBtn = { (float)sideX, (float)(WINDOW_HEIGHT - 245), (float)(WINDOW_WIDTH - 80 - sideX), 55 };
    if (DrawButton(downloadBtn, "DOWNLOAD / SAVE TO DESKTOP", false, mousePos)) {
        requestDownload = true;
    }
    
    // Interactive action loop button
    Rectangle restartBtn = { (float)sideX, (float)(WINDOW_HEIGHT - 170), (float)(WINDOW_WIDTH - 80 - sideX), 55 };
    if (DrawButton(restartBtn, "FINISH // START NEW SESSION", false, mousePos) || IsKeyPressed(KEY_ENTER)) {
        requestRestart = true;
    }
}

// ── NEW SCREEN: Sleek premium Swiss-style loading screen ──
void UIManager::DrawLoadingScreen(const std::string& message) {
    ClearBackground(COLOR_PURE_SNOW);
    
    DrawHeader("SYSTEM PROGRESS", "PLEASE WAIT WHILE PROCESSING");
    DrawFooter("00 // OPERATION PENDING");
    
    // Message in the center
    float msgFontSize = 24.0f;
    Vector2 msgSize = MeasureTextEx(fontBold, message.c_str(), msgFontSize, 1.0f);
    Vector2 msgPos = {
        (WINDOW_WIDTH - msgSize.x) / 2.0f,
        (WINDOW_HEIGHT - msgSize.y) / 2.0f - 30.0f
    };
    SafeDrawText(fontBold, message, msgPos, msgFontSize, 1.0f, COLOR_DEEP_INK);
    
    // Premium Swiss marquee loading bar
    float progressWidth = 460.0f;
    float progressHeight = 14.0f;
    float px = (WINDOW_WIDTH - progressWidth) / 2.0f;
    float py = (WINDOW_HEIGHT - progressHeight) / 2.0f + 25.0f;
    
    // Draw outer bezel
    DrawRectangleLinesEx({ px - 3, py - 3, progressWidth + 6, progressHeight + 6 }, 1.5f, COLOR_DEEP_INK);
    DrawRectangleRec({ px, py, progressWidth, progressHeight }, COLOR_LIGHT_GRAY);
    
    // Draw animated marquee indicator
    float time = (float)GetTime();
    float activeW = 140.0f;
    float activeX = px + fmodf(time * 240.0f, progressWidth + activeW) - activeW;
    
    // Limit to actual bar boundaries using scissor
    BeginScissorMode((int)px, (int)py, (int)progressWidth, (int)progressHeight);
    DrawRectangleRec({ activeX, py, activeW, progressHeight }, COLOR_SWISS_RED);
    EndScissorMode();
}
