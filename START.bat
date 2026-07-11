@echo off
title DataCube Tracker
cd /d "%~dp0"

REM ---------- Check Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install from https://nodejs.org
    pause
    exit /b 1
)

REM ---------- Check .env ----------
if not exist .env (
    echo [ERROR] .env file not found.
    echo Copy .env.example to .env and fill in your Supabase credentials.
    echo See DEPLOY.md for instructions.
    pause
    exit /b 1
)

REM ---------- First run: install dependencies ----------
if not exist node_modules (
    echo [1/2] Installing dependencies - first run only, please wait...
    call npm install
)

REM ---------- Clean .next to avoid OneDrive sync issues ----------
if exist .next rmdir /s /q .next

REM ---------- Open browser after server starts ----------
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"

echo [2/2] Starting DataCube Tracker ...
echo.
echo   Database: Supabase PostgreSQL (from .env)
echo   Browser will open at http://localhost:3000 automatically.
echo   To stop the server: press Ctrl+C or close this window.
echo.
call npm run dev
pause
