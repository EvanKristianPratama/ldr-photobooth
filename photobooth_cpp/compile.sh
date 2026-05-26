#!/bin/bash
set -e

# Visual colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== SWISS PHOTOBOOTH COMPILER & SETUP ===${NC}"

# Check for Brew
if [ ! -f "/opt/homebrew/bin/brew" ]; then
    echo -e "${RED}Homebrew not found in /opt/homebrew/bin/brew. Please install Homebrew to proceed.${NC}"
    exit 1
fi

# Check for Raylib
if ! /opt/homebrew/bin/brew list raylib &>/dev/null; then
    echo -e "${YELLOW}Raylib is not installed. Installing via Brew...${NC}"
    /opt/homebrew/bin/brew install raylib
else
    echo -e "${GREEN}✓ Raylib is already installed.${NC}"
fi

# Check for OpenCV
if ! /opt/homebrew/bin/brew list opencv &>/dev/null; then
    echo -e "${YELLOW}OpenCV is not installed. Installing via Brew (this may take a few minutes)...${NC}"
    /opt/homebrew/bin/brew install opencv
else
    echo -e "${GREEN}✓ OpenCV is already installed.${NC}"
fi

# Create Assets Directories
echo -e "${BLUE}Setting up assets and folders...${NC}"
mkdir -p assets/fonts
mkdir -p exports

# Download Fonts
FONT_REGULAR="assets/fonts/Outfit-Regular.ttf"
FONT_BOLD="assets/fonts/Outfit-Bold.ttf"

if [ ! -f "$FONT_REGULAR" ]; then
    echo -e "${YELLOW}Downloading Outfit Regular font...${NC}"
    curl -L -s -o "$FONT_REGULAR" "https://github.com/google/fonts/raw/main/ofl/outfit/static/Outfit-Regular.ttf"
fi

if [ ! -f "$FONT_BOLD" ]; then
    echo -e "${YELLOW}Downloading Outfit Bold font...${NC}"
    curl -L -s -o "$FONT_BOLD" "https://github.com/google/fonts/raw/main/ofl/outfit/static/Outfit-Bold.ttf"
fi
echo -e "${GREEN}✓ Fonts ready.${NC}"

# Compile
echo -e "${BLUE}Compiling C++ Swiss Photobooth application...${NC}"
make clean
make

echo -e "${GREEN}=== BUILD COMPLETED SUCCESSFULLY! ===${NC}"
echo -e "To run the application, type: ${YELLOW}./swiss_booth${NC}"
