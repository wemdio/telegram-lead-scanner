# Автоматическая сборка Electron приложения с зависимостями backend
# PowerShell скрипт для Windows

Write-Host "Начинаем автоматическую сборку Electron приложения..." -ForegroundColor Green

# 1. Установка зависимостей основного проекта
Write-Host "Установка зависимостей основного проекта..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка установки зависимостей основного проекта" -ForegroundColor Red
    exit 1
}

# 2. Установка зависимостей backend
Write-Host "Установка зависимостей backend..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка установки зависимостей backend" -ForegroundColor Red
    exit 1
}
Set-Location ..

# 3. Сборка frontend
Write-Host "Сборка frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка сборки frontend" -ForegroundColor Red
    exit 1
}

# 4. Очистка старой сборки
Write-Host "Очистка старой сборки..." -ForegroundColor Yellow
Remove-Item -Recurse -Force electron-dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force electron-dist-final -ErrorAction SilentlyContinue

# 5. Сборка Electron приложения
Write-Host "Сборка Electron приложения..." -ForegroundColor Yellow
npm run dist
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка сборки Electron приложения" -ForegroundColor Red
    exit 1
}

Write-Host "Сборка завершена успешно!" -ForegroundColor Green
Write-Host "Готовое приложение находится в папке: electron-dist" -ForegroundColor Cyan
Write-Host "Теперь приложение включает все необходимые зависимости!" -ForegroundColor Green

# Показать размер готового приложения
$appPath = "electron-dist/Telegram Lead Scanner-win32-x64"
if (Test-Path $appPath) {
    $sizeBytes = (Get-ChildItem $appPath -Recurse | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($sizeBytes / 1MB, 2)
    Write-Host "Размер приложения: $sizeMB MB" -ForegroundColor Cyan
}

Write-Host "Для запуска приложения используйте:" -ForegroundColor Yellow
Write-Host "./electron-dist/Telegram Lead Scanner-win32-x64/Telegram Lead Scanner.exe" -ForegroundColor White