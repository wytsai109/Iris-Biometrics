@echo off
title Iris Recognition System (Pure JS)
cd /d "%~dp0"

echo ===================================================
echo   IRIS BIOMETRICS OS (Pure JavaScript)
echo   Daugman 6-Gabor Wavelet and Correlation Engine
echo ===================================================
echo.
echo Starting local web server on port 8081...

if exist "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" (
    start "" "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" http://localhost:8081
) else (
    start http://localhost:8081
)

python -m http.server 8081
if %ERRORLEVEL% NEQ 0 (
    echo Python not found, trying npx serve...
    npx -y serve -l 8081 .
)
pause
