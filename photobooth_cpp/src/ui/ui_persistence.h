#ifndef UI_PERSISTENCE_H
#define UI_PERSISTENCE_H

#include "common.h"
#include <string>
#include <vector>

// Shared persistence functions
Color HexToColor(const std::string& hex);
void SaveFramesToDisk(const std::vector<FrameOption>& frames);
void SaveLayoutsToDisk(const std::vector<LayoutOption>& layouts);

#endif // UI_PERSISTENCE_H
