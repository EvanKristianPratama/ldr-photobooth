#include "ui/ui.h"
#include <iostream>

UIManager::UIManager() : isLoaded(false) {
    fontRegular = { 0 };
    fontBold = { 0 };
    logoTexture = { 0 };
    isAdobeCanvasMode = true;
}

UIManager::~UIManager() {
    Shutdown();
}

bool UIManager::Initialize() {
    std::cout << "[UI] Loading sans-serif modern typography (Outfit)..." << std::endl;
    
    // Load Outfit font from assets directory. 
    // Fall back gracefully to Raylib's internal font if the TTF files aren't ready yet.
    fontRegular = LoadFontEx("assets/fonts/Outfit-Regular.ttf", 64, nullptr, 0);
    fontBold = LoadFontEx("assets/fonts/Outfit-Bold.ttf", 64, nullptr, 0);
    
    if (fontRegular.texture.id == 0 || fontBold.texture.id == 0) {
        std::cerr << "[UI] WARNING: Modern typography files not found. Falling back to default system font." << std::endl;
        fontRegular = GetFontDefault();
        fontBold = GetFontDefault();
    }
    
    // Load brand logo PNG
    std::cout << "[UI] Loading LDR custom brand logo..." << std::endl;
    logoTexture = LoadTexture("assets/Ldr_photobooth.png");
    if (logoTexture.id == 0) {
        std::cerr << "[UI] WARNING: Logo image failed to load! Fallback mode active." << std::endl;
    }
    
    settingsIcon = LoadTexture("assets/icons/settings.png");
    SetTextureFilter(settingsIcon, TEXTURE_FILTER_BILINEAR);
    fullscreenIcon = LoadTexture("assets/icons/fullscreen.png");
    SetTextureFilter(fullscreenIcon, TEXTURE_FILTER_BILINEAR);
    
    isLoaded = true;
    return true;
}

void UIManager::Shutdown() {
    if (isLoaded) {
        // Only unload if they are custom loaded fonts (texture id > 0 and not default)
        if (fontRegular.texture.id != 0 && fontRegular.texture.id != GetFontDefault().texture.id) {
            UnloadFont(fontRegular);
        }
        if (fontBold.texture.id != 0 && fontBold.texture.id != GetFontDefault().texture.id) {
            UnloadFont(fontBold);
        }
        if (logoTexture.id != 0) {
            UnloadTexture(logoTexture);
            logoTexture = { 0 };
        }
        if (settingsIcon.id != 0) {
            UnloadTexture(settingsIcon);
            settingsIcon = { 0 };
        }
        if (fullscreenIcon.id != 0) {
            UnloadTexture(fullscreenIcon);
            fullscreenIcon = { 0 };
        }
        isLoaded = false;
    }
}

// Standard header alignment structure
void UIManager::DrawHeader(const std::string& title, const std::string& subtitle) {
    // Elegant left-aligned Swiss title block
    DrawRectangle(35, 30, 6, 50, COLOR_SWISS_RED); // Stark accent line
    
    SafeDrawText(fontBold, title, { 55, 26 }, 32.0f, 1.0f, COLOR_DEEP_INK);
    SafeDrawText(fontRegular, subtitle, { 55, 62 }, 15.0f, 1.0f, COLOR_SLATE_GRAY);
    
    // Divider line
    DrawLine(35, 95, WINDOW_WIDTH - 35, 95, COLOR_LIGHT_GRAY);
}

void UIManager::DrawFooter(const std::string& sectionName) {
    DrawLine(35, WINDOW_HEIGHT - 55, WINDOW_WIDTH - 35, WINDOW_HEIGHT - 55, COLOR_LIGHT_GRAY);
    
    SafeDrawText(fontRegular, "LDR PHOTOBOOTH // STRIPS EDITION 2026", { 35, WINDOW_HEIGHT - 45 }, 12.0f, 1.0f, COLOR_SLATE_GRAY);
    
    // Right aligned section metadata
    Vector2 size = MeasureTextEx(fontBold, sectionName.c_str(), 12.0f, 1.0f);
    SafeDrawText(fontBold, sectionName, { WINDOW_WIDTH - 35 - size.x, WINDOW_HEIGHT - 45 }, 12.0f, 1.0f, COLOR_SWISS_RED);
}
