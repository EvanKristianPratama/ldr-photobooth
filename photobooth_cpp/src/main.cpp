#include "raylib.h"
#include "common.h"
#include "camera/camera.h"
#include "ui/ui.h"
#include "image/processor.h"
#include "printer.h"
#include <iostream>
#include <vector>
#include <ctime>
#include <iomanip>
#include <sstream>
#include <fstream>
#include <cstdlib>

// Helper to get standard readable time
std::string GetCurrentTimestamp() {
    std::time_t t = std::time(nullptr);
    std::tm tm = *std::localtime(&t);
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y%m%d_%H%M%S");
    return oss.str();
}

std::string GetFormattedTimestamp() {
    std::time_t t = std::time(nullptr);
    std::tm tm = *std::localtime(&t);
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    return oss.str();
}

// Persistence Helpers for Frames CMS
static std::vector<FrameOption> LoadFramesFromDisk() {
    std::vector<FrameOption> frames;
    std::ifstream file("exports/custom_frames.cfg");
    if (!file.is_open()) {
        // Return premium standard defaults if config not found
        return {
            { "PURE SNOW (WHITE)", COLOR_PURE_SNOW, COLOR_DEEP_INK, false },
            { "DEEP CHARCOAL (DARK)", COLOR_DEEP_INK, COLOR_PURE_SNOW, false },
            { "STRIPS EMBLEM (RED)", COLOR_SWISS_RED, COLOR_PURE_SNOW, false },
            { "EMERALD PINE (GREEN)", COLOR_EMERALD, COLOR_PURE_SNOW, false },
            { "BAUHAUS RETRO (YELLOW)", COLOR_BAUHAUS_YEL, COLOR_DEEP_INK, false },
            { "THERMAL RECEIPT (RETRO)", COLOR_PURE_SNOW, COLOR_DEEP_INK, true }
        };
    }
    
    std::string line;
    while (std::getline(file, line)) {
        if (line.empty()) continue;
        std::stringstream ss(line);
        std::string name, colStr, textColStr, isRecStr;
        
        if (std::getline(ss, name, ';') &&
            std::getline(ss, colStr, ';') &&
            std::getline(ss, textColStr, ';') &&
            std::getline(ss, isRecStr)) {
            
            // Parse BG color
            int r = 255, g = 255, b = 255;
            std::stringstream colSS(colStr);
            char comma;
            colSS >> r >> comma >> g >> comma >> b;
            
            // Parse Text color
            int tr = 0, tg = 0, tb = 0;
            std::stringstream textColSS(textColStr);
            textColSS >> tr >> comma >> tg >> comma >> tb;
            
            bool isReceipt = (isRecStr == "1");
            
            frames.push_back({
                name,
                Color{ (unsigned char)r, (unsigned char)g, (unsigned char)b, 255 },
                Color{ (unsigned char)tr, (unsigned char)tg, (unsigned char)tb, 255 },
                isReceipt
            });
        }
    }
    return frames;
}

