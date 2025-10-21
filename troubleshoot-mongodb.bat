@echo off
echo ========================================
echo MongoDB Connection Troubleshooter
echo ========================================
echo.
echo This script will help diagnose MongoDB connection issues.
echo.

echo 1. Checking if MongoDB service is running...
sc query MongoDB >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ MongoDB service is installed
    sc query MongoDB | findstr "RUNNING" >nul
    if %errorlevel% == 0 (
        echo ✅ MongoDB service is RUNNING
    ) else (
        echo ❌ MongoDB service is NOT running
        echo.
        echo Starting MongoDB service...
        net start MongoDB
        if %errorlevel% == 0 (
            echo ✅ MongoDB service started successfully
        ) else (
            echo ❌ Failed to start MongoDB service
            echo You may need to run as Administrator
        )
    )
) else (
    echo ❌ MongoDB service is not installed
    echo.
    echo Please install MongoDB Community Server from:
    echo https://www.mongodb.com/try/download/community
    echo.
    pause
    goto end
)

echo.
echo 2. Testing MongoDB connection...
echo Trying to connect to mongodb://localhost:27017
mongosh --eval "db.runCommand('ping')" --quiet >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ MongoDB connection successful
) else (
    echo ❌ MongoDB connection failed
    echo.
    echo 3. Checking alternative ports...
    echo Testing port 27018...
    mongosh --port 27018 --eval "db.runCommand('ping')" --quiet >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ MongoDB found on port 27018
        echo Update your connection string to: mongodb://localhost:27018
    ) else (
        echo ❌ MongoDB not found on port 27018
    )
    
    echo Testing port 27019...
    mongosh --port 27019 --eval "db.runCommand('ping')" --quiet >nul 2>&1
    if %errorlevel% == 0 (
        echo ✅ MongoDB found on port 27019
        echo Update your connection string to: mongodb://localhost:27019
    ) else (
        echo ❌ MongoDB not found on port 27019
    )
)

echo.
echo 4. Checking MongoDB processes...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe" >nul
if %errorlevel% == 0 (
    echo ✅ MongoDB process (mongod.exe) is running
    tasklist /FI "IMAGENAME eq mongod.exe"
) else (
    echo ❌ MongoDB process (mongod.exe) is not running
)

echo.
echo 5. Checking Windows Firewall...
netsh advfirewall firewall show rule name="MongoDB" >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ MongoDB firewall rule exists
) else (
    echo ⚠️ MongoDB firewall rule not found
    echo You may need to add a firewall exception for port 27017
)

echo.
echo ========================================
echo Troubleshooting Complete
echo ========================================
echo.
echo If MongoDB is running but connection fails:
echo 1. Check if MongoDB is running on a different port
echo 2. Verify Windows Firewall settings
echo 3. Try connecting with MongoDB Compass first
echo 4. Check MongoDB logs for errors
echo.
pause

:end
