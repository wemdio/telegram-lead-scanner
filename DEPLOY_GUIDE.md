# 🚀 Пошаговая инструкция деплоя

## Frontend на Vercel + Backend на Railway

---

## 📋 Подготовка

### 1. Создайте GitHub репозиторий
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## 🚂 Деплой Backend на Railway

### 1. Регистрация на Railway
- Перейдите на [railway.app](https://railway.app)
- Войдите через GitHub аккаунт
- Получите $5 бесплатных кредитов

### 2. Создание проекта
1. Нажмите **"New Project"**
2. Выберите **"Deploy from GitHub repo"**
3. Выберите ваш репозиторий
4. Railway автоматически определит Node.js проект

### 3. Настройка переменных окружения
В разделе **Variables** добавьте:

```env
# Основные настройки
NODE_ENV=production
PORT=3001

# Telegram API (получите на my.telegram.org)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_session_string

# Google Sheets API (JSON строка)
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}

# Безопасность
JWT_SECRET=your_super_secure_jwt_secret_min_32_chars
CORS_ORIGIN=https://your-vercel-app.vercel.app

# Ограничения
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Логирование
LOG_LEVEL=info
```

### 4. Настройка деплоя
1. В **Settings** → **Deploy**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

2. Нажмите **"Deploy"**

### 5. Получение URL
- После деплоя скопируйте URL (например: `https://your-app.railway.app`)
- Этот URL понадобится для настройки frontend

---

## 🌐 Деплой Frontend на Vercel

### 1. Регистрация на Vercel
- Перейдите на [vercel.com](https://vercel.com)
- Войдите через GitHub аккаунт

### 2. Создание проекта
1. Нажмите **"New Project"**
2. Выберите ваш GitHub репозиторий
3. Настройте проект:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (корень проекта)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3. Настройка переменных окружения
В **Settings** → **Environment Variables** добавьте:

```env
NODE_ENV=production
VITE_API_URL=https://your-railway-app.railway.app
```

### 4. Деплой
1. Нажмите **"Deploy"**
2. Дождитесь завершения сборки
3. Получите URL вашего приложения

---

## 🔧 Финальная настройка

### 1. Обновите CORS в backend
В Railway обновите переменную:
```env
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

### 2. Проверьте работу
1. Откройте ваше Vercel приложение
2. Проверьте что API запросы работают
3. Протестируйте основную функциональность

---

## 📝 Автоматические деплои

### Railway
- Автоматически деплоит при push в `main` ветку
- Следит за изменениями в папке `backend/`

### Vercel
- Автоматически деплоит при push в `main` ветку
- Следит за изменениями в корне проекта

---

## 🐛 Troubleshooting

### Backend не запускается
1. Проверьте логи в Railway Dashboard
2. Убедитесь что все переменные окружения заданы
3. Проверьте что `package.json` содержит правильные скрипты

### Frontend не подключается к API
1. Проверьте `VITE_API_URL` в Vercel
2. Убедитесь что CORS настроен правильно
3. Проверьте что Railway приложение запущено

### Telegram клиент не работает
1. Проверьте `TELEGRAM_API_ID` и `TELEGRAM_API_HASH`
2. Убедитесь что `TELEGRAM_SESSION_STRING` корректный
3. Проверьте логи Railway на ошибки авторизации

---

## 💰 Лимиты бесплатных планов

### Railway
- $5 кредитов в месяц
- ~500 часов работы небольшого приложения
- Автоматическое отключение при исчерпании кредитов

### Vercel
- 100GB bandwidth в месяц
- 6000 минут сборки в месяц
- Неограниченные деплои

---

## ✅ Чеклист деплоя

- [ ] Код загружен в GitHub
- [ ] Backend развернут на Railway
- [ ] Переменные окружения настроены в Railway
- [ ] Frontend развернут на Vercel
- [ ] VITE_API_URL настроен в Vercel
- [ ] CORS_ORIGIN обновлен в Railway
- [ ] Приложение работает и API отвечает
- [ ] Telegram клиент подключается
- [ ] Google Sheets интеграция работает

🎉 **Готово! Ваше приложение развернуто в продакшене!**