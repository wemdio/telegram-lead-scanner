# 🖥️ Создание Desktop приложения

## Варианты создания локальной программы

---

## 🚀 Вариант 1: Electron (Рекомендуется)

### Преимущества:
- ✅ Кроссплатформенность (Windows, macOS, Linux)
- ✅ Полная интеграция frontend + backend
- ✅ Нативный вид приложения
- ✅ Автообновления
- ✅ Системные уведомления

### Установка и настройка:

```bash
# Установка Electron
npm install --save-dev electron electron-builder

# Установка дополнительных пакетов
npm install --save-dev concurrently wait-on cross-env
```

### Создание main.js (главный процесс Electron):

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let backendProcess;

// Запуск backend сервера
function startBackend() {
  const backendPath = path.join(__dirname, 'backend', 'server.js');
  backendProcess = spawn('node', [backendPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'public', 'icon.png')
  });

  // В разработке - подключаемся к dev серверу
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // В продакшене - загружаем собранные файлы
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  if (!isDev) {
    startBackend();
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### Обновление package.json:

```json
{
  "main": "main.js",
  "scripts": {
    "electron": "cross-env NODE_ENV=development electron .",
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run electron\"",
    "build-electron": "npm run build && electron-builder",
    "dist": "npm run build && electron-builder --publish=never"
  },
  "build": {
    "appId": "com.yourcompany.telegram-scanner",
    "productName": "Telegram Lead Scanner",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "backend/**/*",
      "main.js",
      "package.json",
      "!backend/node_modules",
      "!backend/.env*"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "public/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "public/icon.png"
    }
  }
}
```

### Команды для разработки:

```bash
# Разработка с hot reload
npm run electron-dev

# Сборка для продакшена
npm run build-electron

# Создание установщика
npm run dist
```

---

## 📦 Вариант 2: PKG (Только backend)

### Преимущества:
- ✅ Простота
- ✅ Маленький размер
- ✅ Быстрая сборка
- ❌ Только backend (нужен браузер для UI)

### Установка:

```bash
cd backend
npm install -g pkg
```

### Создание исполняемого файла:

```bash
# Windows
pkg server.js --target node18-win-x64 --output telegram-scanner.exe

# macOS
pkg server.js --target node18-macos-x64 --output telegram-scanner

# Linux
pkg server.js --target node18-linux-x64 --output telegram-scanner
```

### Обновление backend/package.json:

```json
{
  "bin": "server.js",
  "pkg": {
    "assets": [
      "routes/**/*",
      "services/**/*"
    ],
    "targets": [
      "node18-win-x64",
      "node18-macos-x64",
      "node18-linux-x64"
    ]
  }
}
```

---

## 🌐 Вариант 3: Tauri (Современный подход)

### Преимущества:
- ✅ Очень маленький размер
- ✅ Высокая производительность
- ✅ Безопасность
- ❌ Требует Rust

### Установка:

```bash
# Установка Tauri CLI
npm install --save-dev @tauri-apps/cli

# Инициализация Tauri
npx tauri init
```

---

## 🎯 Рекомендуемый подход: Electron

### Пошаговая инструкция:

1. **Установите зависимости:**
```bash
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

2. **Создайте main.js** (код выше)

3. **Обновите package.json** (конфигурация выше)

4. **Создайте иконки:**
   - `public/icon.ico` (Windows)
   - `public/icon.icns` (macOS)
   - `public/icon.png` (Linux)

5. **Настройте переменные окружения:**
```bash
# Создайте .env для desktop версии
VITE_API_URL=http://localhost:3001
NODE_ENV=production
```

6. **Запустите разработку:**
```bash
npm run electron-dev
```

7. **Соберите приложение:**
```bash
npm run dist
```

### Результат:
- **Windows**: `.exe` установщик в `dist-electron/`
- **macOS**: `.dmg` файл
- **Linux**: `.AppImage` файл

---

## 📁 Структура после настройки:

```
├── main.js                 # Главный процесс Electron
├── dist-electron/          # Собранные приложения
├── public/
│   ├── icon.ico           # Иконка Windows
│   ├── icon.icns          # Иконка macOS
│   └── icon.png           # Иконка Linux
├── backend/               # Backend сервер
├── src/                   # Frontend код
└── dist/                  # Собранный frontend
```

---

## 🔧 Особенности desktop версии:

1. **Автозапуск backend** - сервер запускается автоматически
2. **Локальное хранение** - данные сохраняются локально
3. **Нет интернет зависимости** - работает офлайн (кроме API)
4. **Системная интеграция** - уведомления, автозапуск
5. **Безопасность** - изолированная среда

---

## 🚀 Быстрый старт (Electron):

```bash
# 1. Установка
npm install

# 2. Разработка
npm run electron-dev

# 3. Сборка
npm run dist
```

✅ **Все файлы уже настроены:**
- `main.js` - главный файл Electron
- `package.json` - обновлен с конфигурацией
- `public/icon.svg` - иконка приложения

🎉 **Готово!** У вас будет полноценное desktop приложение!