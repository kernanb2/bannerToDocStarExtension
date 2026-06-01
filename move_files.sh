#!/bin/bash

# Make this script executable (in case it was downloaded without execute permission)
chmod +x "$0"

echo ""
echo "========================================"
echo "  Banner to DocStar Extension"
echo "  File Mover"
echo "========================================"
echo ""
echo "This will move the extension files to:"
echo "~/BannerExtension"
echo ""
read -p "Press Enter to continue..."

# Create destination directory
mkdir -p ~/BannerExtension

# Get the directory where this script is located
SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Move files
echo ""
echo "Moving files..."
mv "$SOURCE_DIR/manifest.json" ~/BannerExtension/ 2>/dev/null
mv "$SOURCE_DIR/background.js" ~/BannerExtension/ 2>/dev/null
mv "$SOURCE_DIR/content.js" ~/BannerExtension/ 2>/dev/null
mv "$SOURCE_DIR/popup.html" ~/BannerExtension/ 2>/dev/null
mv "$SOURCE_DIR/popup.js" ~/BannerExtension/ 2>/dev/null
mv "$SOURCE_DIR/icon16.png" ~/BannerExtension/ 2>/dev/null
mv "$SOURCE_DIR/icon48.png" ~/BannerExtension/ 2>/dev/null
mv "$SOURCE_DIR/icon128.png" ~/BannerExtension/ 2>/dev/null

echo "Done!"
echo ""
echo "Files moved to ~/BannerExtension"
echo ""
echo "You can now close this window and return"
echo "to the installation instructions webpage."
echo ""
read -p "Press Enter to exit..."
