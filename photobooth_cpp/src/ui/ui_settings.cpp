#include "ui/ui.h"
#include "ui/ui_persistence.h"
#include "printer.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <sys/stat.h>
#include <dirent.h>

void UIManager::ScanAvailableBackgrounds() {
    availableBackgrounds.clear();
    DIR* dir = opendir("assets/backgrounds");
    if (dir) {
        struct dirent* entry;
        while ((entry = readdir(dir)) != nullptr) {
            std::string fname = entry->d_name;
            if (fname.length() > 4) {
                std::string ext = fname.substr(fname.length() - 4);
                // Convert ext to lowercase for comparison
                for (auto& c : ext) c = tolower(c);
                if (ext == ".png" || ext == ".jpg") {
                    availableBackgrounds.push_back("assets/backgrounds/" + fname);
                }
            }
        }
        closedir(dir);
        std::sort(availableBackgrounds.begin(), availableBackgrounds.end());
    }
    std::cout << "[BG] Scanned " << availableBackgrounds.size() << " background images." << std::endl;
}

void UIManager::InitializeAdobeCanvasSlots() {
    float maxW = (tempPaperSize == PaperSize::PAPER_2R) ? 600.0f : 1200.0f;
    float maxH = 1800.0f;
    
    tempSlotRects.clear();
    tempZOrder.clear();
    tempSlotVisible.clear();
    tempSlotLocked.clear();
    tempSlotRotation.clear();
    
    for (int i = 0; i < newLayoutPhotoCount; ++i) {
        // Sensible initial layouts distributed vertically
        float w = std::min(500.0f, maxW - 100.0f);
        float h = 360.0f;
        float x = (maxW - w) / 2.0f;
        float y = 80.0f + i * 400.0f;
        if (y + h > maxH) y = 80.0f; // wrapping fallback
        tempSlotRects.push_back({ x, y, w, h });
        tempZOrder.push_back(i);
        tempSlotVisible.push_back(true);
        tempSlotLocked.push_back(false);
        tempSlotRotation.push_back(0.0f);
    }
    selectedSlotIdx = -1;
    isResizing = false;
    
    // Scan backgrounds on first init
    if (availableBackgrounds.empty()) {
        ScanAvailableBackgrounds();
    }
}

