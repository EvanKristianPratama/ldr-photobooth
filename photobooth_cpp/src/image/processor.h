#ifndef PROCESSOR_H
#define PROCESSOR_H

#include "common.h"
#include <string>
#include <vector>

class ImageProcessor {
public:
    // Assembles captured photo matrices into a high-resolution, pixel-perfect Swiss grid strip,
    // draws minimalist margins and borders, writes typography labels, exports as PNG,
    // and returns the absolute file path.
    static std::string CompileAndSave(
        const std::vector<CapturedPhoto>& photos,
        const LayoutOption& layout,
        const FrameOption& frame,
        const std::string& timestamp,
        const std::string& receiptTitle = "LDR THERMAL BOOTH",
        const std::string& receiptSubtitle = "STORE #9821 // ZURICH CO-OP STUDIO",
        const std::string& receiptSlogan = "THANK YOU FOR YOUR VISIT!"
    );
};

#endif // PROCESSOR_H
