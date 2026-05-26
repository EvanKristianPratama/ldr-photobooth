#ifndef UI_H
#define UI_H

#include "raylib.h"
#include "common.h"
#include <string>
#include <vector>
#include <map>

// Sleek shared typography inline helper to avoid duplicate definitions in modular files
inline void SafeDrawText(Font font, const std::string& text, Vector2 pos, float size, float spacing, Color color) {
    DrawTextEx(font, text.c_str(), pos, size, spacing, color);
}

class UIManager {
private:
    Font fontRegular;
    Font fontBold;
    Texture2D logoTexture;
    Texture2D settingsIcon;
    Texture2D fullscreenIcon;
    bool isLoaded;

    // Helper: Draws a sleek, flat Swiss button with smooth hover transitions
    bool DrawButton(Rectangle bounds, const std::string& text, bool isPrimary, Vector2 mousePos);
    
    // Helper: Draws a custom responsive text input box with a cursor
    bool DrawTextBox(Rectangle bounds, std::string& text, bool& active, Vector2 mousePos);
    
    bool activeBoxTitle = false;
    bool activeBoxSubtitle = false;
    bool activeBoxSlogan = false;

    // Active state for new Frame CMS fields
    bool activeBoxFrameName = false;
    bool activeBoxFrameBG = false;
    bool activeBoxFrameText = false;
    
    // Form values for dynamic Frame CMS
    std::string newFrameName = "";
    std::string newFrameBG = "FFFFFF";
    std::string newFrameText = "000000";
    bool newFrameIsReceipt = false;

    // Layout CMS states
    int settingsTab = 0; // 0 = General & Frames, 1 = Layout CMS, 2 = Printer Settings
    bool activeBoxLayoutName = false;
    std::string newLayoutName = "";
    int newLayoutPhotoCount = 4;
    int newLayoutCols = 2;
    int newLayoutRows = 2;
    bool newLayoutIsVerticalStrip = false;

    // Printer Hardware States
    std::vector<std::string> availablePrinters;
    std::string selectedPrinterName = "";
    bool isAutoPrintEnabled = false;
    int printerSelectionIdx = -1;
    std::string printerStatusMessage = "";
    
    // Adobe Photoshop-style Visual Canvas Editor States
    bool isAdobeCanvasMode = false;
    int selectedSlotIdx = -1;
    bool isResizing = false;
    Vector2 dragOffset = { 0, 0 };
    std::vector<Rectangle> tempSlotRects; // Current coordinates on the pixel canvas sheet
    
    // Photoshop Layering System States
    PaperSize tempPaperSize = PaperSize::PAPER_4R;
    std::string tempBackgroundPath = "";
    std::vector<int> tempZOrder;          // Stacking draw order (bottom to top)
    std::vector<bool> tempSlotVisible;    // Per-slot visibility toggles
    std::vector<bool> tempSlotLocked;     // Per-slot lock toggles
    std::vector<float> tempSlotRotation;   // Per-slot rotation degrees (0, 90, 180, 270)
    
    // Background Image Selector
    std::vector<std::string> availableBackgrounds; // Scanned from assets/backgrounds/
    int selectedBgIdx = 0; // 0 = Solid Color, 1+ = image files
    
    // Canvas Studio Tool States
    enum class CanvasTool { SELECT, TEXT, IMAGE };
    CanvasTool activeTool = CanvasTool::SELECT;
    bool showGuides = true;
    
    // Canvas Studio Overlay Management
    std::vector<OverlayElement> tempOverlays;
    int selectedOverlayIdx = -1;
    bool isDraggingOverlay = false;
    bool isResizingOverlay = false;
    Vector2 overlayDragOffset = {0, 0};
    
    // Text editing state
    bool isEditingText = false;
    std::string editingTextContent = "";
    bool activeBoxOverlayText = false;
    
    // Overlay texture cache for imported images
    std::map<std::string, Texture2D> overlayTextureCache;
    
    // Canvas Studio reference to current layout being edited
    LayoutOption* editingLayout = nullptr;
    int editingLayoutIdx = -1;
    
    void InitializeAdobeCanvasSlots();
    void ScanAvailableBackgrounds();
    void DrawCanvasToolbar(Vector2 mousePos, std::vector<LayoutOption>& layouts, bool& requestExit);
    void DrawCanvasViewport(Vector2 mousePos);
    void DrawCanvasLayersPanel(Vector2 mousePos);
    void DrawSmartGuides(float canvasX, float canvasY, float scaleDiv, int dragIdx, bool isOverlay);

public:
    UIManager();
    ~UIManager();

    bool Initialize();
    void Shutdown();
    
    // Printer settings getters & setters
    std::string GetSelectedPrinterName() const { return selectedPrinterName; }
    bool IsAutoPrintEnabled() const { return isAutoPrintEnabled; }
    void SetSelectedPrinterName(const std::string& name) { selectedPrinterName = name; }
    void SetAutoPrintEnabled(bool enabled) { isAutoPrintEnabled = enabled; }
    
    // Draw sleek premium loading screen
    void DrawLoadingScreen(const std::string& message);

    // Sleek Settings gear icon button
    bool DrawSettingsButton(Vector2 mousePos);

    // Fullscreen shortcut button
    bool DrawFullscreenButton(Vector2 mousePos);

    // Sleek Filter Selector Button on capture screen
    bool DrawFilterButton(Vector2 mousePos, int activeFilter);
    
    void DrawSettingsScreen(
        Vector2 mousePos,
        ReceiptConfig& config,
        std::vector<FrameOption>& frames,
        std::vector<LayoutOption>& layouts,
        bool& requestSave,
        bool& requestOpenStudio
    );
    
    // Full-screen Canvas Studio
    void DrawCanvasStudio(
        Vector2 mousePos,
        std::vector<LayoutOption>& layouts,
        bool& requestExit
    );

    // Standard styling header and footer grids
    void DrawHeader(const std::string& title, const std::string& subtitle);
    void DrawFooter(const std::string& sectionName);

    // Screens
    void DrawStartScreen(Vector2 mousePos, bool& startPressed);
    
    void DrawLayoutScreen(
        Vector2 mousePos,
        const std::vector<LayoutOption>& layouts,
        int& selectedLayout,
        bool& layoutConfirmed
    );
    
    void DrawCaptureScreen(
        int photoIndex,
        int totalPhotos,
        float countdown,
        Texture2D cameraTexture,
        bool isFlashActive
    );
    
    void DrawReviewScreen(
        Vector2 mousePos,
        Texture2D photoTexture,
        int photoIndex,
        bool& requestRetake,
        bool& requestKeep
    );
    
    void DrawFrameScreen(
        Vector2 mousePos,
        const std::vector<FrameOption>& frames,
        int& selectedFrame,
        Texture2D previewTexture,
        bool& frameConfirmed
    );
    
    void DrawResultScreen(
        Vector2 mousePos,
        const std::string& exportedPath,
        Texture2D finalTexture,
        bool& requestRestart,
        bool& requestDownload,
        bool& requestPrint
    );
};

#endif // UI_H
