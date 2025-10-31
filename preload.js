// Preload script для Electron
// Добавляет полифиллы и исправления для renderer процесса

const { contextBridge } = require('electron');
const path = require('path');
const fs = require('fs');

console.log('Preload script starting...');

// Функция для получения порта сервера
function getServerPort() {
  try {
    const portFile = path.join(__dirname, 'server-port.txt');
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf8').trim();
      console.log('Server port read from file:', port);
      return port;
    }
  } catch (error) {
    console.error('Error reading server port:', error);
  }
  console.log('Using fallback port: 3001');
  return '3001';
}

// Передаем порт в renderer процесс
contextBridge.exposeInMainWorld('electronAPI', {
  getServerPort: getServerPort
});

// Немедленная инициализация полифилла для fetch API
(function initializeFetchPolyfill() {
  console.log('Initializing fetch polyfill...');
  
  // Создаем надежный полифилл для fetch
  function createFetchPolyfill() {
    return function(url, options = {}) {
      console.log('Fetch called with:', url, options);
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const method = options.method || 'GET';
        
        xhr.open(method, url);
        
        // Устанавливаем заголовки
        if (options.headers) {
          Object.keys(options.headers).forEach(key => {
            xhr.setRequestHeader(key, options.headers[key]);
          });
        }
        
        xhr.onload = () => {
          console.log('XHR response received:', xhr.status, xhr.responseText);
          const response = {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Map(),
            text: () => Promise.resolve(xhr.responseText),
            json: () => {
              try {
                const parsed = JSON.parse(xhr.responseText);
                console.log('JSON parsed successfully:', parsed);
                return Promise.resolve(parsed);
              } catch (e) {
                console.error('JSON parse error:', e, 'Text:', xhr.responseText);
                return Promise.reject(e);
              }
            }
          };
          resolve(response);
        };
        
        xhr.onerror = () => {
          console.error('XHR error');
          reject(new Error('Network error'));
        };
        
        xhr.send(options.body || null);
      });
    };
  }
  
  // Устанавливаем полифилл немедленно
  if (typeof window !== 'undefined') {
    window.fetch = createFetchPolyfill();
    console.log('Fetch polyfill installed on window');
  }
  
  // Также устанавливаем в глобальном контексте
  if (typeof global !== 'undefined') {
    global.fetch = createFetchPolyfill();
    console.log('Fetch polyfill installed on global');
  }
  
  // Перехватываем любые попытки переопределить fetch
  const originalFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    get: () => originalFetch,
    set: (newFetch) => {
      console.log('Attempt to override fetch detected, maintaining polyfill');
      // Не позволяем переопределить наш полифилл
    },
    configurable: false
  });
})();

// Дополнительная инициализация при загрузке DOM
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, verifying fetch polyfill...');
    if (window.fetch) {
      console.log('Fetch is available:', typeof window.fetch);
    } else {
      console.error('Fetch is not available after polyfill!');
    }
  });
}

// Дополнительные полифиллы для совместимости
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron
});

console.log('Preload script loaded successfully');