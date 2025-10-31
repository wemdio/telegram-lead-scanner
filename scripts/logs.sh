#!/bin/bash

# Скрипт для просмотра логов
set -e

echo "📋 Просмотр логов приложения"
echo "Нажмите Ctrl+C для выхода"
echo ""

# Переходим в корневую директорию проекта
cd "$(dirname "$0")/.."

# Показываем логи всех сервисов
if [ "$1" = "backend" ]; then
    echo "📋 Логи бэкенда:"
    docker-compose logs -f backend
elif [ "$1" = "frontend" ]; then
    echo "📋 Логи фронтенда:"
    docker-compose logs -f frontend
else
    echo "📋 Логи всех сервисов:"
    docker-compose logs -f
fi