@echo off
REM Лаунчер для start.ps1 — запускает PowerShell в обход execution policy,
REM чтобы скрипт работал двойным кликом. Аналог ./start.sh под Windows.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
pause
