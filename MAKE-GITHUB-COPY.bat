@echo off
title Make GitHub Copy
cd /d "%~dp0"

set DEST=..\datacube-tracker-GITHUB

echo Creating clean copy for GitHub upload...
echo (excluding .env, node_modules, database, uploads, logs)
echo.

robocopy "." "%DEST%" /E ^
  /XD node_modules .next .git "public\uploads" ^
  /XF .env dev.db dev.db-journal *.log *.tsbuildinfo next-env.d.ts MAKE-GITHUB-COPY.bat >nul

echo.
echo Done! Clean folder created at:
echo   %CD%\%DEST%
echo.
echo This folder is SAFE to upload to GitHub
echo (no passwords, no database, no user files inside)
echo.
start "" explorer "%DEST%"
pause
