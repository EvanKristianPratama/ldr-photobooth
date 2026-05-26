#ifndef COMMON_H
#define COMMON_H

#include "raylib.h"
#include <opencv2/core.hpp>
#include <string>
#include <vector>

// Screen States
enum class ScreenState {
    START,
    CHOOSE_LAYOUT,
    CAPTURE,
    RETAKE_REVIEW,
    CHOOSE_FRAME,
    RESULT,
    SETTINGS,
    CANVAS_STUDIO  // Full-screen canvas editor
};

// Swiss Design Color Palette
// Swiss style uses high-contrast, pure flat colors with a stark, minimal base.
const Color COLOR_SWISS_RED   = { 230, 57, 70, 255 };    // E63946 (Vibrant Swiss Red Accent)
const Color COLOR_DEEP_INK    = { 26, 26, 26, 255 };      // 1A1A1A (Modern charcoal black)
const Color COLOR_PURE_SNOW   = { 248, 249, 250, 255 };   // F8F9FA (Off-white canvas)
const Color COLOR_LIGHT_GRAY  = { 233, 236, 239, 255 };   // E9ECEF (Grid structures)
const Color COLOR_SLATE_GRAY  = { 141, 153, 174, 255 };   // 8D99AE (Muted labels)
const Color COLOR_BAUHAUS_YEL = { 252, 191, 73, 255 };    // FCBF49 ( Bauhaus Accent Yellow)
const Color COLOR_EMERALD     = { 46, 117, 89, 255 };     // 2E7559 (Swiss Mountain Pine)

// Captured Photo Cache
struct CapturedPhoto {
    cv::Mat mat;              // OpenCV matrix for editing and high-res compilation
    Texture2D texture;        // Raylib texture for GPU UI rendering
    bool isTaken = false;
};

// Paper Size Selection Options
enum class PaperSize {
    PAPER_2R = 0,  // Single vertical strip / 600x1800 px
    PAPER_4R = 1   // Standard print sheet / 1200x1800 px
};

// Overlay element types for the canvas editor
enum class OverlayType {
    TEXT = 0,
    IMAGE = 1
};

struct OverlayElement {
    OverlayType type;
    Rectangle rect;            // Position & size on canvas pixel coords
    std::string content;       // Text string or image file path
    float fontSize = 40.0f;    // For text overlays
    Color color = {26,26,26,255}; // For text overlays
    bool visible = true;
    bool locked = false;
};

// Layout Options
struct LayoutOption {
    std::string name;
    int photoCount;
    int cols;
    int rows;
    bool isVerticalStrip;     // True for classic photo strip (e.g. 4 photos stacked)
    bool isCustom = false;
    std::vector<Rectangle> slotRects; // Exact pixel coordinates on 1200/600 x 1800 print canvas
    
    // Stacking Layering & Background Settings
    PaperSize paperSize = PaperSize::PAPER_4R;
    std::string backgroundPath = "";  // Empty for default solid color frame
    std::vector<int> zOrder;          // Stacking draw order (indices from bottom to top)
    std::vector<bool> slotVisible;    // Visibility of each slot
    std::vector<bool> slotLocked;     // Lock status of each slot
    std::vector<float> slotRotation;   // Rotation angle in degrees (0, 90, 180, 270)
    
    // Text and Image Overlays
    std::vector<OverlayElement> overlays;
};

// Frame Customization Options
struct FrameOption {
    std::string name;
    Color color;
    Color textColor;
    bool isReceipt = false;
};

// Standard Screen Resolution (Window Size)
const int WINDOW_WIDTH = 1280;
const int WINDOW_HEIGHT = 800;

struct ReceiptConfig {
    std::string title = "LDR THERMAL BOOTH";
    std::string subtitle = "STORE #9821 // ZURICH CO-OP STUDIO";
    std::string slogan = "THANK YOU FOR YOUR VISIT!";
};

#endif // COMMON_H
