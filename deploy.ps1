# Скрипт для деплоя на Vercel
# Запуск: .\deploy.ps1

Write-Host "🚀 Начинаем деплой на Vercel..." -ForegroundColor Green

# Проверяем что Vercel CLI установлен
if (!(Get-Command "vercel" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI не найден. Устанавливаем..." -ForegroundColor Red
    npm install -g vercel
}

# Собираем проект
Write-Host "📦 Собираем проект..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка сборки проекта!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Проект успешно собран!" -ForegroundColor Green

# Деплоим на Vercel
Write-Host "🌐 Деплоим на Vercel..." -ForegroundColor Yellow
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Деплой завершен успешно!" -ForegroundColor Green
    Write-Host "📝 Не забудьте:" -ForegroundColor Cyan
    Write-Host "   1. Обновить CORS_ORIGIN в backend" -ForegroundColor White
    Write-Host "   2. Проверить API endpoints" -ForegroundColor White
    Write-Host "   3. Протестировать приложение" -ForegroundColor White
} else {
    Write-Host "❌ Ошибка деплоя!" -ForegroundColor Red
    exit 1
}