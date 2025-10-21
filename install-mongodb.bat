@echo off
echo ========================================
echo MongoDB Installation Helper
echo ========================================
echo.
echo This script will help you install MongoDB locally.
echo.
echo Choose an option:
echo 1. Install MongoDB Community Server (Recommended)
echo 2. Install MongoDB using Chocolatey (if you have Chocolatey)
echo 3. Use Docker to run MongoDB
echo 4. Skip MongoDB installation (API will work but without database features)
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto install_community
if "%choice%"=="2" goto install_chocolatey
if "%choice%"=="3" goto install_docker
if "%choice%"=="4" goto skip_install
goto invalid_choice

:install_community
echo.
echo Installing MongoDB Community Server...
echo Please download MongoDB Community Server from:
echo https://www.mongodb.com/try/download/community
echo.
echo After installation, start MongoDB service:
echo net start MongoDB
echo.
pause
goto end

:install_chocolatey
echo.
echo Installing MongoDB using Chocolatey...
choco install mongodb
echo.
echo Starting MongoDB service...
net start MongoDB
goto end

:install_docker
echo.
echo Installing MongoDB using Docker...
echo.
echo First, make sure Docker is installed and running.
echo Then run this command:
echo docker run -d -p 27017:27017 --name mongodb mongo:latest
echo.
echo To start MongoDB container later:
echo docker start mongodb
echo.
pause
goto end

:skip_install
echo.
echo Skipping MongoDB installation.
echo The API will start but database features will be unavailable.
echo You can install MongoDB later and restart the API.
goto end

:invalid_choice
echo.
echo Invalid choice. Please run the script again.
goto end

:end
echo.
echo Installation helper completed.
pause
