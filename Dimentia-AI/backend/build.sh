#!/bin/bash
# Build script for Render deployment
# Installs Node.js and Python dependencies

set -e  # Exit on error

echo "🔧 Installing Node.js dependencies..."
npm install

echo "🐍 Installing Python dependencies..."
# Install Python packages from parent directory
pip3 install --upgrade pip
pip3 install -r ../requirements.txt

echo "✅ Build complete!"

