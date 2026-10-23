@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul || (echo Установи Python с https://python.org ^(галочка "Add to PATH"^) & pause & exit /b)
python -m pip install -q -r requirements.txt
python server.py
pause
