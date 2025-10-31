#!/bin/bash

# Скрипт для сборки продакшн версии
set -e

echo "🚀 Начинаем сборку продакшн версии..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Переходим в корневую директорию проекта
cd "$(dirname "$0")/.."

# Проверяем наличие .env.production
if [ ! -f ".env.production" ]; then
    echo "❌ Файл .env.production не найден. Создайте его на основе .env.production.example"
    exit 1
fi

# Копируем переменные окружения
cp .env.production .env

echo "📦 Собираем Docker образы..."

# Собираем образы
docker-compose build --no-cache

echo "🧪 Проверяем образы..."

# Проверяем, что образы собрались успешно
if docker images | grep -q "telegram-scanner"; then
    echo "✅ Образы собраны успешно!"
else
    echo "❌ Ошибка при сборке образов"
    exit 1
fi

echo "🎉 Сборка завершена успешно!"
echo "📋 Для запуска используйте: ./scripts/deploy.sh"
echo "📋 Для остановки используйте: ./scripts/stop.sh"