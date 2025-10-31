#!/bin/bash
# Автоматическая сборка Electron приложения с зависимостями backend
# Bash скрипт для Linux/macOS

set -e  # Остановить выполнение при ошибке

echo "🚀 Начинаем автоматическую сборку Electron приложения..."

# 1. Установка зависимостей основного проекта
echo "📦 Установка зависимостей основного проекта..."
npm install

# 2. Установка зависимостей backend
echo "📦 Установка зависимостей backend..."
cd backend
npm install
cd ..

# 3. Сборка frontend
echo "🔨 Сборка frontend..."
npm run build

# 4. Сборка Electron приложения
echo "⚡ Сборка Electron приложения..."
npm run dist

echo "✅ Сборка завершена успешно!"
echo "📁 Готовое приложение находится в папке: electron-dist"
echo "🎉 Теперь приложение включает все необходимые зависимости!"

# Показать размер готового приложения
if [ -d "electron-dist" ]; then
    size=$(du -sh electron-dist | cut -f1)
    echo "📊 Размер приложения: $size"
fi

echo ""
echo "🔧 Для запуска приложения используйте:"
echo "   ./electron-dist/Telegram\ Lead\ Scanner-linux-x64/Telegram\ Lead\ Scanner  # Linux"
echo "   open electron-dist/Telegram\ Lead\ Scanner-darwin-x64/Telegram\ Lead\ Scanner.app  # macOS"