@echo off
echo Starting OneUp Dashboard Services...
echo.

echo Starting Backend API...
start "OneUp Dashboard API" cmd /k "cd /d OneUpDashboard.Api && dotnet run"

echo Starting Frontend...
start "OneUp Dashboard Frontend" cmd /k "cd /d oneup-dashboard-frontend && npm run dev"

echo.
echo Both services are starting...
echo Backend will be available at: https://localhost:7000
echo Frontend will be available at: http://localhost:5173
echo.
echo Click any key to close this window...
pause
