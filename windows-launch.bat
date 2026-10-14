@echo off
REM ==============================================================================
REM Request Flow Visualizer - One-Click Launcher (Windows)
REM Double-click this file directly in File Explorer to start the application!
REM ==============================================================================

cd /d "%~dp0"

echo ====================================================================
echo    Request Flow Visualizer: Starting Application (Windows)
echo ====================================================================
echo.

REM 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js (v18 or higher) from https://nodejs.org/
    pause
    exit /b 1
)

REM 2. Run setup if dependencies missing
if not exist "node_modules" (
    echo [Setup] Installing workspace dependencies...
    call setup.bat
)
if not exist "backend\node_modules" (
    echo [Setup] Installing backend dependencies...
    call setup.bat
)
if not exist "frontend\node_modules" (
    echo [Setup] Installing frontend dependencies...
    call setup.bat
)

echo Starting backend (port 4000) and frontend (port 3000)...
echo Opening http://localhost:3000 in your browser...
echo.

REM 3. Open browser automatically
start http://localhost:3000

REM 4. Launch dev servers
call npm run dev
pause
