#include "ui/ui.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <sys/stat.h>

// Shared persistence helper: convert hex string to Color
Color HexToColor(const std::string& hex) {
    std::string cleanHex = hex;
    if (!cleanHex.empty() && cleanHex[0] == '#') {
        cleanHex = cleanHex.substr(1);
    }
    while (!cleanHex.empty() && cleanHex.back() == ' ') cleanHex.pop_back();
    while (!cleanHex.empty() && cleanHex.front() == ' ') cleanHex.erase(cleanHex.begin());
    
    if (cleanHex.length() != 6) return WHITE;
    
    unsigned int r, g, b;
    std::stringstream ss;
    ss << std::hex << cleanHex.substr(0, 2); ss >> r; ss.clear();
    ss << std::hex << cleanHex.substr(2, 2); ss >> g; ss.clear();
    ss << std::hex << cleanHex.substr(4, 2); ss >> b;
    
    return Color{ (unsigned char)r, (unsigned char)g, (unsigned char)b, 255 };
}

void SaveFramesToDisk(const std::vector<FrameOption>& frames) {
    struct stat info;
    if (stat("exports", &info) != 0) {
        mkdir("exports", 0777);
    }
    std::ofstream file("exports/custom_frames.cfg");
    if (!file.is_open()) return;
    for (const auto& f : frames) {
        file << f.name << ";" 
             << (int)f.color.r << "," << (int)f.color.g << "," << (int)f.color.b << ";"
             << (int)f.textColor.r << "," << (int)f.textColor.g << "," << (int)f.textColor.b << ";"
             << (f.isReceipt ? 1 : 0) << "\n";
    }
}

void SaveLayoutsToDisk(const std::vector<LayoutOption>& layouts) {
    struct stat info;
    if (stat("exports", &info) != 0) {
        mkdir("exports", 0777);
    }
    std::ofstream file("exports/custom_layouts.cfg");
    if (!file.is_open()) return;
    for (const auto& l : layouts) {
        file << l.name << ";"
             << l.photoCount << ";"
             << l.cols << ";"
             << l.rows << ";"
             << (l.isVerticalStrip ? 1 : 0) << ";"
             << (l.isCustom ? 1 : 0) << ";";
        if (l.isCustom) {
            for (size_t i = 0; i < l.slotRects.size(); ++i) {
                const auto& r = l.slotRects[i];
                file << "[" << (int)r.x << "," << (int)r.y << "," << (int)r.width << "," << (int)r.height << "]";
                if (i + 1 < l.slotRects.size()) file << ",";
            }
        }
        // Serialize extended layering fields
        file << ";" << (int)l.paperSize;
        file << ";" << (l.backgroundPath.empty() ? "NONE" : l.backgroundPath);
        // zOrder
        file << ";";
        for (size_t i = 0; i < l.zOrder.size(); ++i) {
            file << l.zOrder[i];
            if (i + 1 < l.zOrder.size()) file << ",";
        }
        // visible
        file << ";";
        for (size_t i = 0; i < l.slotVisible.size(); ++i) {
            file << (l.slotVisible[i] ? 1 : 0);
            if (i + 1 < l.slotVisible.size()) file << ",";
        }
        // locked
        file << ";";
        for (size_t i = 0; i < l.slotLocked.size(); ++i) {
            file << (l.slotLocked[i] ? 1 : 0);
            if (i + 1 < l.slotLocked.size()) file << ",";
        }
        // rotation
        file << ";";
        for (size_t i = 0; i < l.slotRotation.size(); ++i) {
            file << (int)l.slotRotation[i];
            if (i + 1 < l.slotRotation.size()) file << ",";
        }
        // Overlays
        file << ";";
        for (size_t i = 0; i < l.overlays.size(); ++i) {
            const auto& ov = l.overlays[i];
            file << "{" << (int)ov.type << "|"
                 << (int)ov.rect.x << "," << (int)ov.rect.y << "," << (int)ov.rect.width << "," << (int)ov.rect.height << "|"
                 << ov.content << "|"
                 << (int)ov.fontSize << "|"
                 << (int)ov.color.r << "," << (int)ov.color.g << "," << (int)ov.color.b << "|"
                 << (ov.visible ? 1 : 0) << "|"
                 << (ov.locked ? 1 : 0) << "}";
            if (i + 1 < l.overlays.size()) file << ",";
        }
        file << "\n";
    }
}
