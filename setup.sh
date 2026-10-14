#!/usr/bin/env bash
# ==============================================================================
# Request Flow Visualizer - One-Click Automated Setup Script
# ==============================================================================
set -e

# Terminal Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "===================================================================="
echo "   🚀 Request Flow Visualizer: One-Click Environment Setup          "
echo "   Distributed Systems & Real-time Request Flow Testing Platform    "
echo "===================================================================="
echo -e "${NC}"

# 1. Check Node.js and npm
echo -e "${BLUE}[1/5] Checking environment prerequisites...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed.${NC}"
    echo "Please install Node.js (v18 or higher) from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Found Node.js: ${NODE_VERSION}${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed.${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ Found npm: v${NPM_VERSION}${NC}"

# 2. Install Root Dependencies
echo -e "\n${BLUE}[2/5] Installing root workspace dependencies...${NC}"
npm install

# 3. Install Backend Dependencies
echo -e "\n${BLUE}[3/5] Installing backend dependencies...${NC}"
npm --prefix backend install

# 4. Install Frontend Dependencies
echo -e "\n${BLUE}[4/5] Installing frontend dependencies...${NC}"
npm --prefix frontend install

# 5. Build and Verify Projects
echo -e "\n${BLUE}[5/5] Compiling and verifying TypeScript builds...${NC}"
npm run build:backend
npm run build:frontend

echo -e "\n${GREEN}===================================================================="
echo "   ✨ Setup completed successfully! All dependencies verified.       "
echo "===================================================================="
echo -e "${NC}"
echo -e "To start the application, run:"
echo -e "   ${CYAN}npm run dev${NC}\n"
echo -e "Then open in your browser:"
echo -e "   🌐 Visualizer Dashboard: ${YELLOW}http://localhost:3000${NC}"
echo -e "   🔌 Backend API & WS:     ${YELLOW}http://localhost:4000${NC}\n"
echo -e "Optional full container stack with PostgreSQL, Redis & MinIO:"
echo -e "   ${CYAN}docker compose up --build${NC}\n"
