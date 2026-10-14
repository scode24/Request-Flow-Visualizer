#!/usr/bin/env bash
# ==============================================================================
# Request Flow Visualizer - One-Click Launcher (macOS)
# Double-click this file directly in macOS Finder to start the application!
# ==============================================================================

# Ensure working directory is always the project root
cd "$(dirname "$0")"

clear
echo "===================================================================="
echo "   🚀 Request Flow Visualizer: One-Click macOS Launcher            "
echo "   Distributed Systems & Real-time Request Flow Testing Platform    "
echo "===================================================================="
echo ""

# 1. Check Node.js prerequisite
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not found in your PATH."
    echo "Please install Node.js (v18 or higher) from https://nodejs.org/"
    echo ""
    read -p "Press [Enter] to exit..."
    exit 1
fi

# 2. Automatically perform first-time setup if dependencies are missing
if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    echo "📦 Missing dependencies detected. Running initial one-click setup..."
    echo ""
    chmod +x setup.sh 2>/dev/null || true
    ./setup.sh
    echo ""
fi

# 3. Automatically open browser once server is ready
(
  sleep 2
  open "http://localhost:3000" 2>/dev/null || true
) &

echo "✨ Starting backend (port 4000) and frontend (port 3000)..."
echo "🌐 Browser will open automatically at http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the servers anytime."
echo "--------------------------------------------------------------------"
echo ""

# 4. Launch concurrent dev servers
npm run dev
