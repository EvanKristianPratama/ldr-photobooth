#include "ui/ui.h"
#include "ui/ui_persistence.h"
#include "vendor/filedialog.h"
#include <iostream>
#include <algorithm>
#include <cmath>
#include <dirent.h>

// ===================================================================
// CANVAS STUDIO — Full-Screen Layout Editor
// ===================================================================

// Smart Alignment Guide: snap threshold in canvas pixel coordinates
static const float SNAP_THRESHOLD = 8.0f;

// Layout constants
static const int TOOLBAR_W = 52;
static const int LAYERS_PANEL_W = 220;
static const int STATUS_BAR_H = 28;
static const int CANVAS_TOP_MARGIN = 10;

// ───────────────────────────────────────────────────────────────────
// SMART GUIDES: Collect edges and draw alignment lines
// ───────────────────────────────────────────────────────────────────
void UIManager::DrawSmartGuides(float canvasX, float canvasY, float scaleDiv, int dragIdx, bool isOverlay) {
    if (!showGuides) return;
    
    float maxW = (tempPaperSize == PaperSize::PAPER_2R) ? 600.0f : 1200.0f;
    float maxH = 1800.0f;
    float viewW = maxW / scaleDiv;
    float viewH = maxH / scaleDiv;
    
    // Get the dragging element's rect
    Rectangle dragRect;
    if (isOverlay && dragIdx >= 0 && dragIdx < (int)tempOverlays.size()) {
        dragRect = tempOverlays[dragIdx].rect;
    } else if (!isOverlay && dragIdx >= 0 && dragIdx < (int)tempSlotRects.size()) {
        dragRect = tempSlotRects[dragIdx];
    } else {
        return;
    }
    
    float dragLeft = dragRect.x;
    float dragRight = dragRect.x + dragRect.width;
    float dragTop = dragRect.y;
    float dragBottom = dragRect.y + dragRect.height;
    float dragCenterX = dragRect.x + dragRect.width / 2.0f;
    float dragCenterY = dragRect.y + dragRect.height / 2.0f;
    
    Color guideColor = { 0, 220, 255, 180 };
    
    // Collect all reference edges from other elements
    auto checkSnap = [&](float dragEdge, float refEdge, bool isVertical) {
        if (std::abs(dragEdge - refEdge) < SNAP_THRESHOLD) {
            // Draw guide line across full canvas
            float screenEdge = refEdge / scaleDiv;
            if (isVertical) {
                DrawLine(canvasX + screenEdge, canvasY, canvasX + screenEdge, canvasY + viewH, guideColor);
            } else {
                DrawLine(canvasX, canvasY + screenEdge, canvasX + viewW, canvasY + screenEdge, guideColor);
            }
        }
    };
    
    // Canvas center guides
    checkSnap(dragCenterX, maxW / 2.0f, true);
    checkSnap(dragCenterY, maxH / 2.0f, false);
    
    // Canvas edge guides
    checkSnap(dragLeft, 0.0f, true);
    checkSnap(dragRight, maxW, true);
    checkSnap(dragTop, 0.0f, false);
    checkSnap(dragBottom, maxH, false);
    
    // Photo slot edges
    for (int i = 0; i < (int)tempSlotRects.size(); ++i) {
        if (!isOverlay && i == dragIdx) continue;
        const auto& r = tempSlotRects[i];
        checkSnap(dragLeft, r.x, true);
        checkSnap(dragRight, r.x + r.width, true);
        checkSnap(dragLeft, r.x + r.width, true);
        checkSnap(dragRight, r.x, true);
        checkSnap(dragCenterX, r.x + r.width / 2.0f, true);
        checkSnap(dragTop, r.y, false);
        checkSnap(dragBottom, r.y + r.height, false);
        checkSnap(dragTop, r.y + r.height, false);
        checkSnap(dragBottom, r.y, false);
        checkSnap(dragCenterY, r.y + r.height / 2.0f, false);
    }
    
    // Overlay edges
    for (int i = 0; i < (int)tempOverlays.size(); ++i) {
        if (isOverlay && i == dragIdx) continue;
        const auto& r = tempOverlays[i].rect;
        checkSnap(dragLeft, r.x, true);
        checkSnap(dragRight, r.x + r.width, true);
        checkSnap(dragCenterX, r.x + r.width / 2.0f, true);
        checkSnap(dragTop, r.y, false);
        checkSnap(dragBottom, r.y + r.height, false);
        checkSnap(dragCenterY, r.y + r.height / 2.0f, false);
    }
}

