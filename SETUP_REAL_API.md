# Настройка реальных API для Telegram Scanner

В настоящее время приложение использует mock (тестовые) данные, но может работать с реальными API Telegram и Google Sheets. Вот как настроить реальные API:

## 🔧 Настройка Telegram API

### 1. Получение API ключей
1. Перейдите на https://my.telegram.org/
2. Войдите в свой аккаунт Telegram
3. Перейдите в "API development tools"
4. Создайте новое приложение:
   - App title: "Telegram Scanner"
   - Short name: "tg-scanner"
   - URL: можно оставить пустым
   - Platform: "Desktop"
5. Скопируйте `api_id` и `api_hash`

### 2. Настройка переменных окружения
Откройте файл `backend/.env` и замените заглушки:

```env
# Telegram API Configuration
TELEGRAM_API_ID=your_actual_api_id_here
TELEGRAM_API_HASH=your_actual_api_hash_here
TELEGRAM_SESSION_STRING=  # Оставьте пустым для первого запуска
```

### 3. Первая авторизация
1. Запустите приложение
2. В интерфейсе перейдите в настройки Telegram
3. Введите ваши `api_id` и `api_hash`
4. Нажмите "Initialize" - вам придет SMS с кодом
5. Введите код подтверждения
6. Session string будет сохранен автоматически

## 📊 Настройка Google Sheets API

### 1. Создание проекта в Google Cloud
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google Sheets API:
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Google Sheets API"
   - Нажмите "Enable"

### 2. Создание Service Account
1. Перейдите в "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "Service Account"
3. Заполните информацию о сервисном аккаунте
4. Скачайте JSON файл с ключами

### 3. Настройка переменных окружения
Из скачанного JSON файла скопируйте данные в `backend/.env`:

```env
# Google Sheets API Configuration
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PROJECT_ID=your-project-id
```

### 4. Предоставление доступа к таблицам
Для каждой Google Sheets таблицы:
1. Откройте таблицу
2. Нажмите "Share"
3. Добавьте email вашего service account
4. Дайте права "Editor"

## 🚀 Как работает переключение между mock и реальными данными

Приложение автоматически определяет, какие данные использовать:

### Telegram:
- **Реальные данные**: Если в конфигурации указаны валидные `apiId`, `apiHash` и `sessionString`
- **Mock данные**: Если конфигурация отсутствует или подключение не удалось

### Google Sheets:
- **Реальные данные**: Если настроены переменные окружения для Google API
- **Mock данные**: Если переменные не настроены

## 🔍 Проверка статуса

В логах бэкенда вы увидите:
- `✅ Telegram client connected successfully` - реальный API работает
- `⚠️ Using mock data for chat X` - используются тестовые данные

## ⚠️ Важные замечания

1. **Безопасность**: Никогда не коммитьте реальные API ключи в git
2. **Лимиты**: Telegram API имеет ограничения на количество запросов
3. **Тестирование**: Рекомендуется сначала протестировать на тестовых чатах
4. **Backup**: Сделайте резервную копию важных данных перед началом сканирования

## 🐛 Устранение неполадок

### Ошибки Telegram API:
- `TIMEOUT`: Проверьте интернет-соединение
- `AUTH_KEY_INVALID`: Удалите session string и авторизуйтесь заново
- `FLOOD_WAIT`: Превышен лимит запросов, подождите

### Ошибки Google Sheets API:
- `403 Forbidden`: Проверьте права доступа к таблице
- `Invalid credentials`: Проверьте правильность private key и client email
- `Quota exceeded`: Превышен лимит API запросов

---

**Примечание**: Текущая версия приложения работает с mock данными для демонстрации функциональности. Следуйте этой инструкции для подключения реальных API.