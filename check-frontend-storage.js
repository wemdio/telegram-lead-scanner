// Скрипт для проверки localStorage в браузере
const puppeteer = require('puppeteer');

async function checkFrontendStorage() {
  console.log('🔍 Проверяем localStorage в браузере...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    // Переходим на фронтенд приложение
    console.log('📱 Открываем фронтенд приложение...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Получаем все данные из localStorage
    const localStorageData = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        storage[key] = localStorage.getItem(key);
      }
      return storage;
    });
    
    console.log('💾 Данные в localStorage:');
    Object.keys(localStorageData).forEach(key => {
      if (key.toLowerCase().includes('google') || key.toLowerCase().includes('sheet')) {
        console.log(`🔑 ${key}:`, localStorageData[key]);
      }
    });
    
    // Проверяем специфичные ключи для Google Sheets
    const googleKeys = [
      'googleServiceAccountEmail',
      'googlePrivateKey', 
      'googleSpreadsheetId',
      'google-sheets-settings',
      'sheets-credentials'
    ];
    
    console.log('\n🔍 Поиск Google Sheets настроек:');
    googleKeys.forEach(key => {
      const value = localStorageData[key];
      if (value) {
        console.log(`✅ ${key}: ${value.length > 50 ? value.substring(0, 50) + '...' : value}`);
      } else {
        console.log(`❌ ${key}: не найден`);
      }
    });
    
    // Проверяем все ключи содержащие 'google' или 'sheet'
    console.log('\n🔍 Все ключи связанные с Google/Sheets:');
    const relatedKeys = Object.keys(localStorageData).filter(key => 
      key.toLowerCase().includes('google') || 
      key.toLowerCase().includes('sheet') ||
      key.toLowerCase().includes('credential')
    );
    
    if (relatedKeys.length === 0) {
      console.log('❌ Не найдено ключей связанных с Google Sheets');
    } else {
      relatedKeys.forEach(key => {
        console.log(`🔑 ${key}: ${localStorageData[key]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки localStorage:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

checkFrontendStorage();