// Persistence Helpers for Layouts CMS
static std::vector<LayoutOption> LoadLayoutsFromDisk() {
    std::vector<LayoutOption> layouts;
    std::ifstream file("exports/custom_layouts.cfg");
    if (!file.is_open()) {
        // Return premium standard defaults if config not found
        return {
            { "CLASSIC 4-STRIP", 4, 1, 4, true, false, {}, PaperSize::PAPER_4R, "", {}, {}, {} },
            { "MODERN 2x2 GRID", 4, 2, 2, false, false, {}, PaperSize::PAPER_4R, "", {}, {}, {} },
            { "POSTER 3x2 GRID", 6, 3, 2, false, false, {}, PaperSize::PAPER_4R, "", {}, {}, {} }
        };
    }
    
    std::string line;
    while (std::getline(file, line)) {
        if (line.empty()) continue;
        
        // Tokenize by semicolons
        std::vector<std::string> tokens;
        std::stringstream ss(line);
        std::string tok;
        while (std::getline(ss, tok, ';')) {
            tokens.push_back(tok);
        }
        
        if (tokens.size() < 5) continue; // At minimum: name;count;cols;rows;isVert
        
        LayoutOption opt;
        opt.name = tokens[0];
        try { opt.photoCount = std::stoi(tokens[1]); } catch (...) { opt.photoCount = 4; }
        try { opt.cols = std::stoi(tokens[2]); } catch (...) { opt.cols = 1; }
        try { opt.rows = std::stoi(tokens[3]); } catch (...) { opt.rows = 4; }
        opt.isVerticalStrip = (tokens[4] == "1");
        
        // Token 5: isCustom
        if (tokens.size() > 5) {
            opt.isCustom = (tokens[5] == "1");
        }
        
        // Token 6: slotRects (bracket-encoded)
        if (tokens.size() > 6 && opt.isCustom) {
            std::stringstream sss(tokens[6]);
            std::string rectTok;
            while (std::getline(sss, rectTok, ']')) {
                if (rectTok.empty()) continue;
                size_t startPos = rectTok.find('[');
                if (startPos != std::string::npos) {
                    std::string inner = rectTok.substr(startPos + 1);
                    std::stringstream innerSS(inner);
                    std::string xStr, yStr, wStr, hStr;
                    if (std::getline(innerSS, xStr, ',') &&
                        std::getline(innerSS, yStr, ',') &&
                        std::getline(innerSS, wStr, ',') &&
                        std::getline(innerSS, hStr)) {
                        opt.slotRects.push_back({ std::stof(xStr), std::stof(yStr), std::stof(wStr), std::stof(hStr) });
                    }
                }
            }
        }
        
        // Token 7: paperSize (0=2R, 1=4R)
        if (tokens.size() > 7) {
            try { opt.paperSize = (PaperSize)std::stoi(tokens[7]); } catch (...) { opt.paperSize = PaperSize::PAPER_4R; }
        }
        
        // Token 8: backgroundPath
        if (tokens.size() > 8) {
            opt.backgroundPath = (tokens[8] == "NONE") ? "" : tokens[8];
        }
        
        // Token 9: zOrder (comma-separated)
        if (tokens.size() > 9 && !tokens[9].empty()) {
            std::stringstream zSS(tokens[9]);
            std::string zTok;
            while (std::getline(zSS, zTok, ',')) {
                try { opt.zOrder.push_back(std::stoi(zTok)); } catch (...) {}
            }
        }
        
        // Token 10: slotVisible (comma-separated 0/1)
        if (tokens.size() > 10 && !tokens[10].empty()) {
            std::stringstream vSS(tokens[10]);
            std::string vTok;
            while (std::getline(vSS, vTok, ',')) {
                opt.slotVisible.push_back(vTok == "1");
            }
        }
        
        // Token 11: slotLocked (comma-separated 0/1)
        if (tokens.size() > 11 && !tokens[11].empty()) {
            std::stringstream lSS(tokens[11]);
            std::string lTok;
            while (std::getline(lSS, lTok, ',')) {
                opt.slotLocked.push_back(lTok == "1");
            }
        }
        
        // Token 12: slotRotation (comma-separated floats)
        if (tokens.size() > 12 && !tokens[12].empty()) {
            std::stringstream rSS(tokens[12]);
            std::string rTok;
            while (std::getline(rSS, rTok, ',')) {
                try { opt.slotRotation.push_back(std::stof(rTok)); } catch (...) { opt.slotRotation.push_back(0.0f); }
            }
        }
        
        // Fill defaults if layer arrays are empty
        if (opt.zOrder.empty()) {
            for (int i = 0; i < opt.photoCount; ++i) opt.zOrder.push_back(i);
        }
        if (opt.slotVisible.empty()) {
            for (int i = 0; i < opt.photoCount; ++i) opt.slotVisible.push_back(true);
        }
        if (opt.slotLocked.empty()) {
            for (int i = 0; i < opt.photoCount; ++i) opt.slotLocked.push_back(false);
        }
        if (opt.slotRotation.empty()) {
            for (int i = 0; i < opt.photoCount; ++i) opt.slotRotation.push_back(0.0f);
        }
        
        layouts.push_back(opt);
    }
    return layouts;
}

