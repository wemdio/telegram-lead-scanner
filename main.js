const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

// Запуск backend сервера
function startBackend() {
  const backendPath = path.join(__dirname, 'backend', 'server.js');
  console.log('Starting backend server...');
  
  try {
    // Запускаем backend сервер в том же процессе
    process.env.NODE_ENV = 'production';
    require(backendPath);
    console.log('Backend server started successfully');
  } catch (err) {
    console.error('Backend startup error:', err);
  }
}

// Функция для чтения порта сервера
function getServerPort() {
  try {
    const fs = require('fs');
    const portFile = path.join(__dirname, 'server-port.txt');
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf8').trim();
      return port;
    }
  } catch (error) {
    console.error('Error reading server port:', error);
  }
  return '3001'; // fallback
}

async function createWindow() {
  // Создание окна браузера
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: !isDev ? false : true, // Отключаем webSecurity в продакшене для загрузки локальных файлов
      allowRunningInsecureContent: true, // Разрешаем HTTP запросы из file:// протокола
      preload: path.join(__dirname, 'preload.js') // Добавляем preload скрипт для полифиллов
    },
    icon: path.join(__dirname, 'public', 'vite.svg'),
    title: 'Telegram Lead Scanner',
    show: false // Не показывать пока не загрузится
  });
  
  // Ждем, пока сервер запустится и запишет порт
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Показать окно когда готово
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // В разработке - подключаемся к dev серверу
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // В продакшене - загружаем собранные файлы
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  // Открывать внешние ссылки в браузере
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Обработка закрытия окна
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Создание меню приложения
function createMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Перезагрузить',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) {
              mainWindow.reload();
            }
          }
        },
        {
          label: 'Выход',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        {
          label: 'Полный экран',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          }
        },
        {
          label: 'Инструменты разработчика',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    },
    {
      label: 'Помощь',
      submenu: [
        {
          label: 'О программе',
          click: () => {
            // Можно добавить диалог "О программе"
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Готовность приложения
app.whenReady().then(async () => {
  console.log('Electron app is ready');
  
  // Запускаем backend только в продакшене
  if (!isDev) {
    startBackend();
    // Даем время backend'у запуститься
    setTimeout(async () => await createWindow(), 2000);
  } else {
    await createWindow();
  }
  
  createMenu();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

// Закрытие всех окон
app.on('window-all-closed', () => {
  console.log('All windows closed');
  
  // Завершаем backend процесс
  if (backendProcess) {
    console.log('Killing backend process...');
    backendProcess.kill('SIGTERM');
    
    // Принудительное завершение через 5 секунд
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Обработка завершения приложения
app.on('before-quit', () => {
  console.log('App is quitting...');
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});