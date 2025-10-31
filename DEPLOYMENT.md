# 🚀 Инструкции по деплою Telegram Scanner

Это руководство поможет вам развернуть приложение Telegram Scanner в продакшн среде с использованием Docker.

## 📋 Предварительные требования

### Системные требования
- Docker 20.10+
- Docker Compose 2.0+
- Минимум 2GB RAM
- Минимум 10GB свободного места на диске

### API ключи и настройки
1. **Telegram API**:
   - Получите `api_id` и `api_hash` на https://my.telegram.org
   - Создайте сессию для бота (строка сессии)

2. **Google Sheets API**:
   - Создайте проект в Google Cloud Console
   - Включите Google Sheets API
   - Создайте Service Account и скачайте JSON файл с ключами

## 🔧 Настройка переменных окружения

1. Скопируйте файл с примером переменных:
```bash
cp .env.production .env
```

2. Отредактируйте `.env` файл и заполните все необходимые переменные:

```bash
# Обязательные переменные
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
TELEGRAM_SESSION_STRING=your_session_string_here
GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account",...}'
JWT_SECRET=your_super_secure_jwt_secret_here_min_32_chars
CORS_ORIGIN=https://yourdomain.com
```

⚠️ **ВАЖНО**: Никогда не коммитьте файл `.env` с реальными ключами в репозиторий!

## 🚀 Быстрый деплой

### Автоматический деплой (рекомендуется)

```bash
# Сделайте скрипты исполняемыми (Linux/macOS)
chmod +x scripts/*.sh

# Запустите деплой
./scripts/deploy.sh
```

### Ручной деплой

```bash
# 1. Остановите существующие контейнеры
docker-compose down --remove-orphans

# 2. Соберите и запустите контейнеры
docker-compose up -d --build

# 3. Проверьте статус
docker-compose ps
```

## 📊 Управление приложением

### Основные команды

```bash
# Запуск приложения
./scripts/deploy.sh

# Остановка приложения
./scripts/stop.sh

# Перезапуск приложения
./scripts/restart.sh

# Просмотр логов
./scripts/logs.sh

# Просмотр логов конкретного сервиса
./scripts/logs.sh backend
./scripts/logs.sh frontend
```

### Docker Compose команды

```bash
# Просмотр статуса контейнеров
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Перезапуск конкретного сервиса
docker-compose restart backend

# Обновление образов
docker-compose pull
docker-compose up -d
```

## 🔍 Проверка работоспособности

После деплоя проверьте:

1. **Фронтенд**: http://localhost (или ваш домен)
2. **Бэкенд API**: http://localhost/api/health
3. **Статус контейнеров**: `docker-compose ps`

### Проверка здоровья сервисов

```bash
# Проверка фронтенда
curl -f http://localhost

# Проверка бэкенда
curl -f http://localhost/api/health

# Проверка статуса Docker контейнеров
docker-compose ps
```

## 🛠️ Устранение неполадок

### Общие проблемы

1. **Контейнеры не запускаются**:
   ```bash
   # Проверьте логи
   docker-compose logs
   
   # Проверьте переменные окружения
   cat .env
   ```

2. **Ошибки API**:
   ```bash
   # Проверьте логи бэкенда
   docker-compose logs backend
   
   # Проверьте правильность API ключей
   ```

3. **Проблемы с сетью**:
   ```bash
   # Перезапустите Docker сеть
   docker-compose down
   docker network prune
   docker-compose up -d
   ```

### Очистка системы

```bash
# Остановка всех контейнеров
docker-compose down --remove-orphans

# Очистка неиспользуемых образов
docker system prune -f

# Полная очистка (ОСТОРОЖНО!)
docker system prune -a -f
```

## 🔒 Безопасность

### Рекомендации по безопасности

1. **Переменные окружения**:
   - Используйте сильные пароли и секретные ключи
   - Никогда не коммитьте `.env` файлы
   - Регулярно ротируйте API ключи

2. **Сеть**:
   - Используйте HTTPS в продакшн
   - Настройте firewall
   - Ограничьте доступ к портам

3. **Мониторинг**:
   - Регулярно проверяйте логи
   - Настройте алерты для ошибок
   - Мониторьте использование ресурсов

## 📈 Масштабирование

### Горизонтальное масштабирование

```yaml
# В docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
    # ...
```

### Вертикальное масштабирование

```yaml
# В docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
    # ...
```

## 🔄 Обновление приложения

```bash
# 1. Получите последние изменения
git pull origin main

# 2. Пересоберите и перезапустите
./scripts/deploy.sh
```

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи: `./scripts/logs.sh`
2. Убедитесь, что все переменные окружения настроены правильно
3. Проверьте статус контейнеров: `docker-compose ps`
4. Обратитесь к разделу "Устранение неполадок" выше

---

**Примечание**: Это руководство предполагает развертывание на одном сервере. Для кластерного развертывания рассмотрите использование Kubernetes или Docker Swarm.