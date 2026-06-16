@echo off
chcp 65001 >nul
title Gifts Market — Backend

echo ====================================================
echo   Gifts Market — Backend Launcher
echo ====================================================
echo.

:: ── 1. .env ──────────────────────────────────────────
if not exist "F:\Нова папка (4)\backend\.env" (
    if exist "F:\Нова папка (4)\backend\.env.example" (
        echo [SETUP] Копіюємо .env.example -^> .env
        copy "F:\Нова папка (4)\backend\.env.example" "F:\Нова папка (4)\backend\.env" >nul
        echo [SETUP] Відредагуйте .env перед роботою!
        echo.
    )
)

:: ── 2. pip install ────────────────────────────────────
echo [PIP]  Встановлення залежностей...
python -m pip install -q -r "F:\Нова папка (4)\backend\requirements.txt"
if errorlevel 1 (
    echo [ERR]  pip install завершився з помилкою!
    pause
    exit /b 1
)
echo [PIP]  OK
echo.

:: ── 3. Backend ────────────────────────────────────────
echo [START] Запускаємо FastAPI на порту 8000...
start "Backend — uvicorn" cmd /k "cd /d "F:\Нова папка (4)\backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

:: ── 4. ngrok (якщо є) ────────────────────────────────
where ngrok >nul 2>&1
if not errorlevel 1 (
    echo [START] Запускаємо ngrok...
    start "ngrok" cmd /k "ngrok http 8000"
) else (
    echo [SKIP]  ngrok не знайдено — тунель не запущено.
)

echo.
echo ====================================================
echo   Бекенд:  http://localhost:8000
echo   Docs:    http://localhost:8000/docs
echo ====================================================
echo.
pause
