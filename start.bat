@echo off
title Gifts Market — Запуск системи
cd /d "%~dp0"
chcp 65001 >nul

echo ====================================================
echo   Gifts Market — Backend Launcher
echo ====================================================
echo.

:: ── 1. Перехід до папки backend ──────────────────────
cd /d "%~dp0backend"

:: ── 2. Перевірка / копіювання .env ───────────────────
if not exist ".env" (
    if exist ".env.example" (
        echo [SETUP] .env не знайдено — копіюємо з .env.example
        copy ".env.example" ".env" >nul
        echo [SETUP] Відредагуйте backend\.env перед запуском у production!
        echo.
    ) else (
        echo [WARN]  .env.example теж відсутній. Продовжуємо без .env...
        echo.
    )
)

:: ── 3. Встановлення залежностей ──────────────────────
echo [PIP]  Перевірка та встановлення залежностей...
python -m pip install -q -r requirements.txt
if errorlevel 1 (
    echo [ERR]  pip install завершився з помилкою.
    pause
    exit /b 1
)
echo [PIP]  OK
echo.

:: ── 4. Запуск бекенду в окремому вікні ───────────────
echo [START] Запускаємо FastAPI бекенд (порт 8000)...
start "Backend — uvicorn" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

:: ── 5. Запуск ngrok в окремому вікні (якщо є) ────────
where ngrok >nul 2>&1
if not errorlevel 1 (
    echo [START] Запускаємо ngrok...
    start "ngrok — tunnel" cmd /k "ngrok http 8000"
    timeout /t 4 /nobreak >nul
) else (
    echo [SKIP]  ngrok не знайдено в PATH — тунель не запущено.
    echo         Завантажте: https://ngrok.com/download
    echo.
)

:: ── 6. Реєстрація webhook (опційно, якщо є bot.py) ───
cd /d "%~dp0"
if exist "bot.py" (
    echo [BOT]  Реєструємо Telegram webhook...
    python bot.py
)

echo.
echo ====================================================
echo   Система запущена!
echo   Бекенд:  http://localhost:8000
echo   Docs:    http://localhost:8000/docs
echo   Напишіть /start боту в Telegram
echo ====================================================
echo.
pause
