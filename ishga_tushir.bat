@echo off
title TURNIKET Bot
color 0A

echo ============================================
echo    TURNIKET Bot - O'rnatish va Ishga tushirish
echo ============================================
echo.

:: Python borligini tekshirish
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python topilmadi. Yuklab olinmoqda...
    echo.
    curl -o python_installer.exe https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe
    echo [*] Python o'rnatilmoqda... Iltimos kuting...
    python_installer.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    del python_installer.exe
    echo [OK] Python o'rnatildi!
    echo.
) else (
    echo [OK] Python mavjud
)

:: Kutubxonalarni o'rnatish
echo [*] Kutubxonalar o'rnatilmoqda...
pip install requests pyTelegramBotAPI --quiet
echo [OK] Kutubxonalar tayyor!
echo.

:: Botni ishga tushirish
echo [*] Bot ishga tushirilmoqda...
echo [*] To'xtatish uchun: Ctrl+C
echo.
python hikvision_bot.py

pause
