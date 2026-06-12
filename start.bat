@echo off
title Gifts Market — Запуск системи
cd /d "%~dp0"

echo ====================================
echo   Gifts Market Backend Starting...
echo ====================================

:: Запуск бекенду в окремому вікні
start "Backend" cmd /k "cd /d %~dp0 && uvicorn app.main:app --reload"

:: Чекаємо 3 секунди щоб бекенд встиг запуститись
timeout /t 3 /nobreak >nul

:: Запуск ngrok в окремому вікні
start "ngrok" cmd /k "cd /d %~dp0 && ngrok.exe http 8000"

:: Чекаємо 4 секунди щоб ngrok встиг підключитись
timeout /t 4 /nobreak >nul

:: Реєстрація webhook (один раз)
echo Реєструємо Telegram webhook...
python bot.py

echo.
echo ====================================
echo   Система запущена!
echo   Напишіть /start боту в Telegram
echo ====================================
pause