void UIManager::DrawSettingsScreen(
    Vector2 mousePos,
    ReceiptConfig& config,
    std::vector<FrameOption>& frames,
    std::vector<LayoutOption>& layouts,
    bool& requestSave,
    bool& requestOpenStudio
) {
    ClearBackground(COLOR_PURE_SNOW);
    DrawHeader("SYSTEM SETTINGS", "DYNAMIC FRAME & PORTABLE LAYOUTS SYSTEM CONFIGURATION");
    DrawFooter("06 // SETTINGS");
    
    // Photoshop-style Tab Navigation Bar
    Rectangle tab1Bounds = { 60, 105, 200, 35 };
    Rectangle tab2Bounds = { 275, 105, 200, 35 };
    Rectangle tab3Bounds = { 490, 105, 200, 35 };
    
    if (DrawButton(tab1Bounds, "1. GENERAL & FRAMES", settingsTab == 0, mousePos)) {
        settingsTab = 0;
    }
    if (DrawButton(tab2Bounds, "2. DYNAMIC LAYOUTS", settingsTab == 1, mousePos)) {
        settingsTab = 1;
    }
    if (DrawButton(tab3Bounds, "3. PRINTER SETTINGS", settingsTab == 2, mousePos)) {
        settingsTab = 2;
    }
    
    int colLeftX = 60;
    int colRightX = 680;
    int colW = 540;
    int colY = 160;
    int colH = 500;
    
    // Draw columns outline panels for Swiss layout
    DrawRectangleLinesEx({ (float)colLeftX - 15, (float)colY - 15, (float)colW + 30, (float)colH + 30 }, 1.0f, COLOR_DEEP_INK);
    DrawRectangleLinesEx({ (float)colRightX - 15, (float)colY - 15, (float)colW + 30, (float)colH + 30 }, 1.0f, COLOR_DEEP_INK);
    
    if (settingsTab == 0) {
        // ==========================================
        // LEFT COLUMN: DISPLAY & RECEIPT SETTINGS
        // ==========================================
        SafeDrawText(fontBold, "1. DISPLAY & SYSTEM TEXTS", { (float)colLeftX, (float)colY }, 16.0f, 1.0f, COLOR_SWISS_RED);
        DrawLine(colLeftX, colY + 22, colLeftX + colW, colY + 22, COLOR_LIGHT_GRAY);
        
        Rectangle fsBtn = { (float)colLeftX, (float)(colY + 32), 260.0f, 40.0f };
        std::string fsText = IsWindowFullscreen() ? "DISABLE FULLSCREEN MODE" : "ENABLE FULLSCREEN MODE";
        if (DrawButton(fsBtn, fsText, false, mousePos)) {
            ToggleFullscreen();
        }
        
        int inputY = colY + 90;
        SafeDrawText(fontBold, "RECEIPT HEADER TITLE", { (float)colLeftX, (float)inputY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "Stark large header banner (e.g. LDR THERMAL BOOTH)", { (float)colLeftX, (float)(inputY + 18) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        DrawTextBox({ (float)colLeftX, (float)(inputY + 34), (float)colW, 36.0f }, config.title, activeBoxTitle, mousePos);
        
        inputY += 105;
        SafeDrawText(fontBold, "RECEIPT HEADER SUBTITLE / ADDRESS", { (float)colLeftX, (float)inputY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "Studio address or subtitle text (e.g. STORE #9821 // TOKYO)", { (float)colLeftX, (float)(inputY + 18) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        DrawTextBox({ (float)colLeftX, (float)(inputY + 34), (float)colW, 36.0f }, config.subtitle, activeBoxSubtitle, mousePos);
        
        inputY += 105;
        SafeDrawText(fontBold, "RECEIPT SLOGAN / FOOTER MESSAGE", { (float)colLeftX, (float)inputY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "A minimal custom footer slogan (e.g. SEE YOU AGAIN!)", { (float)colLeftX, (float)(inputY + 18) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        DrawTextBox({ (float)colLeftX, (float)(inputY + 34), (float)colW, 36.0f }, config.slogan, activeBoxSlogan, mousePos);
        
        // ==========================================
        // RIGHT COLUMN: FRAME CMS (DYNAMIC CREATION)
        // ==========================================
        SafeDrawText(fontBold, "2. FRAME CMS (ADD NEW PRESETS)", { (float)colRightX, (float)colY }, 16.0f, 1.0f, COLOR_SWISS_RED);
        DrawLine(colRightX, colY + 22, colRightX + colW, colY + 22, COLOR_LIGHT_GRAY);
        
        int cmsY = colY + 32;
        SafeDrawText(fontBold, "NEW FRAME PRESET NAME", { (float)colRightX, (float)cmsY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "The name of this frame (e.g. PREMIUM VINTAGE)", { (float)colRightX, (float)(cmsY + 18) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        DrawTextBox({ (float)colRightX, (float)(cmsY + 34), (float)colW, 36.0f }, newFrameName, activeBoxFrameName, mousePos);
        
        cmsY += 105;
        SafeDrawText(fontBold, "BACKGROUND COLOR HEX (RRGGBB)", { (float)colRightX, (float)cmsY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "Hexadecimal color for frame canvas (e.g. FFB6C1)", { (float)colRightX, (float)(cmsY + 18) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        DrawTextBox({ (float)colRightX, (float)(cmsY + 34), (float)colW, 36.0f }, newFrameBG, activeBoxFrameBG, mousePos);
        
        cmsY += 105;
        SafeDrawText(fontBold, "TEXT / BORDER COLOR HEX (RRGGBB)", { (float)colRightX, (float)cmsY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "Hexadecimal color for labels & outlines (e.g. 262626)", { (float)colRightX, (float)(cmsY + 18) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        DrawTextBox({ (float)colRightX, (float)(cmsY + 34), (float)colW, 36.0f }, newFrameText, activeBoxFrameText, mousePos);
        
        cmsY += 105;
        SafeDrawText(fontBold, "FRAME STYLING THEME", { (float)colRightX, (float)cmsY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        
        // Toggle button for Style
        Rectangle toggleBtn = { (float)colRightX, (float)(cmsY + 22), 260.0f, 36.0f };
        std::string toggleText = newFrameIsReceipt ? "STYLE: THERMAL RECEIPT KASIR" : "STYLE: CLEAN MINIMAL PHOTO";
        if (DrawButton(toggleBtn, toggleText, newFrameIsReceipt, mousePos)) {
            newFrameIsReceipt = !newFrameIsReceipt;
        }
        
        // Swatch preview square right next to toggle button
        DrawRectangle(colRightX + 280, cmsY + 22, 36, 36, HexToColor(newFrameBG));
        DrawRectangleLinesEx({(float)colRightX + 280, (float)cmsY + 22, 36.0f, 36.0f}, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontBold, "Aa", { (float)colRightX + 290, (float)(cmsY + 30) }, 14.0f, 1.0f, HexToColor(newFrameText));
        
        // Add Frame button
        Rectangle addBtn = { (float)colRightX + 340, (float)(cmsY + 22), 200.0f, 36.0f };
        if (DrawButton(addBtn, "✚ ADD FRAME", true, mousePos)) {
            if (!newFrameName.empty() && newFrameBG.length() == 6 && newFrameText.length() == 6) {
                FrameOption opt;
                opt.name = newFrameName;
                opt.color = HexToColor(newFrameBG);
                opt.textColor = HexToColor(newFrameText);
                opt.isReceipt = newFrameIsReceipt;
                
                // Push to presets
                frames.push_back(opt);
                
                // Save immediately for persistence
                SaveFramesToDisk(frames);
                
                // Clear CMS input form values
                newFrameName = "";
                newFrameBG = "FFFFFF";
                newFrameText = "000000";
                newFrameIsReceipt = false;
                
                std::cout << "[CMS] Dynamic frame successfully created and saved!" << std::endl;
            } else {
                std::cerr << "[CMS] ERROR: Invalid input fields for dynamic frame preset!" << std::endl;
            }
        }
    } else if (settingsTab == 1) {
        // ==========================================
        // LEFT COLUMN: LAYOUTS DIRECTORY
        // ==========================================
        SafeDrawText(fontBold, "1. ACTIVE LAYOUTS DIRECTORY", { (float)colLeftX, (float)colY }, 16.0f, 1.0f, COLOR_SWISS_RED);
        DrawLine(colLeftX, colY + 22, colLeftX + colW, colY + 22, COLOR_LIGHT_GRAY);
        
        int rowY = colY + 36;
        for (size_t i = 0; i < layouts.size() && i < 8; ++i) {
            const auto& l = layouts[i];
            
            // Row backing card
            DrawRectangle(colLeftX, rowY, colW, 46, COLOR_LIGHT_GRAY);
            DrawRectangleLinesEx({(float)colLeftX, (float)rowY, (float)colW, 46.0f}, 1.0f, COLOR_DEEP_INK);
            
            // Name
            SafeDrawText(fontBold, l.name, { (float)colLeftX + 12, (float)rowY + 14 }, 13.0f, 1.0f, COLOR_DEEP_INK);
            
            // Metrics label
            std::string spec = std::to_string(l.photoCount) + " PIC // " + (l.isCustom ? "ADOBE COLLAGE" : std::to_string(l.cols) + "x" + std::to_string(l.rows) + " GRID") + " // " + (l.isVerticalStrip ? "2R DUAL" : "4R FULL");
            SafeDrawText(fontRegular, spec, { (float)colLeftX + 215, (float)rowY + 16 }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
            
            // Protect default presets
            bool isDefault = (l.name == "CLASSIC 4-STRIP" || l.name == "MODERN 2x2 GRID" || l.name == "POSTER 3x2 GRID");
            if (!isDefault) {
                Rectangle delBtn = { (float)(colLeftX + colW - 85), (float)(rowY + 8), 75.0f, 30.0f };
                if (DrawButton(delBtn, "DELETE", false, mousePos)) {
                    layouts.erase(layouts.begin() + i);
                    SaveLayoutsToDisk(layouts);
                    break;
                }
            } else {
                SafeDrawText(fontBold, "LOCKED", { (float)(colLeftX + colW - 75), (float)(rowY + 16) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
            }
            rowY += 54;
        }
        
        // ==========================================
        // RIGHT COLUMN: PHOTOSHOP GRID/CANVAS CREATOR
        // ==========================================
        SafeDrawText(fontBold, "2. ADOBE-STYLE GRID/CANVAS CREATOR", { (float)colRightX, (float)colY }, 16.0f, 1.0f, COLOR_SWISS_RED);
        DrawLine(colRightX, colY + 22, colRightX + colW, colY + 22, COLOR_LIGHT_GRAY);
        
        int cmsY = colY + 32;
        SafeDrawText(fontBold, "NEW LAYOUT PRESET NAME", { (float)colRightX, (float)cmsY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        DrawTextBox({ (float)colRightX, (float)(cmsY + 24), (float)colW, 36.0f }, newLayoutName, activeBoxLayoutName, mousePos);
        
        cmsY += 78;
        
        // Adjuster label for Photos to Capture
        SafeDrawText(fontBold, "PHOTOS TO CAPTURE IN LAYOUT", { (float)colRightX, (float)cmsY }, 12.0f, 1.0f, COLOR_DEEP_INK);
        Rectangle pMinus = { (float)colRightX + 220, (float)(cmsY - 4), 26.0f, 26.0f };
        Rectangle pPlus = { (float)colRightX + 276, (float)(cmsY - 4), 26.0f, 26.0f };
        if (DrawButton(pMinus, "-", false, mousePos) && newLayoutPhotoCount > 1) {
            newLayoutPhotoCount--;
            InitializeAdobeCanvasSlots();
        }
        if (DrawButton(pPlus, "+", false, mousePos) && newLayoutPhotoCount < 8) {
            newLayoutPhotoCount++;
            InitializeAdobeCanvasSlots();
        }
        SafeDrawText(fontBold, std::to_string(newLayoutPhotoCount), { (float)colRightX + 254, (float)(cmsY + 1) }, 13.0f, 1.0f, COLOR_DEEP_INK);
        
        cmsY += 46;
        
        // Visual Canvas studio info
        SafeDrawText(fontBold, "VISUAL CANVAS STUDIO", { (float)colRightX, (float)cmsY }, 14.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "Full-screen drag & drop editor with smart", { (float)colRightX, (float)(cmsY + 22) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        SafeDrawText(fontRegular, "alignment guides, text overlays, and image import.", { (float)colRightX, (float)(cmsY + 38) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        
        Rectangle openStudioBtn = { (float)colRightX, (float)(cmsY + 60), 360.0f, 50.0f };
        if (DrawButton(openStudioBtn, "OPEN CANVAS STUDIO", true, mousePos)) {
            if (!newLayoutName.empty() && newLayoutPhotoCount >= 1) {
                // Initialize canvas slots and switch to studio
                InitializeAdobeCanvasSlots();
                tempOverlays.clear();
                selectedOverlayIdx = -1;
                requestOpenStudio = true;
            }
        }
        
        if (newLayoutName.empty()) {
            SafeDrawText(fontRegular, "ENTER A LAYOUT NAME ABOVE FIRST TO OPEN STUDIO", { (float)colRightX, (float)(cmsY + 124) }, 10.0f, 1.0f, COLOR_SWISS_RED);
        }
    } else if (settingsTab == 2) {
        // ==========================================
        // LEFT COLUMN: PRINTER SELECTION & DISCOVERY
        // ==========================================
        SafeDrawText(fontBold, "1. PRINTER DISCOVERY & CONFIGURATION", { (float)colLeftX, (float)colY }, 16.0f, 1.0f, COLOR_SWISS_RED);
        DrawLine(colLeftX, colY + 22, colLeftX + colW, colY + 22, COLOR_LIGHT_GRAY);
        
        int prtY = colY + 32;
        
        // Show current printer
        std::string currentPrtText = "SELECTED PRINTER: " + (selectedPrinterName.empty() ? "NONE (PLEASE SCAN & SELECT)" : selectedPrinterName);
        SafeDrawText(fontBold, currentPrtText, { (float)colLeftX, (float)prtY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        
        prtY += 28;
        
        // Scan Button
        Rectangle scanBtn = { (float)colLeftX, (float)prtY, 260.0f, 36.0f };
        if (DrawButton(scanBtn, "🔍 SCAN FOR PRINTERS", false, mousePos)) {
            availablePrinters = PrinterManager::GetAvailablePrinters();
            printerStatusMessage = "SCAN COMPLETED: FOUND " + std::to_string(availablePrinters.size()) + " PRINTERS.";
            
            // Set selection index if previously matched
            printerSelectionIdx = -1;
            for (size_t i = 0; i < availablePrinters.size(); ++i) {
                if (availablePrinters[i] == selectedPrinterName) {
                    printerSelectionIdx = i;
                    break;
                }
            }
        }
        
        prtY += 54;
        
        // Scan list title
        SafeDrawText(fontBold, "AVAILABLE SYSTEM PRINTERS (CLICK TO SELECT)", { (float)colLeftX, (float)prtY }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
        
        prtY += 18;
        
        // Render the scanned printers list
        if (availablePrinters.empty()) {
            DrawRectangle(colLeftX, prtY, colW, 180, COLOR_LIGHT_GRAY);
            DrawRectangleLinesEx({(float)colLeftX, (float)prtY, (float)colW, 180.0f}, 1.0f, COLOR_DEEP_INK);
            SafeDrawText(fontBold, "NO PRINTERS FOUND OR SCANNED YET", { (float)colLeftX + 20, (float)prtY + 80 }, 13.0f, 1.0f, COLOR_SLATE_GRAY);
            SafeDrawText(fontRegular, "Make sure your printer is turned on, connected, and paired in macOS settings.", { (float)colLeftX + 20, (float)prtY + 102 }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        } else {
            static int printerScrollOffset = 0;
            int maxVisiblePrinters = 4;
            int totalPrinters = (int)availablePrinters.size();
            
            // Safe clamp scroll offset
            if (printerScrollOffset < 0) printerScrollOffset = 0;
            if (printerScrollOffset + maxVisiblePrinters > totalPrinters) {
                printerScrollOffset = std::max(0, totalPrinters - maxVisiblePrinters);
            }
            
            // Mouse wheel scroll support
            Rectangle listArea = { (float)colLeftX, (float)prtY, (float)colW, 180.0f };
            if (CheckCollisionPointRec(mousePos, listArea)) {
                float wheel = GetMouseWheelMove();
                if (wheel > 0.0f && printerScrollOffset > 0) {
                    printerScrollOffset--;
                } else if (wheel < 0.0f && printerScrollOffset + maxVisiblePrinters < totalPrinters) {
                    printerScrollOffset++;
                }
            }
            
            float itemW = colW;
            if (totalPrinters > maxVisiblePrinters) {
                itemW = colW - 50.0f; // Leave 50px for scroll buttons
            }
            
            int rowY = prtY;
            for (int i = 0; i < maxVisiblePrinters; ++i) {
                int actualIdx = printerScrollOffset + i;
                if (actualIdx >= totalPrinters) break;
                
                std::string prtName = availablePrinters[actualIdx];
                // Show clean short name
                std::string displayName = prtName;
                if (displayName.rfind("/dev/", 0) == 0) {
                    displayName = displayName.substr(5); // strip "/dev/"
                }
                
                bool isCurrent = (selectedPrinterName == prtName);
                
                Rectangle itemRect = { (float)colLeftX, (float)rowY, itemW, 40.0f };
                if (DrawButton(itemRect, displayName, isCurrent, mousePos)) {
                    selectedPrinterName = prtName;
                    printerSelectionIdx = actualIdx;
                    printerStatusMessage = "SELECTED DEVICE: " + displayName;
                    // Persist selection
                    PrinterManager::SavePrinterSettings(selectedPrinterName, isAutoPrintEnabled);
                }
                
                rowY += 46;
            }
            
            // Render UP / DOWN scroll buttons on the right side if there's overflow
            if (totalPrinters > maxVisiblePrinters) {
                Rectangle upBtn = { (float)(colLeftX + colW - 40), (float)prtY, 40.0f, 85.0f };
                Rectangle downBtn = { (float)(colLeftX + colW - 40), (float)(prtY + 95), 40.0f, 85.0f };
                
                if (DrawButton(upBtn, "▲", printerScrollOffset > 0, mousePos) && printerScrollOffset > 0) {
                    printerScrollOffset--;
                }
                if (DrawButton(downBtn, "▼", printerScrollOffset + maxVisiblePrinters < totalPrinters, mousePos) && printerScrollOffset + maxVisiblePrinters < totalPrinters) {
                    printerScrollOffset++;
                }
            }
        }
        
        // Auto-print option at the bottom
        prtY += 210;
        SafeDrawText(fontBold, "AUTOMATIC WORKFLOW CONFIGURATION", { (float)colLeftX, (float)prtY }, 12.0f, 1.0f, COLOR_DEEP_INK);
        
        Rectangle autoPrtBtn = { (float)colLeftX, (float)(prtY + 20), 280.0f, 36.0f };
        std::string autoPrtText = isAutoPrintEnabled ? "AUTO-PRINT: ENABLED" : "AUTO-PRINT: DISABLED (MANUAL ONLY)";
        if (DrawButton(autoPrtBtn, autoPrtText, isAutoPrintEnabled, mousePos)) {
            isAutoPrintEnabled = !isAutoPrintEnabled;
            // Persist selection
            PrinterManager::SavePrinterSettings(selectedPrinterName, isAutoPrintEnabled);
            printerStatusMessage = isAutoPrintEnabled ? "AUTO-PRINT ENABLED AFTER PHOTOSHOOT" : "AUTO-PRINT DISABLED";
        }
        
        // ==========================================
        // RIGHT COLUMN: TEST PRINT & DIAGNOSTICS
        // ==========================================
        SafeDrawText(fontBold, "2. HARDWARE TEST & DIAGNOSTICS", { (float)colRightX, (float)colY }, 16.0f, 1.0f, COLOR_SWISS_RED);
        DrawLine(colRightX, colY + 22, colRightX + colW, colY + 22, COLOR_LIGHT_GRAY);
        
        int diagY = colY + 32;
        
        SafeDrawText(fontBold, "PRINTER CONNECTION PROTOCOL", { (float)colRightX, (float)diagY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "Connected via macOS CUPS backend. Fully compatible with USB,", { (float)colRightX, (float)(diagY + 18) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        SafeDrawText(fontRegular, "Wi-Fi, and Bluetooth paired thermal/classic print hardware.", { (float)colRightX, (float)(diagY + 30) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        
        diagY += 70;
        
        SafeDrawText(fontBold, "PRACTICAL HARDWARE DIAGNOSTICS", { (float)colRightX, (float)diagY }, 13.0f, 1.0f, COLOR_DEEP_INK);
        SafeDrawText(fontRegular, "Perform a hardware test by sending a trial receipt or photo strip", { (float)colRightX, (float)(diagY + 18) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        SafeDrawText(fontRegular, "to your connected printer to verify feed and layout alignment.", { (float)colRightX, (float)(diagY + 30) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
        
        diagY += 56;
        
        bool isPrinting = PrinterManager::isBusy;
        Rectangle testBtn = { (float)colRightX, (float)diagY, 260.0f, 40.0f };
        if (DrawButton(testBtn, isPrinting ? "🖨️ PRINTING..." : "🖨️ SEND HARDWARE TEST", !isPrinting, mousePos)) {
            if (selectedPrinterName.empty()) {
                printerStatusMessage = "ERROR: CHOOSE A PRINTER FIRST BEFORE TESTING!";
            } else {
                PrinterManager::PrintTestPageAsync(selectedPrinterName);
            }
        }
        
        // Sync printerStatusMessage with PrinterManager status if busy or finished
        if (isPrinting || PrinterManager::GetStatus().rfind("SUCCESS", 0) != std::string::npos || PrinterManager::GetStatus().rfind("ERROR", 0) != std::string::npos) {
            printerStatusMessage = PrinterManager::GetStatus();
        }
        
        // Print Job Status Output Banner
        diagY += 75;
        SafeDrawText(fontBold, "SYSTEM TELEMETRY LOG", { (float)colRightX, (float)diagY }, 12.0f, 1.0f, COLOR_DEEP_INK);
        
        // Draw status backing card
        DrawRectangle(colRightX, diagY + 18, colW, 80, COLOR_LIGHT_GRAY);
        DrawRectangleLinesEx({(float)colRightX, (float)(diagY + 18), (float)colW, 80.0f}, 1.0f, COLOR_DEEP_INK);
        
        if (!printerStatusMessage.empty()) {
            Color msgCol = COLOR_DEEP_INK;
            if (printerStatusMessage.rfind("ERROR:", 0) == 0) msgCol = COLOR_SWISS_RED;
            else if (printerStatusMessage.rfind("SUCCESS", 0) != std::string::npos || printerStatusMessage.rfind("COMPLETED", 0) != std::string::npos) msgCol = COLOR_EMERALD;
            
            SafeDrawText(fontBold, printerStatusMessage, { (float)colRightX + 16, (float)(diagY + 40) }, 11.0f, 1.0f, msgCol);
        } else {
            SafeDrawText(fontRegular, "Awaiting hardware actions... Ready for print diagnostic check.", { (float)colRightX + 16, (float)(diagY + 40) }, 11.0f, 1.0f, COLOR_SLATE_GRAY);
        }
    }
    
    // ==========================================
    // BOTTOM: CONFIRM & BACK BUTTON
    // ==========================================
    bool anyTextBoxActive = activeBoxTitle || activeBoxSubtitle || activeBoxSlogan ||
                            activeBoxFrameName || activeBoxFrameBG || activeBoxFrameText ||
                            activeBoxLayoutName;
    
    Rectangle saveBtn = { (float)(WINDOW_WIDTH/2 - 160), (float)(WINDOW_HEIGHT - 70), 320.0f, 45.0f };
    if (DrawButton(saveBtn, "CONFIRM & BACK TO HOME", true, mousePos) || (IsKeyPressed(KEY_ENTER) && !anyTextBoxActive)) {
        requestSave = true;
    }
}
