# 🖥️ Создание Desktop Приложения (Electron)

## Что уже готово

✅ **Все файлы настроены:**
- `main.js` - главный файл Electron приложения
- `package.json` - обновлен с зависимостями и скриптами
- `electron-builder.yml` - конфигурация сборки
- `public/icon.svg` - иконка приложения

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
# Установить все зависимости (включая Electron)
npm install
```

### 2. Сборка frontend (ОБЯЗАТЕЛЬНО!)

```bash
npm run build
```
⚠️ **Важно:** Без этого шага приложение покажет белый экран!

### 3. Запуск в режиме разработки

```bash
# Запустить приложение в режиме разработки
# (автоматически запустит Vite dev server и Electron)
npm run electron-dev
```

Если видите ошибку "address already in use", остановите другие процессы:
- Закройте браузер с localhost:3001
- Остановите `npm start` в backend папке
- Остановите `npm run dev` в основной папке

### 3. Сборка для продакшена

```bash
# Собрать приложение для текущей платформы
npm run dist

# Или для конкретной платформы:
npm run dist-win    # Windows
npm run dist-mac    # macOS
npm run dist-linux  # Linux
```

## 📁 Структура проекта

```
проект/
├── main.js                 # Главный процесс Electron
├── package.json           # Зависимости и скрипты
├── electron-builder.yml   # Конфигурация сборки
├── frontend/              # React приложение
├── backend/               # Node.js сервер
├── dist/                  # Собранный frontend
├── electron-dist/         # Готовые .exe/.dmg/.AppImage
└── public/
    └── icon.svg          # Иконка приложения
```

## 🔧 Как это работает

### В режиме разработки:
1. Запускается Vite dev server (frontend на порту 5173)
2. Запускается backend сервер (на порту 3001)
3. Electron загружает frontend с localhost:5173

### В продакшене:
1. Frontend собирается в папку `dist/`
2. Electron загружает статические файлы из `dist/`
3. Backend запускается автоматически внутри Electron
4. Все работает как единое приложение

## 📦 Результат сборки

После выполнения `npm run dist` в папке `electron-dist/` появятся:

**Windows:**
- `Telegram Lead Scanner Setup 1.0.0.exe` - установщик
- `Telegram Lead Scanner 1.0.0.exe` - портативная версия

**macOS:**
- `Telegram Lead Scanner-1.0.0.dmg` - образ диска

**Linux:**
- `Telegram Lead Scanner-1.0.0.AppImage` - портативное приложение

## ⚙️ Настройки

### Изменение иконки
Замените файлы в папке `public/`:
- `icon.svg` - для разработки
- `icon.ico` - для Windows
- `icon.icns` - для macOS
- `icon.png` - для Linux

### Изменение названия приложения
В `package.json` измените:
```json
{
  "name": "your-app-name",
  "build": {
    "productName": "Your App Name"
  }
}
```

## 🐛 Решение проблем

### Ошибка "electron not found"
```bash
npm install electron --save-dev
```

### Ошибка сборки
```bash
# Очистить кэш и переустановить
npm run clean
npm install
npm run dist
```

### Backend не запускается
Проверьте, что в `backend/` есть файл `server.js` и все зависимости установлены.

### Приложение не открывается
1. Проверьте антивирус (может блокировать .exe)
2. Запустите от имени администратора
3. Проверьте логи в консоли разработчика (F12)

## 🎯 Дополнительные возможности

### Автообновления
Добавьте в `main.js`:
```javascript
const { autoUpdater } = require('electron-updater');
autoUpdater.checkForUpdatesAndNotify();
```

### Системные уведомления
```javascript
const { Notification } = require('electron');
new Notification({ title: 'Заголовок', body: 'Текст' }).show();
```

### Меню в трее
```javascript
const { Tray, Menu } = require('electron');
const tray = new Tray('path/to/icon.png');
tray.setContextMenu(Menu.buildFromTemplate([...]));
```

## 📋 Чек-лист готовности

- [ ] Установлены зависимости (`npm install`)
- [ ] Приложение запускается в dev режиме (`npm run electron-dev`)
- [ ] Frontend собирается без ошибок (`npm run build`)
- [ ] Backend работает корректно
- [ ] Сборка создается успешно (`npm run dist`)
- [ ] .exe файл запускается и работает

## 🎉 Готово!

Теперь у вас есть полноценное desktop приложение, которое:
- Работает без браузера
- Включает frontend и backend
- Устанавливается как обычная программа
- Имеет иконку и меню
- Может быть распространено как .exe файл