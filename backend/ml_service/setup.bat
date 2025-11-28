@echo off
echo Setting up Crop Health ML Service...
cd /d %~dp0

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

echo Creating virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Setup complete!
echo.
echo To start the ML service, run:
echo   start_ml_service.bat
echo.
echo Or manually:
echo   venv\Scripts\activate.bat
echo   python app.py
echo.
pause

