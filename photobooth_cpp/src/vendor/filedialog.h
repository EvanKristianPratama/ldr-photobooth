#ifndef FILEDIALOG_H
#define FILEDIALOG_H

#include <string>
#include <cstdio>
#include <array>

// Minimal native macOS file dialog using osascript (AppleScript)
// Returns empty string if cancelled, otherwise returns the absolute file path.
inline std::string OpenFileDialog(const std::string& title, const std::string& fileTypes) {
    // Build AppleScript command for native Finder file picker
    // fileTypes example: "png", "jpg"
    std::string script = "osascript -e 'tell application \"System Events\"' "
                         "-e 'activate' "
                         "-e 'set theFile to choose file with prompt \"" + title + "\" "
                         "of type {\"" + fileTypes + "\"}' "
                         "-e 'POSIX path of theFile' "
                         "-e 'end tell' 2>/dev/null";
    
    std::array<char, 512> buffer;
    std::string result;
    
    FILE* pipe = popen(script.c_str(), "r");
    if (!pipe) return "";
    
    while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
        result += buffer.data();
    }
    pclose(pipe);
    
    // Trim trailing newline
    while (!result.empty() && (result.back() == '\n' || result.back() == '\r')) {
        result.pop_back();
    }
    
    return result;
}

// Overload for multiple file type extensions
inline std::string OpenImageFileDialog() {
    std::string script = "osascript -e 'tell application \"System Events\"' "
                         "-e 'activate' "
                         "-e 'set theFile to choose file with prompt \"Import Image\" "
                         "of type {\"public.png\", \"public.jpeg\", \"public.image\"}' "
                         "-e 'POSIX path of theFile' "
                         "-e 'end tell' 2>/dev/null";
    
    std::array<char, 512> buffer;
    std::string result;
    
    FILE* pipe = popen(script.c_str(), "r");
    if (!pipe) return "";
    
    while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
        result += buffer.data();
    }
    pclose(pipe);
    
    while (!result.empty() && (result.back() == '\n' || result.back() == '\r')) {
        result.pop_back();
    }
    
    return result;
}

#endif // FILEDIALOG_H
