REM Check for administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Please run this script as Administrator
    pause
    exit /b 1
)

echo TPZ PostgreSQL 17 Installation Script for Windows
echo.
echo This script will guide you through PostgreSQL 17 installation on Windows.
echo.

REM Check if PostgreSQL is already installed
if exist "C:\Program Files\PostgreSQL\17" (
    echo PostgreSQL 17 appears to be already installed.
    echo Checking for existing installation...
    
    REM Try to connect to PostgreSQL
    psql --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo PostgreSQL is installed and psql is available in PATH.
        echo Proceeding with configuration...
        goto :config
    ) else (
        echo PostgreSQL is installed but psql is not in PATH.
        echo Will attempt to add it to PATH...
        goto :config
    )
)

echo PostgreSQL 17 is not installed. Please install PostgreSQL 17 manually:
echo.
echo 1. Download PostgreSQL 17 from: https://www.postgresql.org/download/windows/
echo 2. Run the installer as Administrator
echo 3. During installation:
echo    - Remember the password you set for the 'postgres' user
echo    - Keep the default port (5432)
echo    - Include the 'pgAdmin 4' and 'Stack Builder' components
echo    - Add PostgreSQL bin directory to PATH when prompted
echo 4. After installation, rerun this script
echo.
echo Note: TPZ requires PostgreSQL 17.5
echo.

set /p "continue=Press 'y' if you have completed the installation, or any other key to exit: "
if /i not "%continue%"=="y" (
    echo Installation cancelled.
    pause
    exit /b 0
)

REM Verify PostgreSQL installation
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo PostgreSQL installation verification failed.
    echo Please ensure PostgreSQL is properly installed and psql is in your PATH.
    pause
    exit /b 1
)

echo PostgreSQL installation verified successfully.

:config
REM Add PostgreSQL to PATH if not already present
echo.
echo Checking PATH environment variable...
set "PG_BIN_DIR=C:\Program Files\PostgreSQL\17\bin"

REM First check if the directory exists
if not exist "%PG_BIN_DIR%" (
    echo Error: PostgreSQL bin directory not found at %PG_BIN_DIR%
    pause
    exit /b 1
)

REM Check if PostgreSQL is already in PATH by trying to run psql
psql --version >nul 2>&1
if %errorlevel% equ 0 (
    echo PostgreSQL is already accessible in PATH.
) else (
    echo PostgreSQL is not in PATH. Adding it now...
    
    REM Use PowerShell to add to PATH more reliably
    echo Updating system PATH...
    powershell -Command "& {[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';%PG_BIN_DIR%', 'Machine')}" >nul 2>&1
    
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Could not add PostgreSQL to system PATH automatically.
        echo This script requires administrator privileges to modify system PATH.
        echo.
        echo Please add the following directory to your PATH manually:
        echo   %PG_BIN_DIR%
        echo.
        echo To add manually:
        echo 1. Right-click "This PC" and select "Properties"
        echo 2. Click "Advanced system settings"
        echo 3. Click "Environment Variables"
        echo 4. Under "System variables", select "Path" and click "Edit"
        echo 5. Click "New" and add: %PG_BIN_DIR%
        echo 6. Click OK to save all dialogs
        echo 7. Restart this command prompt and run this script again
        echo.
        pause
        exit /b 1
    ) else (
        echo PostgreSQL successfully added to system PATH.
        
        REM Also update current session PATH
        set "PATH=%PATH%;%PG_BIN_DIR%"
        
        echo.
        echo IMPORTANT: The PATH has been updated for future command prompts.
        echo For this session, PostgreSQL has been temporarily added to PATH.
        echo.
    )
)

REM Check if PostgreSQL service is running
sc query postgresql-x64-17 | find "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo PostgreSQL 17 service is not running. Please start it manually.
    pause
    exit /b 1
)

echo PostgreSQL service is running.

REM Run configuration script
call config_pg.bat
if %errorlevel% neq 0 (
    echo Configuration failed.
    exit /b 1
)

echo.
echo PostgreSQL installation and configuration completed successfully!
echo.
echo Next steps:
echo 1. Run setup_database.bat to create the TPZ database
echo 2. Use the createuser tool to create application users
echo.
pause