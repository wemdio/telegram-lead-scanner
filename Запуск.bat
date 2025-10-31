@echo off
echo ========================================
echo   ЗАПУСК TELEGRAM LEAD SCANNER
echo ========================================
echo.
echo 🔍 Проверяю предыдущие экземпляры...

REM Закрываем все предыдущие экземпляры
taskkill /f /im "Telegram Lead Scanner.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Закрыл предыдущие экземпляры
    timeout /t 3 /nobreak >nul
) else (
    echo ℹ️ Предыдущих экземпляров не найдено
)

echo.
echo 🚀 Запускаю приложение...
echo Подождите, это может занять 10-30 секунд
echo.

cd /d "%~dp0"
"packaged-app\Telegram Lead Scanner-win32-x64\Telegram Lead Scanner.exe"

if %errorlevel% neq 0 (
    echo.
    echo ❌ ОШИБКА ЗАПУСКА!
    echo.
    echo Возможные причины:
    echo 1. Порт 3001 все еще занят
    echo 2. Отсутствуют необходимые файлы
    echo 3. Недостаточно прав доступа
    echo.
    echo Попробуйте:
    echo - Подождать 10 секунд и запустить снова
    echo - Перезагрузить компьютер
    echo - Запустить от имени администратора
    echo.
    pause
) else (
    echo.
    echo ✅ Приложение запущено успешно!
    echo Откройте браузер и перейдите по адресу:
    echo http://localhost:3001
    echo.
)