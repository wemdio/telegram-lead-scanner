const puppeteer = require('puppeteer');

async function checkFrontendLocalStorage() {
  console.log('🔍 Проверяем localStorage в браузере...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Переходим на фронтенд приложение
    console.log('📱 Открываем фронтенд приложение...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Ждем немного для полной загрузки
    await page.waitForTimeout(2000);
    
    // Получаем все данные из localStorage
    const localStorageData = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        storage[key] = localStorage.getItem(key);
      }
      return storage;
    });
    
    console.log('\n💾 Все данные в localStorage:');
    Object.keys(localStorageData).forEach(key => {
      const value = localStorageData[key];
      if (key.toLowerCase().includes('google') || key.toLowerCase().includes('sheet')) {
        console.log(`🔑 ${key}:`, value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'пусто');
      }
    });
    
    // Проверяем специфичные ключи для Google Sheets
    const googleKeys = [
      'googleServiceAccountEmail',
      'googlePrivateKey', 
      'googleSpreadsheetId'
    ];
    
    console.log('\n🔍 Поиск Google Sheets настроек:');
    let foundSettings = false;
    
    googleKeys.forEach(key => {
      const value = localStorageData[key];
      if (value) {
        foundSettings = true;
        console.log(`✅ ${key}:`, value.length > 50 ? value.substring(0, 50) + '...' : value);
      } else {
        console.log(`❌ ${key}: не найден`);
      }
    });
    
    if (!foundSettings) {
      console.log('\n❌ Google Sheets настройки не найдены в localStorage!');
      console.log('💡 Это объясняет почему backend не может получить API ключ');
    } else {
      console.log('\n✅ Google Sheets настройки найдены в localStorage');
      
      // Проверяем инициализацию Google Sheets на backend
      console.log('\n🔧 Проверяем инициализацию Google Sheets на backend...');
      
      const initResult = await page.evaluate(async () => {
        try {
          const googleServiceAccountEmail = localStorage.getItem('googleServiceAccountEmail');
          const googlePrivateKey = localStorage.getItem('googlePrivateKey');
          const googleSpreadsheetId = localStorage.getItem('googleSpreadsheetId');
          
          if (!googleServiceAccountEmail || !googlePrivateKey) {
            return { success: false, error: 'Отсутствуют credentials в localStorage' };
          }
          
          const response = await fetch('http://localhost:3001/api/sheets/auto-initialize', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              googleServiceAccountEmail,
              googlePrivateKey,
              googleSpreadsheetId
            })
          });
          
          const result = await response.json();
          return result;
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      console.log('📋 Результат инициализации:', initResult);
    }
    
    // Закрываем браузер через 5 секунд
    setTimeout(() => {
      browser.close();
    }, 5000);
    
  } catch (error) {
    console.error('❌ Ошибка при проверке localStorage:', error);
    if (browser) {
      await browser.close();
    }
  }
}

checkFrontendLocalStorage();