#include "ui/ui.h"
#include <iostream>

// Flat Swiss Button with stark margins and tactile hover changes
bool UIManager::DrawButton(Rectangle bounds, const std::string& text, bool isPrimary, Vector2 mousePos) {
    bool hovered = CheckCollisionPointRec(mousePos, bounds);
    bool clicked = hovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT);
    
    // Background and border colors
    Color bg = isPrimary ? COLOR_DEEP_INK : COLOR_PURE_SNOW;
    Color border = COLOR_DEEP_INK;
    Color textCol = isPrimary ? COLOR_PURE_SNOW : COLOR_DEEP_INK;
    
    if (hovered) {
        // Invert or swap to Swiss Red highlight on hover
        bg = COLOR_SWISS_RED;
        border = COLOR_SWISS_RED;
        textCol = COLOR_PURE_SNOW;
    }
    
    // Flat drawing (Swiss: no rounded corners, stark solid blocks)
    DrawRectangleRec(bounds, bg);
    DrawRectangleLinesEx(bounds, 2.0f, border);
    
    // Center text vertically and horizontally
    float fontSize = 20.0f;
    Vector2 textSize = MeasureTextEx(fontBold, text.c_str(), fontSize, 1.0f);
    Vector2 textPos = {
        bounds.x + (bounds.width - textSize.x) / 2.0f,
        bounds.y + (bounds.height - textSize.y) / 2.0f
    };
    
    SafeDrawText(fontBold, text, textPos, fontSize, 1.0f, textCol);
    return clicked;
}

// ── CUSTOM TEXT BOX DRAWING AND LOGIC ──
bool UIManager::DrawTextBox(Rectangle bounds, std::string& text, bool& active, Vector2 mousePos) {
    bool hovered = CheckCollisionPointRec(mousePos, bounds);
    if (hovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        active = true;
    } else if (IsMouseButtonPressed(MOUSE_BUTTON_LEFT)) {
        active = false;
    }
    
    Color bg = active ? COLOR_PURE_SNOW : COLOR_LIGHT_GRAY;
    Color border = active ? COLOR_SWISS_RED : COLOR_DEEP_INK;
    DrawRectangleRec(bounds, bg);
    DrawRectangleLinesEx(bounds, active ? 2.0f : 1.0f, border);
    
    if (active) {
        int key = GetCharPressed();
        while (key > 0) {
            // Limit text size to prevent receipt wrapping overflow
            if ((key >= 32) && (key <= 125) && (text.length() < 35)) {
                text += (char)key;
            }
            key = GetCharPressed();
        }
        
        if (IsKeyPressed(KEY_BACKSPACE)) {
            if (!text.empty()) {
                text.pop_back();
            }
        }
    }
    
    float fontSize = 16.0f;
    Vector2 textPos = { bounds.x + 15, bounds.y + (bounds.height - fontSize) / 2.0f };
    SafeDrawText(fontRegular, text, textPos, fontSize, 1.0f, COLOR_DEEP_INK);
    
    if (active && (((int)(GetTime() * 2.5f)) % 2 == 0)) {
        Vector2 textSize = MeasureTextEx(fontRegular, text.c_str(), fontSize, 1.0f);
        DrawRectangle(textPos.x + textSize.x + 2, textPos.y, 2, 16, COLOR_SWISS_RED);
    }
    
    return active;
}

// ── GEAR SETTINGS BUTTON IN HEADER ──
bool UIManager::DrawSettingsButton(Vector2 mousePos) {
    Rectangle bounds = { (float)(WINDOW_WIDTH - 85), 35.0f, 50.0f, 40.0f };
    bool hovered = CheckCollisionPointRec(mousePos, bounds);
    bool clicked = hovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT);
    
    Color bg = hovered ? COLOR_SWISS_RED : COLOR_PURE_SNOW;
    Color border = COLOR_DEEP_INK;
    Color iconCol = hovered ? COLOR_PURE_SNOW : COLOR_DEEP_INK;
    
    DrawRectangleRec(bounds, bg);
    DrawRectangleLinesEx(bounds, 1.0f, border);
    
    if (settingsIcon.id != 0) {
        float scale = 24.0f / (float)settingsIcon.width;
        float drawW = settingsIcon.width * scale;
        float drawH = settingsIcon.height * scale;
        DrawTexturePro(settingsIcon,
            {0, 0, (float)settingsIcon.width, (float)settingsIcon.height},
            {bounds.x + (bounds.width - drawW)/2.0f, bounds.y + (bounds.height - drawH)/2.0f, drawW, drawH},
            {0, 0}, 0.0f, iconCol);
    } else {
        Vector2 size = MeasureTextEx(fontBold, "SET", 14.0f, 1.0f);
        SafeDrawText(fontBold, "SET", { bounds.x + (bounds.width - size.x)/2.0f, bounds.y + (bounds.height - size.y)/2.0f }, 14.0f, 1.0f, iconCol);
    }
    
    return clicked;
}

// ── FULLSCREEN SHORTCUT BUTTON ──
bool UIManager::DrawFullscreenButton(Vector2 mousePos) {
    Rectangle bounds = { (float)(WINDOW_WIDTH - 145), 35.0f, 50.0f, 40.0f };
    bool hovered = CheckCollisionPointRec(mousePos, bounds);
    bool clicked = hovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT);
    
    Color bg = hovered ? COLOR_SWISS_RED : COLOR_PURE_SNOW;
    Color border = COLOR_DEEP_INK;
    Color iconCol = hovered ? COLOR_PURE_SNOW : COLOR_DEEP_INK;
    
    DrawRectangleRec(bounds, bg);
    DrawRectangleLinesEx(bounds, 1.0f, border);
    
    if (fullscreenIcon.id != 0) {
        float scale = 24.0f / (float)fullscreenIcon.width;
        float drawW = fullscreenIcon.width * scale;
        float drawH = fullscreenIcon.height * scale;
        DrawTexturePro(fullscreenIcon,
            {0, 0, (float)fullscreenIcon.width, (float)fullscreenIcon.height},
            {bounds.x + (bounds.width - drawW)/2.0f, bounds.y + (bounds.height - drawH)/2.0f, drawW, drawH},
            {0, 0}, 0.0f, iconCol);
    } else {
        Vector2 size = MeasureTextEx(fontBold, "FUL", 14.0f, 1.0f);
        SafeDrawText(fontBold, "FUL", { bounds.x + (bounds.width - size.x)/2.0f, bounds.y + (bounds.height - size.y)/2.0f }, 14.0f, 1.0f, iconCol);
    }
    
    return clicked;
}

// ── SLEEK FILTER SELECTOR BUTTON ON CAPTURE SCREEN ──
bool UIManager::DrawFilterButton(Vector2 mousePos, int activeFilter) {
    int sideX = 60 + 760 + 40; // Align with sidebar
    Rectangle bounds = { (float)sideX, 390.0f, (float)(WINDOW_WIDTH - 60 - sideX), 50.0f };
    
    std::string text = "FILTER: NONE";
    if (activeFilter == 1) text = "FILTER: DOG AR";
    else if (activeFilter == 2) text = "FILTER: BUNNY AR";
    else if (activeFilter == 3) text = "FILTER: RETRO SUNNY";
    
    return DrawButton(bounds, text, activeFilter > 0, mousePos);
}
