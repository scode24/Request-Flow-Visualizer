@echo off
REM ==============================================================================
REM Request Flow Visualizer - One-Click Automated Setup Script (Windows)
REM ==============================================================================
echo ====================================================================
echo    Request Flow Visualizer: One-Click Environment Setup (Windows)
echo ====================================================================

echo [1/5] Checking environment prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js (v18 or higher) from https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not in PATH.
    pause
    exit /b 1
)

echo [2/5] Installing root workspace dependencies...
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo [3/5] Installing backend dependencies...
cd backend
call npm install
cd ..
if %errorlevel% neq 0 exit /b %errorlevel%

echo [4/5] Installing frontend dependencies...
cd frontend
call npm install
cd ..
if %errorlevel% neq 0 exit /b %errorlevel%

echo [5/5] Compiling and verifying TypeScript builds...
call npm run build:backend
call npm run build:frontend
if %errorlevel% neq 0 exit /b %errorlevel%

echo ====================================================================
echo    Setup completed successfully! Everything is ready to run.
echo ====================================================================
echo.
echo To start the application, run:
echo    npm run dev
echo.
echo Then open in your browser:
echo    Visualizer Dashboard: http://localhost:3000
echo    Backend API:         http://localhost:4000
echo.
pause