// ───────────────────────────────────────────────────────────────────
// LEFT TOOLBAR
// ───────────────────────────────────────────────────────────────────
void UIManager::DrawCanvasToolbar(Vector2 mousePos, std::vector<LayoutOption>& layouts, bool& requestExit) {
    // Draw toolbar background
    DrawRectangle(0, 0, TOOLBAR_W, WINDOW_HEIGHT, Color{30, 30, 34, 255});
    DrawLine(TOOLBAR_W, 0, TOOLBAR_W, WINDOW_HEIGHT, Color{60, 60, 65, 255});
    
    int btnSize = 36;
    int btnX = (TOOLBAR_W - btnSize) / 2;
    int btnY = 12;
    int btnSpacing = 44;
    
    auto drawToolBtn = [&](int idx, const std::string& label, bool isActive) -> bool {
        int y = btnY + idx * btnSpacing;
        Rectangle btn = { (float)btnX, (float)y, (float)btnSize, (float)btnSize };
        Color bg = isActive ? COLOR_SWISS_RED : Color{55, 55, 60, 255};
        Color fg = isActive ? COLOR_PURE_SNOW : Color{180, 180, 185, 255};
        
        if (CheckCollisionPointRec(mousePos, btn)) {
            bg = isActive ? COLOR_SWISS_RED : Color{75, 75, 80, 255};
        }
        
        DrawRectangleRounded(btn, 0.2f, 4, bg);
        Vector2 sz = MeasureTextEx(fontBold, label.c_str(), 11.0f, 1.0f);
        SafeDrawText(fontBold, label, { btn.x + (btnSize - sz.x)/2, btn.y + (btnSize - sz.y)/2 }, 11.0f, 1.0f, fg);
        
        return (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mousePos, btn));
    };
    
    // Tool buttons
    if (drawToolBtn(0, "SEL", activeTool == CanvasTool::SELECT)) {
        activeTool = CanvasTool::SELECT;
    }
    if (drawToolBtn(1, "TXT", activeTool == CanvasTool::TEXT)) {
        activeTool = CanvasTool::TEXT;
    }
    if (drawToolBtn(2, "IMG", activeTool == CanvasTool::IMAGE)) {
        // Open native file dialog
        std::string path = OpenImageFileDialog();
        if (!path.empty()) {
            OverlayElement ov;
            ov.type = OverlayType::IMAGE;
            ov.rect = { 100, 100, 300, 300 };
            ov.content = path;
            tempOverlays.push_back(ov);
            
            // Load texture for preview
            Texture2D tex = LoadTexture(path.c_str());
            if (tex.id != 0) {
                overlayTextureCache[path] = tex;
                // Adjust rect to image aspect ratio
                float aspect = (float)tex.width / tex.height;
                tempOverlays.back().rect.height = 300.0f / aspect;
            }
            
            selectedOverlayIdx = (int)tempOverlays.size() - 1;
            selectedSlotIdx = -1;
            std::cout << "[Canvas] Imported image: " << path << std::endl;
        }
        activeTool = CanvasTool::SELECT;
    }
    
    // Separator line
    DrawLine(btnX, btnY + 3 * btnSpacing - 4, btnX + btnSize, btnY + 3 * btnSpacing - 4, Color{60, 60, 65, 255});
    
    if (drawToolBtn(3, "GDE", showGuides)) {
        showGuides = !showGuides;
    }
    
    // Paper size toggle
    std::string paperLabel = (tempPaperSize == PaperSize::PAPER_2R) ? "2R" : "4R";
    if (drawToolBtn(4, paperLabel, false)) {
        tempPaperSize = (tempPaperSize == PaperSize::PAPER_2R) ? PaperSize::PAPER_4R : PaperSize::PAPER_2R;
        InitializeAdobeCanvasSlots();
    }
    
    // Background cycle
    if (drawToolBtn(5, "BG", false)) {
        int totalBg = 1 + (int)availableBackgrounds.size();
        selectedBgIdx = (selectedBgIdx + 1) % totalBg;
        tempBackgroundPath = (selectedBgIdx == 0) ? "" : availableBackgrounds[selectedBgIdx - 1];
    }
    
    // Separator line
    DrawLine(btnX, btnY + 6 * btnSpacing - 4, btnX + btnSize, btnY + 6 * btnSpacing - 4, Color{60, 60, 65, 255});
    
    // Save button
    if (drawToolBtn(6, "SAV", false)) {
        if (!newLayoutName.empty() && newLayoutPhotoCount >= 1 && tempSlotRects.size() > 0) {
            LayoutOption opt;
            opt.name = newLayoutName;
            opt.photoCount = newLayoutPhotoCount;
            opt.cols = 1;
            opt.rows = 1;
            opt.isVerticalStrip = false;
            opt.isCustom = true;
            opt.slotRects = tempSlotRects;
            opt.paperSize = tempPaperSize;
            opt.backgroundPath = tempBackgroundPath;
            opt.zOrder = tempZOrder;
            opt.slotVisible = tempSlotVisible;
            opt.slotLocked = tempSlotLocked;
            opt.slotRotation = tempSlotRotation;
            opt.overlays = tempOverlays;
            
            if (editingLayoutIdx >= 0 && editingLayoutIdx < (int)layouts.size()) {
                layouts[editingLayoutIdx] = opt; // Overwrite existing
            } else {
                layouts.push_back(opt);
            }
            SaveLayoutsToDisk(layouts);
            
            std::cout << "[Canvas] Layout saved: " << newLayoutName << std::endl;
            requestExit = true;
        }
    }
    
    // Exit button
    if (drawToolBtn(7, "ESC", false) || IsKeyPressed(KEY_ESCAPE)) {
        requestExit = true;
    }
}

