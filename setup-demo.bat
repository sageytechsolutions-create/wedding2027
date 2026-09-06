@echo off
REM Wedding2027 Demo Setup Script for Windows
REM Run this on your local machine to set up the demo environment
REM Usage: setup-demo.bat

setlocal enabledelayedexpansion

echo.
echo 🚀 Wedding2027 Demo Setup
echo =========================
echo.

REM Check for Docker or Podman
where docker >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set CONTAINER_CMD=docker
    set COMPOSE_CMD=docker compose
    echo ✓ Docker found
) else (
    where podman >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        set CONTAINER_CMD=podman
        set COMPOSE_CMD=podman-compose
        echo ✓ Podman found
    ) else (
        echo ❌ Error: Docker or Podman not found
        echo Please install Docker Desktop or Podman first
        pause
        exit /b 1
    )
)

REM Check if in correct directory
if not exist "docker-compose.staging.yml" (
    echo ❌ Error: docker-compose.staging.yml not found
    echo Make sure you're in the wedding2027 directory
    pause
    exit /b 1
)

echo ✓ Project directory verified
echo.

REM Step 1: Stop any existing services
echo 🛑 Stopping any existing services...
%COMPOSE_CMD% -f docker-compose.staging.yml down >nul 2>&1
echo ✓ Ready for fresh start
echo.

REM Step 2: Start services
echo 🚀 Starting services...
%COMPOSE_CMD% -f docker-compose.staging.yml up -d
echo ⏳ Waiting for services to start (30 seconds)...
timeout /t 30 /nobreak

REM Step 3: Verify services
echo.
echo ✅ Checking service status...
echo Services should be running now (checking in background)
echo.

REM Step 4: Create demo accounts
echo 👤 Creating demo accounts...

echo   Creating demo@wedding2027.app...
curl -s -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{ \"email\": \"demo@wedding2027.app\", \"password\": \"Demo123!\", \"name\": \"Demo Client\" }" >nul 2>&1
echo   ✓ Account 1 created

echo   Creating investor@wedding2027.app...
curl -s -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{ \"email\": \"investor@wedding2027.app\", \"password\": \"Demo123!\", \"name\": \"Sample Investor\" }" >nul 2>&1
echo   ✓ Account 2 created

echo   Creating portfolio@wedding2027.app...
curl -s -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{ \"email\": \"portfolio@wedding2027.app\", \"password\": \"Demo123!\", \"name\": \"Portfolio Manager\" }" >nul 2>&1
echo   ✓ Account 3 created

echo.
echo ════════════════════════════════════════
echo 🎉 DEMO SETUP COMPLETE!
echo ════════════════════════════════════════
echo.
echo 📱 Access the demo at: http://localhost:3001
echo.
echo 🔐 Login credentials:
echo   Email:    demo@wedding2027.app
echo   Password: Demo123!
echo.
echo 💡 Backup accounts:
echo   investor@wedding2027.app / Demo123!
echo   portfolio@wedding2027.app / Demo123!
echo.
echo 📋 Verify these pages load:
echo   ✓ Dashboard
echo   ✓ Properties (search ^& filter)
echo   ✓ Portfolio
echo   ✓ Transactions
echo   ✓ Analytics
echo.
echo 🚀 Ready to demo!
echo.
echo Tip: Run 'docker ps' to see all services running
echo.
pause
