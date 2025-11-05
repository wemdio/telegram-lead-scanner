# 🚀 Инструкция по деплою исправленного фронтенда

## ✅ Что было исправлено:

1. **Импорт API URL** - исправлен в `scannerService.ts`
2. **Централизованная конфигурация API** - все сервисы используют `API_BASE_URL` из `src/config/api.ts`
3. **Проект успешно пересобран** - новые файлы в папке `dist/`

## 📋 Что нужно сделать:

### Шаг 1: Очистить кэш браузера

1. **Откройте файл** `clear-cache.html` в браузере или разместите его на сервере
2. **Нажмите** "Очистить всё"
3. **Перезагрузите** страницу (Ctrl+Shift+R)

**Или очистите вручную:**
- Откройте F12 → Console
- Выполните:
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

### Шаг 2: Задеплоить обновленный фронтенд на Timeweb

#### Вариант A: Через Git (рекомендуется)

1. **Закоммитить изменения:**
```bash
cd Telegram-Lead-Scanner-Dev-Version
git add .
git commit -m "fix: исправлен импорт API_BASE_URL, обновлена конфигурация"
git push origin main
```

2. **На Timeweb** зайдите в настройки приложения **Witty Umbriel**
3. Приложение автоматически пересоберется из Git

#### Вариант B: Загрузить dist/ напрямую

Если у вас **статический сайт**:

1. Зайдите в панель Timeweb Cloud
2. Откройте приложение **Witty Umbriel**
3. Загрузите содержимое папки `dist/` на сервер

### Шаг 3: Проверить работу

1. **Откройте фронтенд:** `https://wemdio-telegram-lead-scanner-7cd9.twc1.net`
2. **Откройте консоль** (F12) → Console
3. **Проверьте логи:**
   - Должен быть `🔧 Final API Configuration`
   - API_BASE_URL должен быть `https://wemdio-telegram-lead-scanner-backend-fd06.twc1.net/api`
   - Не должно быть ошибок 404 для `icon.svg1` или `favicon.ico1`

### Шаг 4: Протестировать API

1. **На странице очистки кэша** (`clear-cache.html`) нажмите "Тест API подключения"
2. Или выполните в консоли:
```javascript
fetch('https://wemdio-telegram-lead-scanner-backend-fd06.twc1.net/api/scanner/status')
  .then(r => r.json())
  .then(d => console.log('✅ API работает:', d))
  .catch(e => console.error('❌ API ошибка:', e))
```

## 🔧 Конфигурация API

Проверьте файл `src/config/api.ts`:

```typescript
// Строка 36-38
if (window.location.hostname.includes('twc1.net')) {
  console.log('🔧 Production on Timeweb Cloud - using direct backend URL');
  return 'https://wemdio-telegram-lead-scanner-backend-fd06.twc1.net/api';
}
```

## 📊 Структура проекта после сборки

```
dist/
├── index.html (обновлен)
├── assets/
│   ├── index-XukNiOEA.js (новый, 1MB)
│   └── index-C7B3KzIX.css (62KB)
├── favicon.ico
├── icon.svg
└── _redirects
```

## 🐛 Решение проблем

### Проблема: Все еще 404 ошибки

**Решение:**
1. Очистите кэш браузера **принудительно** (Ctrl+Shift+Delete)
2. Проверьте, что новая версия задеплоена
3. Попробуйте открыть в режиме инкогнито

### Проблема: API не работает

**Решение:**
1. Проверьте, что бэкенд запущен: `https://wemdio-telegram-lead-scanner-backend-fd06.twc1.net/api/scanner/status`
2. Проверьте CORS настройки бэкенда
3. Проверьте логи бэкенда на Timeweb

### Проблема: Опечатка "aamdin" все еще видна

**Решение:**
- Это из **localStorage**
- Выполните: `localStorage.clear()` в консоли
- Или используйте `clear-cache.html`

## 📝 Файлы изменены:

1. ✅ `services/scannerService.ts` - исправлен импорт API_BASE_URL
2. ✅ `src/config/api.ts` - централизованная конфигурация (уже была правильной)
3. ✅ `clear-cache.html` - новый инструмент для очистки кэша
4. ✅ `dist/*` - пересобранный проект

## 🎯 Следующие шаги:

1. ✅ Задеплоить обновленный код
2. ✅ Очистить кэш браузера
3. ✅ Протестировать API подключение
4. ✅ Проверить, что ошибки исчезли

---

**Успехов с деплоем! 🚀**

