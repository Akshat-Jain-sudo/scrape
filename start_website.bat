@echo off
title FlipScrape Flipkart Product Scraper Dev Launcher
echo ==========================================================
echo       FLIPSCRAPE PRODUCT SCRAPER - DEVELOPMENT ENVIRONMENT
echo ==========================================================
echo.
echo Preparing to launch frontend and backend servers...
echo.

:: Check if node_modules exists, if not run installation
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm run install:all
) else (
    if not exist "client\node_modules" (
        echo [INFO] client node_modules not found. Installing dependencies...
        call npm run install:all
    ) else (
        if not exist "server\node_modules" (
            echo [INFO] server node_modules not found. Installing dependencies...
            call npm run install:all
        )
    )
)

echo.
echo [SUCCESS] Dependencies verified.
echo [INFO] Starting servers and launching default browser...
echo [INFO] Press Ctrl+C in this window to stop the servers.
echo.

:: Wait 3 seconds and launch the browser at http://localhost:5173
start /b "" cmd /c "timeout /t 3 >nul && start http://localhost:5173"

:: Start the servers
npm run dev

pause
