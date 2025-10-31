# 📚 Настройка GitHub репозитория

## 🚀 Пошаговая инструкция

### 1. Создайте репозиторий на GitHub

1. Перейдите на [github.com](https://github.com)
2. Нажмите **"New repository"** (зеленая кнопка)
3. Заполните данные:
   - **Repository name**: `telegram-lead-scanner` (или любое другое имя)
   - **Description**: `AI-powered Telegram channel scanner with Google Sheets integration`
   - **Visibility**: Public или Private (на ваш выбор)
   - ❌ **НЕ** ставьте галочки на:
     - Add a README file
     - Add .gitignore
     - Choose a license
4. Нажмите **"Create repository"**

### 2. Инициализируйте Git в проекте

Откройте терминал в корне проекта и выполните:

```bash
# Инициализация Git репозитория
git init

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit: Telegram Lead Scanner with AI integration"

# Установка основной ветки
git branch -M main
```

### 3. Подключите удаленный репозиторий

```bash
# Замените YOUR_USERNAME и YOUR_REPO на ваши данные
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Проверьте подключение
git remote -v
```

### 4. Загрузите код на GitHub

```bash
# Первая загрузка
git push -u origin main
```

### 5. Проверьте результат

1. Обновите страницу вашего репозитория на GitHub
2. Убедитесь что все файлы загружены
3. Проверьте что `.env` файлы НЕ загружены (они в .gitignore)

---

## 🔄 Команды для дальнейшей работы

### Добавление изменений
```bash
git add .
git commit -m "Описание изменений"
git push
```

### Проверка статуса
```bash
git status
```

### Просмотр истории
```bash
git log --oneline
```

---

## ⚠️ Важные замечания

1. **Никогда не коммитьте .env файлы** - они содержат секретные ключи
2. **Проверяйте .gitignore** - убедитесь что секретные файлы исключены
3. **Используйте осмысленные сообщения коммитов**
4. **Регулярно делайте push** - не накапливайте много изменений

---

## 🎯 Следующие шаги

После создания репозитория:

1. ✅ Код загружен на GitHub
2. 🚂 Переходите к деплою backend на Railway
3. 🌐 Затем деплой frontend на Vercel
4. ⚙️ Настройка переменных окружения
5. 🧪 Тестирование продакшен версии

**Готово!** Ваш код теперь на GitHub и готов к деплою! 🎉