#!/bin/bash

# Скрипт для деплоя продакшн версии
set -e

echo "🚀 Начинаем деплой продакшн версии..."

# Переходим в корневую директорию проекта
cd "$(dirname "$0")/.."

# Проверяем наличие .env.production
if [ ! -f ".env.production" ]; then
    echo "❌ Файл .env.production не найден. Создайте его на основе .env.production.example"
    exit 1
fi

# Копируем переменные окружения
cp .env.production .env

echo "🛑 Останавливаем существующие контейнеры..."
docker-compose down --remove-orphans

echo "🧹 Очищаем неиспользуемые образы..."
docker system prune -f

echo "📦 Собираем и запускаем контейнеры..."
docker-compose up -d --build

echo "⏳ Ждем запуска сервисов..."
sleep 30

echo "🔍 Проверяем статус сервисов..."
docker-compose ps

echo "🏥 Проверяем здоровье сервисов..."

# Проверяем бэкенд
echo "Проверяем бэкенд..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Бэкенд работает"
else
    echo "❌ Бэкенд не отвечает"
    echo "📋 Логи бэкенда:"
    docker-compose logs backend
    exit 1
fi

# Проверяем фронтенд
echo "Проверяем фронтенд..."
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Фронтенд работает"
else
    echo "❌ Фронтенд не отвечает"
    echo "📋 Логи фронтенда:"
    docker-compose logs frontend
    exit 1
fi

echo "🎉 Деплой завершен успешно!"
echo "🌐 Приложение доступно по адресу: http://localhost"
echo "📋 Для просмотра логов: docker-compose logs -f"
echo "📋 Для остановки: ./scripts/stop.sh"
echo "📋 Для перезапуска: ./scripts/restart.sh"