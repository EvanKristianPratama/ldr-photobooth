#!/bin/bash
# ----------------------------------------------------
# Script to build a native standalone macOS .app bundle
# ----------------------------------------------------

# Exit immediately if any command fails
set -e

echo "[Builder] Packaging STRIPS.app..."

# Clean up old builds
rm -rf SwissBooth.app

# 1. Setup paths
APP_NAME="STRIPS.app"
CONTENTS_DIR="$APP_NAME/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
FRAMEWORKS_DIR="$CONTENTS_DIR/Frameworks"

# 2. Recreate clean directory structure
rm -rf "$APP_NAME"
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"
mkdir -p "$FRAMEWORKS_DIR"

# 3. Compile the C++ photobooth app
echo "[Builder] Cleaning and compiling fresh executable..."
make clean
make

# 4. Copy binary and assets into app bundle
echo "[Builder] Copying files into bundle structure..."
cp swiss_booth "$MACOS_DIR/"
cp -R assets "$RESOURCES_DIR/"

# 5. Copy Shared Dynamic Libraries (.dylib) and transitively analyze for standalone portability
echo "[Builder] Packaging dynamic libraries (.dylib) for standalone portability..."

# Initial copy of direct dependencies
cp /opt/homebrew/opt/raylib/lib/libraylib.550.dylib "$FRAMEWORKS_DIR/"
cp /opt/homebrew/opt/opencv/lib/libopencv_core.413.dylib "$FRAMEWORKS_DIR/"
cp /opt/homebrew/opt/opencv/lib/libopencv_videoio.413.dylib "$FRAMEWORKS_DIR/"
cp /opt/homebrew/opt/opencv/lib/libopencv_imgproc.413.dylib "$FRAMEWORKS_DIR/"
cp /opt/homebrew/opt/opencv/lib/libopencv_imgcodecs.413.dylib "$FRAMEWORKS_DIR/"
cp /opt/homebrew/opt/opencv/lib/libopencv_objdetect.413.dylib "$FRAMEWORKS_DIR/"

# Recursively copy and relink all dependencies from Homebrew
declare -a queue
queue+=("$MACOS_DIR/swiss_booth")
for f in "$FRAMEWORKS_DIR"/*.dylib; do
    if [ -f "$f" ]; then
        queue+=("$f")
    fi
done

echo "[Builder] Starting recursive dependency analysis & relinking..."
i=0
while [ $i -lt ${#queue[@]} ]; do
    current="${queue[$i]}"
    
    # Get all dependencies that start with /opt/homebrew
    deps=$(otool -L "$current" | grep "/opt/homebrew" | awk '{print $1}')
    
    for dep in $deps; do
        if [[ "$dep" == /opt/homebrew* ]]; then
            real_dep=$(realpath "$dep" 2>/dev/null || readlink -f "$dep" 2>/dev/null || echo "$dep")
            basename=$(basename "$real_dep")
            target_path="$FRAMEWORKS_DIR/$basename"
            
            # Copy if it doesn't exist
            if [ ! -f "$target_path" ]; then
                cp "$real_dep" "$target_path"
                chmod 755 "$target_path"
                queue+=("$target_path")
            fi
            
            # Relink reference
            if [ "$current" = "$MACOS_DIR/swiss_booth" ]; then
                install_name_tool -change "$dep" "@executable_path/../Frameworks/$basename" "$current"
            else
                install_name_tool -change "$dep" "@loader_path/$basename" "$current"
            fi
        fi
    done
    
    # Set the library's internal install name ID to @loader_path/basename
    if [ "$current" != "$MACOS_DIR/swiss_booth" ]; then
        bname=$(basename "$current")
        install_name_tool -id "@loader_path/$bname" "$current"
    fi
    
    i=$((i+1))
done

echo "[Builder] Standalone dependency packaging completed. Total libraries: ${#queue[@]}"

# 8. Create dynamic high-resolution macOS .icns App Icon
echo "[Builder] Creating native macOS application icon (.icns)..."
if [ -f "assets/Ldr_photobooth.png" ]; then
    rm -rf STRIPS.iconset
    mkdir -p STRIPS.iconset
    
    # Generate multi-resolution icons using macOS 'sips' utility
    sips -z 16 16     assets/Ldr_photobooth.png --out STRIPS.iconset/icon_16x16.png > /dev/null 2>&1
    sips -z 32 32     assets/Ldr_photobooth.png --out STRIPS.iconset/icon_16x16@2x.png > /dev/null 2>&1
    sips -z 32 32     assets/Ldr_photobooth.png --out STRIPS.iconset/icon_32x32.png > /dev/null 2>&1
    sips -z 64 64     assets/Ldr_photobooth.png --out STRIPS.iconset/icon_32x32@2x.png > /dev/null 2>&1
    sips -z 128 128   assets/Ldr_photobooth.png --out STRIPS.iconset/icon_128x128.png > /dev/null 2>&1
    sips -z 256 256   assets/Ldr_photobooth.png --out STRIPS.iconset/icon_128x128@2x.png > /dev/null 2>&1
    sips -z 256 256   assets/Ldr_photobooth.png --out STRIPS.iconset/icon_256x256.png > /dev/null 2>&1
    sips -z 512 512   assets/Ldr_photobooth.png --out STRIPS.iconset/icon_256x256@2x.png > /dev/null 2>&1
    sips -z 512 512   assets/Ldr_photobooth.png --out STRIPS.iconset/icon_512x512.png > /dev/null 2>&1
    sips -z 1024 1024 assets/Ldr_photobooth.png --out STRIPS.iconset/icon_512x512@2x.png > /dev/null 2>&1
    
    # Compile into .icns file
    iconutil -c icns STRIPS.iconset
    cp STRIPS.icns "$RESOURCES_DIR/"
    rm -rf STRIPS.iconset STRIPS.icns
else
    echo "[Builder] WARNING: assets/Ldr_photobooth.png not found, skipping icon compilation."
fi

# 9. Create Info.plist inside bundle
echo "[Builder] Creating Info.plist config..."
cat <<EOF > "$CONTENTS_DIR/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIdentifier</key>
    <string>com.ldr.strips</string>
    <key>CFBundleName</key>
    <string>STRIPS</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleIconFile</key>
    <string>STRIPS.icns</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSCameraUsageDescription</key>
    <string>This app requires access to your camera to capture photobooth pictures.</string>
</dict>
</plist>
EOF

# 10. Create working-directory launcher script
echo "[Builder] Creating startup launcher wrapper..."
cat <<EOF > "$MACOS_DIR/launcher"
#!/bin/bash
# Get the folder containing this launcher script
DIR="\$(dirname "\$0")"

# Navigate to Resources where assets/ is located
cd "\$DIR/../Resources"

# Execute the compiled C++ binary
"../MacOS/swiss_booth"
EOF

# 11. Make scripts and binary executable
chmod +x "$MACOS_DIR/launcher"
chmod +x "$MACOS_DIR/swiss_booth"

# 12. Create a shareable zip file automatically!
echo "[Builder] Compressing to STRIPS_standalone.zip for easy sharing..."
rm -f STRIPS_standalone.zip
zip -q -r STRIPS_standalone.zip STRIPS.app

echo "[Builder] SUCCESS! $APP_NAME has been created successfully."
echo "[Builder] Portable archive saved as: STRIPS_standalone.zip"
echo "[Builder] You can send STRIPS_standalone.zip to your friends, and it will run instantly!"