// Live update of the compiled frame strip inside the Frame Select view
void CompilePreview(
    const std::vector<CapturedPhoto>& photos,
    const LayoutOption& layout,
    const FrameOption& frame,
    Texture2D& previewTexture,
    const ReceiptConfig& config
) {
    std::string previewPath = ImageProcessor::CompileAndSave(
        photos, layout, frame, "preview",
        config.title, config.subtitle, config.slogan
    );
    if (!previewPath.empty()) {
        if (previewTexture.id != 0) {
            UnloadTexture(previewTexture);
        }
        previewTexture = LoadTexture(previewPath.c_str());
    }
}

int main() {
    // 1. Initialize Raylib Hardware Window
    SetConfigFlags(FLAG_VSYNC_HINT);
    InitWindow(WINDOW_WIDTH, WINDOW_HEIGHT, "STRIPS PHOTOBOOTH SYSTEM");
    SetTargetFPS(60);
    
    // Set Window Icon using custom brand logo PNG
    Image icon = LoadImage("assets/Ldr_photobooth.png");
    if (icon.data != nullptr) {
        SetWindowIcon(icon);
        UnloadImage(icon);
    }
    
    std::cout << "[Main] Initializing system submodules..." << std::endl;
    
    // 2. Instantiate Managers
    CameraManager camera;
    UIManager ui;
    
    // Initialize UI first so we can draw a beautiful loading screen!
    ui.Initialize();
    
    // Draw loading screen while initializing camera hardware
    for (int i = 0; i < 5; ++i) {
        BeginDrawing();
        ui.DrawLoadingScreen("INITIALIZING SYSTEM HARDWARE CAMERA...");
        EndDrawing();
    }
    
    // Initialize Camera (which starts the background capturing thread)
    camera.Initialize(0);
    
    // 3. Define Standard Presets
    // Layout Preset Grid Structures loaded from disk config (CMS style)
    std::vector<LayoutOption> layouts = LoadLayoutsFromDisk();
    
    // Dynamic Frame Swatches loaded from disk config (CMS style)
    std::vector<FrameOption> frames = LoadFramesFromDisk();
    
    // Load Printer settings
    std::string loadedPrinter = "";
    bool loadedAutoPrint = false;
    PrinterManager::LoadPrinterSettings(loadedPrinter, loadedAutoPrint);
    ui.SetSelectedPrinterName(loadedPrinter);
    ui.SetAutoPrintEnabled(loadedAutoPrint);
    
    // 4. Session Variables
    ScreenState currentState = ScreenState::START;
    int selectedLayout = 0;
    int selectedFrame = 0;
    int previousFrameSelection = -1; // Detect changed frame to live compile preview
    
    std::vector<CapturedPhoto> capturedPhotos;
    int currentCaptureIndex = 0;
    
    float countdownTimer = 0.0f;
    bool isFlashActive = false;
    float flashTimer = 0.0f;
    
    int activeFilter = 0; // 0 = None, 1 = Dog, 2 = Bunny, 3 = Glasses
    
    // Textures Cache
    Texture2D liveCameraTexture = { 0 };
    Texture2D reviewPhotoTexture = { 0 };
    Texture2D compiledPreviewTexture = { 0 };
    Texture2D finalCompiledTexture = { 0 };
    
    std::string exportedFilePath = "";
    
    // Receipt customizations Configuration
    ReceiptConfig receiptConfig;
    
    // Automatic timeout variables for Result screen
    float resultTimer = 0.0f;
    const float RESULT_AUTO_TIMEOUT = 25.0f; // Return to start after 25s
    
    std::cout << "[Main] System entering main execution loop." << std::endl;
    
    // 5. Main Window Loop
    while (!WindowShouldClose()) {
        // Run the frame-based non-blocking printer queue update
        PrinterManager::Update();
        
        Vector2 mousePos = GetMousePosition();
        
        // Global Keyboard Shortcut: Toggle Fullscreen Mode with 'F' Key
        if (IsKeyPressed(KEY_F)) {
            ToggleFullscreen();
        }
        
        // --- 5B. RENDER SCREEN CONTEXT (Raylib Swapbuffers) & STATE DRAWING ---
        BeginDrawing();
        
        switch (currentState) {
            case ScreenState::START: {
                bool startPressed = false;
                ui.DrawStartScreen(mousePos, startPressed);
                
                // Open Settings
                if (ui.DrawSettingsButton(mousePos)) {
                    currentState = ScreenState::SETTINGS;
                }
                
                // Toggle Fullscreen
                if (ui.DrawFullscreenButton(mousePos)) {
                    ToggleFullscreen();
                }
                
                if (startPressed) {
                    currentState = ScreenState::CHOOSE_LAYOUT;
                }
                break;
            }
            
            case ScreenState::CHOOSE_LAYOUT: {
                bool layoutConfirmed = false;
                ui.DrawLayoutScreen(mousePos, layouts, selectedLayout, layoutConfirmed);
                
                // Open Settings
                if (ui.DrawSettingsButton(mousePos)) {
                    currentState = ScreenState::SETTINGS;
                }
                
                // Toggle Fullscreen
                if (ui.DrawFullscreenButton(mousePos)) {
                    ToggleFullscreen();
                }
                
                if (layoutConfirmed) {
                    // Prepare capture session structures
                    int count = layouts[selectedLayout].photoCount;
                    capturedPhotos.clear();
                    capturedPhotos.resize(count);
                    
                    currentCaptureIndex = 0;
                    countdownTimer = 4.0f; // Initial timer giving poses setup time
                    isFlashActive = false;
                    
                    currentState = ScreenState::CAPTURE;
                }
                break;
            }
            
            case ScreenState::CAPTURE: {
                // Sync and apply active face filter in real-time
                camera.SetActiveFilter(activeFilter);
                
                // Keyboard shortcut V to cycle filters
                if (IsKeyPressed(KEY_V)) {
                    activeFilter = (activeFilter + 1) % 4;
                    std::cout << "[Filters] Active filter changed to: " << activeFilter << std::endl;
                }
                
                // Keep streaming live camera frame
                camera.UpdateRaylibTexture(liveCameraTexture);
                
                // Tick countdown
                countdownTimer -= GetFrameTime();
                
                // Flash overlay check
                if (isFlashActive) {
                    flashTimer -= GetFrameTime();
                    if (flashTimer <= 0.0f) {
                        isFlashActive = false;
                    }
                }
                
                if (countdownTimer <= 0.05f) {
                    // Shutter Trigger!
                    std::cout << "[Shutter] Capturing photo " << (currentCaptureIndex + 1) << "..." << std::endl;
                    
                    cv::Mat rawMat = camera.GetLatestMat();
                    
                    // Cache the photo OpenCV Matrix
                    capturedPhotos[currentCaptureIndex].mat = rawMat.clone();
                    capturedPhotos[currentCaptureIndex].isTaken = true;
                    
                    // Convert captured matrix to its individual preview Raylib texture
                    cv::Mat rgbMat;
                    cv::cvtColor(rawMat, rgbMat, cv::COLOR_BGR2RGB);
                    Image tempImg = {
                        rgbMat.data,
                        rgbMat.cols,
                        rgbMat.rows,
                        1,
                        PIXELFORMAT_UNCOMPRESSED_R8G8B8
                    };
                    
                    if (capturedPhotos[currentCaptureIndex].texture.id != 0) {
                        UnloadTexture(capturedPhotos[currentCaptureIndex].texture);
                    }
                    capturedPhotos[currentCaptureIndex].texture = LoadTextureFromImage(tempImg);
                    
                    // Setup review references
                    reviewPhotoTexture = capturedPhotos[currentCaptureIndex].texture;
                    
                    // Flash triggers
                    isFlashActive = true;
                    flashTimer = 0.15f;
                    
                    currentState = ScreenState::RETAKE_REVIEW;
                }
                
                ui.DrawCaptureScreen(currentCaptureIndex, layouts[selectedLayout].photoCount, 
                                     countdownTimer, liveCameraTexture, isFlashActive);
                
                // Draw dynamic Snapchat-style face filter button
                if (ui.DrawFilterButton(mousePos, activeFilter)) {
                    activeFilter = (activeFilter + 1) % 4;
                    std::cout << "[Filters] Active filter changed to: " << activeFilter << std::endl;
                }
                break;
            }
            
            case ScreenState::RETAKE_REVIEW: {
                bool requestRetake = false;
                bool requestKeep = false;
                
                ui.DrawReviewScreen(mousePos, reviewPhotoTexture, currentCaptureIndex, requestRetake, requestKeep);
                
                if (requestRetake) {
                    // Wipe current slot texture and matrix
                    if (capturedPhotos[currentCaptureIndex].texture.id != 0) {
                        UnloadTexture(capturedPhotos[currentCaptureIndex].texture);
                        capturedPhotos[currentCaptureIndex].texture = { 0 };
                    }
                    capturedPhotos[currentCaptureIndex].mat.release();
                    capturedPhotos[currentCaptureIndex].isTaken = false;
                    
                    // Restart capture timer for current slot
                    countdownTimer = 3.5f;
                    currentState = ScreenState::CAPTURE;
                }
                
                if (requestKeep) {
                    int total = layouts[selectedLayout].photoCount;
                    if (currentCaptureIndex + 1 < total) {
                        // Capture next photo
                        currentCaptureIndex++;
                        countdownTimer = 3.5f;
                        currentState = ScreenState::CAPTURE;
                    } else {
                        // Completed all captures! Transition to framing selection
                        previousFrameSelection = -1; // Reset selection to trigger dynamic compile
                        currentState = ScreenState::CHOOSE_FRAME;
                    }
                }
                break;
            }
            
            case ScreenState::CHOOSE_FRAME: {
                // If frame selection changed, dynamically re-compile the grid layout preview
                if (selectedFrame != previousFrameSelection) {
                    CompilePreview(capturedPhotos, layouts[selectedLayout], frames[selectedFrame], compiledPreviewTexture, receiptConfig);
                    previousFrameSelection = selectedFrame;
                }
                
                bool frameConfirmed = false;
                ui.DrawFrameScreen(mousePos, frames, selectedFrame, compiledPreviewTexture, frameConfirmed);
                
                // Open Settings
                if (ui.DrawSettingsButton(mousePos)) {
                    currentState = ScreenState::SETTINGS;
                }
                
                // Toggle Fullscreen
                if (ui.DrawFullscreenButton(mousePos)) {
                    ToggleFullscreen();
                }
                
                if (frameConfirmed) {
                    // Draw loading screen to give immediate feedback
                    for (int i = 0; i < 2; ++i) {
                        BeginDrawing();
                        ui.DrawLoadingScreen("COMPILING & EXPORTING HIGH-RES COLLAGE...");
                        EndDrawing();
                    }
                    
                    // 1. Compile final high-resolution PNG
                    std::string timestamp = GetCurrentTimestamp();
                    exportedFilePath = ImageProcessor::CompileAndSave(
                        capturedPhotos, layouts[selectedLayout], frames[selectedFrame], timestamp,
                        receiptConfig.title, receiptConfig.subtitle, receiptConfig.slogan
                    );
                    
                    // 2. Load final saved PNG from disk to display in full resolution
                    if (!exportedFilePath.empty()) {
                        if (finalCompiledTexture.id != 0) {
                            UnloadTexture(finalCompiledTexture);
                        }
                        finalCompiledTexture = LoadTexture(exportedFilePath.c_str());
                        
                        // 3. Auto-print if enabled in Settings
                        if (ui.IsAutoPrintEnabled() && !ui.GetSelectedPrinterName().empty()) {
                            std::cout << "[Main] Auto-print is enabled. Sending to printer (async): " << ui.GetSelectedPrinterName() << std::endl;
                            PrinterManager::PrintImageAsync(ui.GetSelectedPrinterName(), exportedFilePath);
                        }
                    }
                    
                    // Initialize timeout clock
                    resultTimer = 0.0f;
                    currentState = ScreenState::RESULT;
                }
                break;
            }
            
            case ScreenState::RESULT: {
                resultTimer += GetFrameTime();
                
                bool requestRestart = false;
                bool requestDownload = false;
                bool requestPrint = false;
                ui.DrawResultScreen(mousePos, exportedFilePath, finalCompiledTexture, requestRestart, requestDownload, requestPrint);
                
                // If print requested: send to printer
                if (requestPrint && !exportedFilePath.empty()) {
                    std::cout << "[Main] Print requested. Sending to printer (async): " << ui.GetSelectedPrinterName() << std::endl;
                    PrinterManager::PrintImageAsync(ui.GetSelectedPrinterName(), exportedFilePath);
                }
                
                // If download requested: Save to Desktop
                if (requestDownload && !exportedFilePath.empty()) {
                    char* homePath = getenv("HOME");
                    if (homePath != nullptr) {
                        std::string desktopDir = std::string(homePath) + "/Desktop";
                        std::string baseFilename = exportedFilePath.substr(exportedFilePath.find_last_of("/\\") + 1);
                        std::string destination = desktopDir + "/" + baseFilename;
                        
                        std::ifstream src(exportedFilePath, std::ios::binary);
                        std::ofstream dst(destination, std::ios::binary);
                        
                        if (src && dst) {
                            dst << src.rdbuf();
                            std::cout << "[Save] Successfully saved photo to Desktop: " << destination << std::endl;
                        } else {
                            std::cerr << "[Save] ERROR: Failed copying file to Desktop!" << std::endl;
                        }
                    }
                }
                
                // Return to Start Screen on timeout or user request
                if (requestRestart || (resultTimer >= RESULT_AUTO_TIMEOUT)) {
                    std::cout << "[Session] Restarting new session... Cleaning cache..." << std::endl;
                    activeFilter = 0; // Reset Snapchat AR filters
                    
                    // Unload captured session textures
                    for (auto& photo : capturedPhotos) {
                        if (photo.texture.id != 0) {
                            UnloadTexture(photo.texture);
                            photo.texture = { 0 };
                        }
                    }
                    capturedPhotos.clear();
                    
                    // Unload session-specific compile images
                    if (compiledPreviewTexture.id != 0) {
                        UnloadTexture(compiledPreviewTexture);
                        compiledPreviewTexture = { 0 };
                    }
                    if (finalCompiledTexture.id != 0) {
                        UnloadTexture(finalCompiledTexture);
                        finalCompiledTexture = { 0 };
                    }
                    
                    currentState = ScreenState::START;
                }
                break;
            }
            
            case ScreenState::SETTINGS: {
                bool requestSave = false;
                bool requestOpenStudio = false;
                ui.DrawSettingsScreen(mousePos, receiptConfig, frames, layouts, requestSave, requestOpenStudio);
                if (requestOpenStudio) {
                    currentState = ScreenState::CANVAS_STUDIO;
                } else if (requestSave) {
                    previousFrameSelection = -1; // Force dynamic preview update when returning
                    currentState = ScreenState::START;
                }
                break;
            }
            
            case ScreenState::CANVAS_STUDIO: {
                bool requestExit = false;
                ui.DrawCanvasStudio(mousePos, layouts, requestExit);
                if (requestExit) {
                    currentState = ScreenState::SETTINGS;
                }
                break;
            }
        }
        
        EndDrawing();
    }
    
    std::cout << "[Main] Unloading session allocations and stopping camera..." << std::endl;
    
    // 6. Cleanup Allocations
    if (liveCameraTexture.id != 0) UnloadTexture(liveCameraTexture);
    if (reviewPhotoTexture.id != 0) UnloadTexture(reviewPhotoTexture);
    if (compiledPreviewTexture.id != 0) UnloadTexture(compiledPreviewTexture);
    if (finalCompiledTexture.id != 0) UnloadTexture(finalCompiledTexture);
    
    for (auto& photo : capturedPhotos) {
        if (photo.texture.id != 0) {
            UnloadTexture(photo.texture);
        }
    }
    
    camera.Shutdown();
    ui.Shutdown();
    
    CloseWindow();
    
    std::cout << "[Main] System shut down cleanly." << std::endl;
    return 0;
}
