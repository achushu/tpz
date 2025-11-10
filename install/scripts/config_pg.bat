@echo off
REM Windows batch equivalent of config_pg.sh

REM Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Please run this script as Administrator
    pause
    exit /b 1
)

echo Configuring PostgreSQL database

REM PostgreSQL on Windows typically installs to Program Files
set PG_DATA_DIR="C:\Program Files\PostgreSQL\17\data"
set PG_BIN_DIR="C:\Program Files\PostgreSQL\17\bin"

if not exist %PG_DATA_DIR% (
    echo PostgreSQL 17 data directory not found. Please verify PostgreSQL installation.
    echo Expected location:
    echo   C:\Program Files\PostgreSQL\17\data
    pause
    exit /b 1
)

REM Backup existing pg_hba.conf
copy %PG_DATA_DIR%\pg_hba.conf %PG_DATA_DIR%\pg_hba.conf.backup >nul
if %errorlevel% neq 0 (
    echo Warning: Could not backup pg_hba.conf
)

REM Append our configuration to pg_hba.conf
type ..\pg\pg_hba.conf >> %PG_DATA_DIR%\pg_hba.conf
if %errorlevel% neq 0 (
    echo Error appending to pg_hba.conf
    exit /b 1
)

REM Restart PostgreSQL service
echo Restarting PostgreSQL service...
net stop postgresql-x64-17 2>nul

REM Wait a moment for service to stop
timeout /t 2 /nobreak >nul

net start postgresql-x64-17 2>nul
if %errorlevel% neq 0 (
    echo Error starting PostgreSQL 17 service
    echo Please start the PostgreSQL service manually
    exit /b 1
)

echo PostgreSQL configuration completed successfully