// ───────────────────────────────────────────────────────────────────
// CENTER CANVAS VIEWPORT
// ───────────────────────────────────────────────────────────────────
void UIManager::DrawCanvasViewport(Vector2 mousePos) {
    float maxCanvasW = (tempPaperSize == PaperSize::PAPER_2R) ? 600.0f : 1200.0f;
    float maxCanvasH = 1800.0f;
    
    // Available viewport area
    float vpX = (float)TOOLBAR_W;
    float vpY = 0;
    float vpW = (float)(WINDOW_WIDTH - TOOLBAR_W - LAYERS_PANEL_W);
    float vpH = (float)(WINDOW_HEIGHT - STATUS_BAR_H);
    
    // Calculate scale to fit canvas in viewport with padding
    float padX = 30.0f, padY = 20.0f;
    float scaleX = (vpW - padX * 2) / maxCanvasW;
    float scaleY = (vpH - padY * 2) / maxCanvasH;
    float scaleDiv = 1.0f / std::min(scaleX, scaleY);
    
    float canvasW = maxCanvasW / scaleDiv;
    float canvasH = maxCanvasH / scaleDiv;
    float canvasX = vpX + (vpW - canvasW) / 2.0f;
    float canvasY = vpY + (vpH - canvasH) / 2.0f;
    
    // Draw viewport background (dark artboard)
    DrawRectangle(vpX, vpY, vpW, vpH, Color{42, 42, 46, 255});
    
    // Draw canvas paper
    DrawRectangle(canvasX, canvasY, canvasW, canvasH, COLOR_LIGHT_GRAY);
    DrawRectangleLinesEx({canvasX - 1, canvasY - 1, canvasW + 2, canvasH + 2}, 1.0f, Color{80, 80, 85, 255});
    
    // Canvas center crosshair (subtle)
    if (showGuides) {
        Color crossColor = {100, 100, 110, 60};
        DrawLine(canvasX + canvasW/2, canvasY, canvasX + canvasW/2, canvasY + canvasH, crossColor);
        DrawLine(canvasX, canvasY + canvasH/2, canvasX + canvasW, canvasY + canvasH/2, crossColor);
    }
    
    // ─── MOUSE INTERACTION ───
    Vector2 mPos = mousePos;
    
    // TEXT TOOL: Click canvas to place a text overlay
    if (activeTool == CanvasTool::TEXT && IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        if (CheckCollisionPointRec(mPos, {canvasX, canvasY, canvasW, canvasH})) {
            OverlayElement ov;
            ov.type = OverlayType::TEXT;
            float placeX = (mPos.x - canvasX) * scaleDiv;
            float placeY = (mPos.y - canvasY) * scaleDiv;
            ov.rect = { placeX, placeY, 300.0f, 60.0f };
            ov.content = "TEXT";
            ov.fontSize = 40.0f;
            ov.color = COLOR_DEEP_INK;
            tempOverlays.push_back(ov);
            selectedOverlayIdx = (int)tempOverlays.size() - 1;
            selectedSlotIdx = -1;
            isEditingText = true;
            editingTextContent = "TEXT";
            activeTool = CanvasTool::SELECT;
        }
    }
    
    // SELECT TOOL: Handle mouse button press for selection
    if (activeTool == CanvasTool::SELECT && IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        bool hit = false;
        
        // Check resize handle of selected slot
        if (selectedSlotIdx >= 0 && selectedSlotIdx < (int)tempSlotRects.size() && selectedSlotIdx < (int)tempSlotLocked.size() && !tempSlotLocked[selectedSlotIdx]) {
            Rectangle r = tempSlotRects[selectedSlotIdx];
            Rectangle handle = { canvasX + (r.x + r.width)/scaleDiv - 6, canvasY + (r.y + r.height)/scaleDiv - 6, 12, 12 };
            if (CheckCollisionPointRec(mPos, handle)) {
                isResizing = true;
                hit = true;
            }
        }
        
        // Check resize handle of selected overlay
        if (!hit && selectedOverlayIdx != -1 && selectedOverlayIdx < (int)tempOverlays.size() && !tempOverlays[selectedOverlayIdx].locked) {
            Rectangle r = tempOverlays[selectedOverlayIdx].rect;
            Rectangle handle = { canvasX + (r.x + r.width)/scaleDiv - 6, canvasY + (r.y + r.height)/scaleDiv - 6, 12, 12 };
            if (CheckCollisionPointRec(mPos, handle)) {
                isResizingOverlay = true;
                hit = true;
            }
        }
        
        if (!hit) {
            selectedSlotIdx = -1;
            selectedOverlayIdx = -1;
            isEditingText = false;
            
            // Check overlays first (they're on top)
            for (int i = (int)tempOverlays.size() - 1; i >= 0; --i) {
                if (i >= (int)tempOverlays.size()) continue;
                if (!tempOverlays[i].visible) continue;
                Rectangle r = tempOverlays[i].rect;
                Rectangle vis = { canvasX + r.x/scaleDiv, canvasY + r.y/scaleDiv, r.width/scaleDiv, r.height/scaleDiv };
                if (CheckCollisionPointRec(mPos, vis)) {
                    selectedOverlayIdx = i;
                    overlayDragOffset = { mPos.x - vis.x, mPos.y - vis.y };
                    isDraggingOverlay = !tempOverlays[i].locked;
                    
                    if (tempOverlays[i].type == OverlayType::TEXT) {
                        isEditingText = true;
                        editingTextContent = tempOverlays[i].content;
                    }
                    hit = true;
                    break;
                }
            }
            
            // Check photo slots in z-order
            if (!hit) {
                for (int zi = (int)tempZOrder.size() - 1; zi >= 0; --zi) {
                    if (zi < 0 || zi >= (int)tempZOrder.size()) continue;
                    int i = tempZOrder[zi];
                    if (i < 0 || i >= (int)tempSlotRects.size() || i >= (int)tempSlotVisible.size()) continue;
                    if (!tempSlotVisible[i]) continue;
                    Rectangle r = tempSlotRects[i];
                    Rectangle vis = { canvasX + r.x/scaleDiv, canvasY + r.y/scaleDiv, r.width/scaleDiv, r.height/scaleDiv };
                    if (CheckCollisionPointRec(mPos, vis)) {
                        selectedSlotIdx = i;
                        dragOffset = { mPos.x - vis.x, mPos.y - vis.y };
                        isResizing = false;
                        break;
                    }
                }
            }
        }
    }
    
    // Drag photo slots
    if (IsMouseButtonDown(MOUSE_BUTTON_LEFT) && selectedSlotIdx >= 0 && selectedSlotIdx < (int)tempSlotRects.size() && selectedSlotIdx < (int)tempSlotLocked.size() && !isResizing && !tempSlotLocked[selectedSlotIdx]) {
        float nX = (mPos.x - dragOffset.x - canvasX) * scaleDiv;
        float nY = (mPos.y - dragOffset.y - canvasY) * scaleDiv;
        float sw = tempSlotRects[selectedSlotIdx].width;
        float sh = tempSlotRects[selectedSlotIdx].height;
        nX = std::max(0.0f, std::min(maxCanvasW - sw, nX));
        nY = std::max(0.0f, std::min(maxCanvasH - sh, nY));
        tempSlotRects[selectedSlotIdx].x = nX;
        tempSlotRects[selectedSlotIdx].y = nY;
    }
    
    // Resize photo slots
    if (IsMouseButtonDown(MOUSE_BUTTON_LEFT) && isResizing && selectedSlotIdx >= 0 && selectedSlotIdx < (int)tempSlotRects.size() && selectedSlotIdx < (int)tempSlotLocked.size() && !tempSlotLocked[selectedSlotIdx]) {
        float tW = (mPos.x - canvasX) * scaleDiv - tempSlotRects[selectedSlotIdx].x;
        float tH = (mPos.y - canvasY) * scaleDiv - tempSlotRects[selectedSlotIdx].y;
        tW = std::max(60.0f, std::min(maxCanvasW - tempSlotRects[selectedSlotIdx].x, tW));
        tH = std::max(60.0f, std::min(maxCanvasH - tempSlotRects[selectedSlotIdx].y, tH));
        tempSlotRects[selectedSlotIdx].width = tW;
        tempSlotRects[selectedSlotIdx].height = tH;
    }
    
    // Drag overlays
    if (IsMouseButtonDown(MOUSE_BUTTON_LEFT) && isDraggingOverlay && selectedOverlayIdx != -1) {
        auto& ov = tempOverlays[selectedOverlayIdx];
        if (!ov.locked) {
            float nX = (mPos.x - overlayDragOffset.x - canvasX) * scaleDiv;
            float nY = (mPos.y - overlayDragOffset.y - canvasY) * scaleDiv;
            nX = std::max(0.0f, std::min(maxCanvasW - ov.rect.width, nX));
            nY = std::max(0.0f, std::min(maxCanvasH - ov.rect.height, nY));
            ov.rect.x = nX;
            ov.rect.y = nY;
        }
    }
    
    // Resize overlays
    if (IsMouseButtonDown(MOUSE_BUTTON_LEFT) && isResizingOverlay && selectedOverlayIdx != -1) {
        auto& ov = tempOverlays[selectedOverlayIdx];
        if (!ov.locked) {
            float tW = (mPos.x - canvasX) * scaleDiv - ov.rect.x;
            float tH = (mPos.y - canvasY) * scaleDiv - ov.rect.y;
            tW = std::max(40.0f, std::min(maxCanvasW - ov.rect.x, tW));
            tH = std::max(30.0f, std::min(maxCanvasH - ov.rect.y, tH));
            ov.rect.width = tW;
            ov.rect.height = tH;
        }
    }
    
    if (IsMouseButtonReleased(MOUSE_BUTTON_LEFT)) {
        isResizing = false;
        isDraggingOverlay = false;
        isResizingOverlay = false;
    }
    
    // Handle text input for selected text overlay
    if (isEditingText && selectedOverlayIdx >= 0 && selectedOverlayIdx < (int)tempOverlays.size()) {
        auto& ov = tempOverlays[selectedOverlayIdx];
        if (ov.type == OverlayType::TEXT) {
            int key = GetCharPressed();
            while (key > 0) {
                if (key >= 32 && key <= 125) {
                    ov.content += (char)key;
                }
                key = GetCharPressed();
            }
            if (IsKeyPressed(KEY_BACKSPACE) && !ov.content.empty()) {
                ov.content.pop_back();
            }
        }
    }
    
    // Delete selected overlay with DELETE key
    if (IsKeyPressed(KEY_DELETE) || IsKeyPressed(KEY_X)) {
        if (selectedOverlayIdx >= 0 && selectedOverlayIdx < (int)tempOverlays.size()) {
            tempOverlays.erase(tempOverlays.begin() + selectedOverlayIdx);
            selectedOverlayIdx = -1;
            isEditingText = false;
        }
    }
    
    // ─── DRAW ELEMENTS ───
    
    // Draw photo slots in z-order
    for (int zi = 0; zi < (int)tempZOrder.size(); ++zi) {
        if (zi < 0 || zi >= (int)tempZOrder.size()) continue;
        int i = tempZOrder[zi];
        if (i < 0 || i >= (int)tempSlotRects.size()) continue;
        if (i >= (int)tempSlotVisible.size() || i >= (int)tempSlotLocked.size()) continue;
        if (!tempSlotVisible[i]) continue;
        
        Rectangle r = tempSlotRects[i];
        Rectangle vis = { canvasX + r.x/scaleDiv, canvasY + r.y/scaleDiv, r.width/scaleDiv, r.height/scaleDiv };
        
        Color fill = tempSlotLocked[i] ? Color{200, 200, 205, 255} : COLOR_PURE_SNOW;
        DrawRectangleRec(vis, fill);
        
        Color border = (i == selectedSlotIdx) ? COLOR_SWISS_RED : Color{100, 100, 105, 255};
        float thick = (i == selectedSlotIdx) ? 2.0f : 1.0f;
        DrawRectangleLinesEx(vis, thick, border);
        
        // Slot label (display rotation if rotated)
        float rot = (i < (int)tempSlotRotation.size()) ? tempSlotRotation[i] : 0.0f;
        std::string lbl = "P" + std::to_string(i + 1);
        if (rot != 0.0f) {
            lbl += " (" + std::to_string((int)rot) + "°)";
        }
        Vector2 sz = MeasureTextEx(fontBold, lbl.c_str(), 12.0f, 1.0f);
        SafeDrawText(fontBold, lbl, { vis.x + (vis.width - sz.x)/2, vis.y + (vis.height - sz.y)/2 }, 12.0f, 1.0f, border);
        
        // Resize handle
        if (i == selectedSlotIdx && !tempSlotLocked[i]) {
            Rectangle handle = { vis.x + vis.width - 5, vis.y + vis.height - 5, 8, 8 };
            DrawRectangleRec(handle, COLOR_SWISS_RED);
        }
    }
    
    // Draw overlay elements
    for (int i = 0; i < (int)tempOverlays.size(); ++i) {
        auto& ov = tempOverlays[i];
        if (!ov.visible) continue;
        
        Rectangle vis = { canvasX + ov.rect.x/scaleDiv, canvasY + ov.rect.y/scaleDiv, ov.rect.width/scaleDiv, ov.rect.height/scaleDiv };
        
        if (ov.type == OverlayType::TEXT) {
            // Text overlay
            Color textCol = ov.color;
            float scaledFontSize = ov.fontSize / scaleDiv;
            if (scaledFontSize < 6.0f) scaledFontSize = 6.0f;
            SafeDrawText(fontBold, ov.content, { vis.x + 4, vis.y + 4 }, scaledFontSize, 1.0f, textCol);
            
            // Selection border
            if (i == selectedOverlayIdx) {
                DrawRectangleLinesEx(vis, 1.5f, COLOR_BAUHAUS_YEL);
                // Resize handle
                Rectangle handle = { vis.x + vis.width - 5, vis.y + vis.height - 5, 8, 8 };
                DrawRectangleRec(handle, COLOR_BAUHAUS_YEL);
            }
        } else if (ov.type == OverlayType::IMAGE) {
            // Image overlay
            auto it = overlayTextureCache.find(ov.content);
            if (it != overlayTextureCache.end() && it->second.id != 0) {
                DrawTexturePro(
                    it->second,
                    {0, 0, (float)it->second.width, (float)it->second.height},
                    vis, {0, 0}, 0.0f, WHITE
                );
            } else {
                DrawRectangleRec(vis, Color{180, 180, 190, 255});
                SafeDrawText(fontRegular, "IMG", { vis.x + 4, vis.y + 4 }, 10.0f, 1.0f, COLOR_DEEP_INK);
            }
            
            if (i == selectedOverlayIdx) {
                DrawRectangleLinesEx(vis, 1.5f, COLOR_EMERALD);
                Rectangle handle = { vis.x + vis.width - 5, vis.y + vis.height - 5, 8, 8 };
                DrawRectangleRec(handle, COLOR_EMERALD);
            }
        }
    }
    
    // Draw smart guides for dragging elements
    if (IsMouseButtonDown(MOUSE_BUTTON_LEFT)) {
        if (selectedSlotIdx != -1 && !isResizing) {
            DrawSmartGuides(canvasX, canvasY, scaleDiv, selectedSlotIdx, false);
        }
        if (isDraggingOverlay && selectedOverlayIdx != -1) {
            DrawSmartGuides(canvasX, canvasY, scaleDiv, selectedOverlayIdx, true);
        }
    }
    
    // ─── STATUS BAR ───
    int sbY = WINDOW_HEIGHT - STATUS_BAR_H;
    DrawRectangle(TOOLBAR_W, sbY, WINDOW_WIDTH - TOOLBAR_W, STATUS_BAR_H, Color{30, 30, 34, 255});
    DrawLine(TOOLBAR_W, sbY, WINDOW_WIDTH, sbY, Color{60, 60, 65, 255});
    
    std::string paperStr = (tempPaperSize == PaperSize::PAPER_2R) ? "2R (600x1800)" : "4R (1200x1800)";
    SafeDrawText(fontRegular, paperStr, { (float)(TOOLBAR_W + 12), (float)(sbY + 7) }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
    
    std::string toolStr = "TOOL: ";
    if (activeTool == CanvasTool::SELECT) toolStr += "SELECT";
    else if (activeTool == CanvasTool::TEXT) toolStr += "TEXT (click canvas)";
    else toolStr += "IMAGE";
    SafeDrawText(fontRegular, toolStr, { (float)(TOOLBAR_W + 180), (float)(sbY + 7) }, 10.0f, 1.0f, COLOR_PURE_SNOW);
    
    std::string guidesStr = showGuides ? "GUIDES: ON" : "GUIDES: OFF";
    SafeDrawText(fontRegular, guidesStr, { (float)(TOOLBAR_W + 380), (float)(sbY + 7) }, 10.0f, 1.0f, showGuides ? COLOR_BAUHAUS_YEL : COLOR_SLATE_GRAY);
    
    // Layout name
    if (!newLayoutName.empty()) {
        SafeDrawText(fontBold, newLayoutName, { (float)(WINDOW_WIDTH - LAYERS_PANEL_W - 200), (float)(sbY + 7) }, 10.0f, 1.0f, COLOR_SWISS_RED);
    }
}

// ───────────────────────────────────────────────────────────────────
// RIGHT LAYERS PANEL
// ───────────────────────────────────────────────────────────────────
void UIManager::DrawCanvasLayersPanel(Vector2 mousePos) {
    int panelX = WINDOW_WIDTH - LAYERS_PANEL_W;
    int panelW = LAYERS_PANEL_W;
    
    // Panel background
    DrawRectangle(panelX, 0, panelW, WINDOW_HEIGHT, Color{35, 35, 38, 255});
    DrawLine(panelX, 0, panelX, WINDOW_HEIGHT, Color{60, 60, 65, 255});
    
    int contentX = panelX + 8;
    int contentW = panelW - 16;
    
    // ─── COORDINATES SECTION ───
    int secY = 10;
    SafeDrawText(fontBold, "PROPERTIES", { (float)contentX, (float)secY }, 11.0f, 1.0f, COLOR_PURE_SNOW);
    DrawLine(contentX, secY + 14, contentX + contentW, secY + 14, Color{60, 60, 65, 255});
    
    float maxCanvasW = (tempPaperSize == PaperSize::PAPER_2R) ? 600.0f : 1200.0f;
    float maxCanvasH = 1800.0f;
    
    if (selectedSlotIdx >= 0 && selectedSlotIdx < (int)tempSlotRects.size() && selectedSlotIdx < (int)tempSlotLocked.size()) {
        SafeDrawText(fontBold, ("SLOT " + std::to_string(selectedSlotIdx + 1)).c_str(), { (float)contentX, (float)(secY + 20) }, 10.0f, 1.0f, COLOR_SWISS_RED);
        
        auto drawProp = [&](const std::string& label, float& val, int yOff, float minV, float maxV) {
            SafeDrawText(fontRegular, label, { (float)contentX, (float)(secY + yOff) }, 9.0f, 1.0f, COLOR_SLATE_GRAY);
            
            Rectangle mBtn = { (float)contentX + 28, (float)(secY + yOff - 3), 20.0f, 16.0f };
            Rectangle pBtn = { (float)contentX + 100, (float)(secY + yOff - 3), 20.0f, 16.0f };
            
            if (selectedSlotIdx >= 0 && selectedSlotIdx < (int)tempSlotLocked.size() && !tempSlotLocked[selectedSlotIdx]) {
                if (DrawButton(mBtn, "-", false, mousePos) && val > minV) val -= 10.0f;
                if (DrawButton(pBtn, "+", false, mousePos) && val < maxV) val += 10.0f;
            }
            SafeDrawText(fontBold, (std::to_string((int)val) + "px"), { (float)contentX + 54, (float)(secY + yOff) }, 9.0f, 1.0f, COLOR_PURE_SNOW);
        };
        
        Rectangle& sr = tempSlotRects[selectedSlotIdx];
        drawProp("X:", sr.x, 36, 0, maxCanvasW - sr.width);
        drawProp("Y:", sr.y, 54, 0, maxCanvasH - sr.height);
        drawProp("W:", sr.width, 72, 60, maxCanvasW - sr.x);
        drawProp("H:", sr.height, 90, 60, maxCanvasH - sr.y);
        
        // Rotation property for the slot photo
        if (selectedSlotIdx < (int)tempSlotRotation.size()) {
            SafeDrawText(fontRegular, "ROT:", { (float)contentX, (float)(secY + 108) }, 9.0f, 1.0f, COLOR_SLATE_GRAY);
            Rectangle rotBtn = { (float)contentX + 28, (float)(secY + 105), 92.0f, 16.0f };
            std::string rotStr = std::to_string((int)tempSlotRotation[selectedSlotIdx]) + "°";
            if (!tempSlotLocked[selectedSlotIdx]) {
                if (DrawButton(rotBtn, rotStr, false, mousePos)) {
                    tempSlotRotation[selectedSlotIdx] = fmodf(tempSlotRotation[selectedSlotIdx] + 90.0f, 360.0f);
                }
            } else {
                DrawRectangleRec(rotBtn, Color{55, 55, 60, 255});
                Vector2 sz = MeasureTextEx(fontRegular, rotStr.c_str(), 10.0f, 1.0f);
                SafeDrawText(fontRegular, rotStr, { rotBtn.x + (92.0f - sz.x)/2, rotBtn.y + (16.0f - sz.y)/2 }, 10.0f, 1.0f, COLOR_SLATE_GRAY);
            }
        }
    } else if (selectedOverlayIdx >= 0 && selectedOverlayIdx < (int)tempOverlays.size()) {
        auto& ov = tempOverlays[selectedOverlayIdx];
        std::string typeStr = (ov.type == OverlayType::TEXT) ? "TEXT" : "IMAGE";
        SafeDrawText(fontBold, typeStr, { (float)contentX, (float)(secY + 20) }, 10.0f, 1.0f, COLOR_BAUHAUS_YEL);
        
        auto drawProp = [&](const std::string& label, float& val, int yOff, float minV, float maxV) {
            SafeDrawText(fontRegular, label, { (float)contentX, (float)(secY + yOff) }, 9.0f, 1.0f, COLOR_SLATE_GRAY);
            Rectangle mBtn = { (float)contentX + 28, (float)(secY + yOff - 3), 20.0f, 16.0f };
            Rectangle pBtn = { (float)contentX + 100, (float)(secY + yOff - 3), 20.0f, 16.0f };
            if (!ov.locked) {
                if (DrawButton(mBtn, "-", false, mousePos) && val > minV) val -= 10.0f;
                if (DrawButton(pBtn, "+", false, mousePos) && val < maxV) val += 10.0f;
            }
            SafeDrawText(fontBold, (std::to_string((int)val) + "px"), { (float)contentX + 54, (float)(secY + yOff) }, 9.0f, 1.0f, COLOR_PURE_SNOW);
        };
        
        drawProp("X:", ov.rect.x, 36, 0, maxCanvasW - ov.rect.width);
        drawProp("Y:", ov.rect.y, 54, 0, maxCanvasH - ov.rect.height);
        drawProp("W:", ov.rect.width, 72, 40, maxCanvasW - ov.rect.x);
        drawProp("H:", ov.rect.height, 90, 30, maxCanvasH - ov.rect.y);
        
        // Font size for text overlays
        if (ov.type == OverlayType::TEXT) {
            SafeDrawText(fontRegular, "SZ:", { (float)contentX, (float)(secY + 108) }, 9.0f, 1.0f, COLOR_SLATE_GRAY);
            Rectangle mBtn = { (float)contentX + 28, (float)(secY + 105), 20.0f, 16.0f };
            Rectangle pBtn = { (float)contentX + 100, (float)(secY + 105), 20.0f, 16.0f };
            if (DrawButton(mBtn, "-", false, mousePos) && ov.fontSize > 10) ov.fontSize -= 2;
            if (DrawButton(pBtn, "+", false, mousePos) && ov.fontSize < 200) ov.fontSize += 2;
            SafeDrawText(fontBold, (std::to_string((int)ov.fontSize) + "pt"), { (float)contentX + 54, (float)(secY + 108) }, 9.0f, 1.0f, COLOR_PURE_SNOW);
        }
    } else {
        SafeDrawText(fontRegular, "No selection", { (float)contentX, (float)(secY + 24) }, 9.0f, 1.0f, COLOR_SLATE_GRAY);
    }
    
    // ─── LAYERS SECTION ───
    int layerSecY = secY + 130;
    SafeDrawText(fontBold, "LAYERS", { (float)contentX, (float)layerSecY }, 11.0f, 1.0f, COLOR_PURE_SNOW);
    DrawLine(contentX, layerSecY + 14, contentX + contentW, layerSecY + 14, Color{60, 60, 65, 255});
    
    int rowH = 22;
    int rowY = layerSecY + 18;
    
    // Overlay layers (top to bottom = last to first)
    for (int i = (int)tempOverlays.size() - 1; i >= 0; --i) {
        auto& ov = tempOverlays[i];
        int y = rowY;
        
        Color rowBg = (i == selectedOverlayIdx) ? Color{60, 45, 15, 255} : Color{40, 40, 44, 255};
        DrawRectangle(contentX, y, contentW, rowH, rowBg);
        DrawRectangleLinesEx({(float)contentX, (float)y, (float)contentW, (float)rowH}, 1.0f, Color{55, 55, 60, 255});
        
        // Visibility toggle
        Rectangle visBtn = { (float)contentX + 2, (float)(y + 2), 16.0f, 18.0f };
        DrawRectangleRec(visBtn, ov.visible ? COLOR_BAUHAUS_YEL : Color{70, 70, 75, 255});
        SafeDrawText(fontBold, "V", { visBtn.x + 4, visBtn.y + 3 }, 8.0f, 1.0f, COLOR_DEEP_INK);
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mousePos, visBtn)) ov.visible = !ov.visible;
        
        // Lock toggle
        Rectangle lockBtn = { (float)contentX + 20, (float)(y + 2), 16.0f, 18.0f };
        DrawRectangleRec(lockBtn, ov.locked ? COLOR_SWISS_RED : Color{70, 70, 75, 255});
        SafeDrawText(fontBold, "L", { lockBtn.x + 4, lockBtn.y + 3 }, 8.0f, 1.0f, ov.locked ? COLOR_PURE_SNOW : COLOR_DEEP_INK);
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mousePos, lockBtn)) ov.locked = !ov.locked;
        
        // Label
        std::string label = (ov.type == OverlayType::TEXT) ? ("T: " + ov.content.substr(0, 12)) : "IMG";
        Color nameCol = (i == selectedOverlayIdx) ? COLOR_BAUHAUS_YEL : COLOR_PURE_SNOW;
        SafeDrawText(fontRegular, label, { (float)contentX + 40, (float)(y + 5) }, 8.0f, 1.0f, nameCol);
        
        // Click to select
        Rectangle rowRect = { (float)(contentX + 38), (float)y, (float)(contentW - 38), (float)rowH };
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mousePos, rowRect)) {
            selectedOverlayIdx = i;
            selectedSlotIdx = -1;
            if (ov.type == OverlayType::TEXT) {
                isEditingText = true;
                editingTextContent = ov.content;
            }
        }
        
        rowY += rowH + 2;
    }
    
    // Photo slot layers (z-order top to bottom)
    for (int zi = (int)tempZOrder.size() - 1; zi >= 0; --zi) {
        if (zi < 0 || zi >= (int)tempZOrder.size()) continue;
        int idx = tempZOrder[zi];
        if (idx < 0 || idx >= newLayoutPhotoCount) continue;
        if (idx >= (int)tempSlotVisible.size() || idx >= (int)tempSlotLocked.size()) continue;
        
        int y = rowY;
        Color rowBg = (idx == selectedSlotIdx) ? Color{60, 15, 15, 255} : Color{40, 40, 44, 255};
        DrawRectangle(contentX, y, contentW, rowH, rowBg);
        DrawRectangleLinesEx({(float)contentX, (float)y, (float)contentW, (float)rowH}, 1.0f, Color{55, 55, 60, 255});
        
        // Visibility
        Rectangle visBtn = { (float)contentX + 2, (float)(y + 2), 16.0f, 18.0f };
        DrawRectangleRec(visBtn, tempSlotVisible[idx] ? COLOR_BAUHAUS_YEL : Color{70, 70, 75, 255});
        SafeDrawText(fontBold, "V", { visBtn.x + 4, visBtn.y + 3 }, 8.0f, 1.0f, COLOR_DEEP_INK);
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mousePos, visBtn)) tempSlotVisible[idx] = !tempSlotVisible[idx];
        
        // Lock
        Rectangle lockBtn = { (float)contentX + 20, (float)(y + 2), 16.0f, 18.0f };
        DrawRectangleRec(lockBtn, tempSlotLocked[idx] ? COLOR_SWISS_RED : Color{70, 70, 75, 255});
        SafeDrawText(fontBold, "L", { lockBtn.x + 4, lockBtn.y + 3 }, 8.0f, 1.0f, tempSlotLocked[idx] ? COLOR_PURE_SNOW : COLOR_DEEP_INK);
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mousePos, lockBtn)) tempSlotLocked[idx] = !tempSlotLocked[idx];
        
        // Label
        Color nameCol = (idx == selectedSlotIdx) ? COLOR_SWISS_RED : COLOR_PURE_SNOW;
        SafeDrawText(fontBold, ("Slot " + std::to_string(idx + 1)), { (float)contentX + 40, (float)(y + 5) }, 8.0f, 1.0f, nameCol);
        
        // Click to select
        Rectangle rowRect = { (float)(contentX + 38), (float)y, (float)(contentW - 70), (float)rowH };
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mousePos, rowRect)) {
            selectedSlotIdx = idx;
            selectedOverlayIdx = -1;
            isEditingText = false;
        }
        
        // Z-order buttons
        Rectangle upBtn = { (float)(contentX + contentW - 30), (float)(y + 2), 13.0f, 18.0f };
        Rectangle dnBtn = { (float)(contentX + contentW - 15), (float)(y + 2), 13.0f, 18.0f };
        DrawRectangleRec(upBtn, Color{55, 55, 60, 255});
        DrawRectangleRec(dnBtn, Color{55, 55, 60, 255});
        SafeDrawText(fontBold, "^", { upBtn.x + 3, upBtn.y + 3 }, 8.0f, 1.0f, COLOR_PURE_SNOW);
        SafeDrawText(fontBold, "v", { dnBtn.x + 3, dnBtn.y + 3 }, 8.0f, 1.0f, COLOR_PURE_SNOW);
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mousePos, upBtn) && zi < (int)tempZOrder.size() - 1) {
            std::swap(tempZOrder[zi], tempZOrder[zi + 1]);
        }
        if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT) && CheckCollisionPointRec(mousePos, dnBtn) && zi > 0) {
            std::swap(tempZOrder[zi], tempZOrder[zi - 1]);
        }
        
        rowY += rowH + 2;
    }
    
    // Background row
    int bgY = rowY;
    DrawRectangle(contentX, bgY, contentW, rowH, Color{30, 30, 34, 255});
    DrawRectangleLinesEx({(float)contentX, (float)bgY, (float)contentW, (float)rowH}, 1.0f, Color{55, 55, 60, 255});
    SafeDrawText(fontRegular, "BG", { (float)contentX + 4, (float)(bgY + 5) }, 8.0f, 1.0f, COLOR_BAUHAUS_YEL);
    
    std::string bgLabel = tempBackgroundPath.empty() ? "Solid Color" : tempBackgroundPath.substr(tempBackgroundPath.find_last_of('/') + 1);
    if (bgLabel.length() > 16) {
        bgLabel = bgLabel.substr(0, 13) + "...";
    }
    SafeDrawText(fontRegular, bgLabel, { (float)contentX + 24, (float)(bgY + 5) }, 8.0f, 1.0f, COLOR_PURE_SNOW);
    
    // Background Image Upload button (UPL) next to layout BG name
    Rectangle uplBtn = { (float)(contentX + contentW - 35), (float)(bgY + 2), 32.0f, 18.0f };
    if (DrawButton(uplBtn, "UPL", false, mousePos)) {
        std::string path = OpenImageFileDialog();
        if (!path.empty()) {
            tempBackgroundPath = path;
            std::cout << "[Canvas] Uploaded custom background: " << path << std::endl;
        }
    }
}

// ───────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ───────────────────────────────────────────────────────────────────
void UIManager::DrawCanvasStudio(
    Vector2 mousePos,
    std::vector<LayoutOption>& layouts,
    bool& requestExit
) {
    ClearBackground(Color{42, 42, 46, 255});
    
    DrawCanvasToolbar(mousePos, layouts, requestExit);
    DrawCanvasViewport(mousePos);
    DrawCanvasLayersPanel(mousePos);
}
