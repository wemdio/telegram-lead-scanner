async function checkLeadSettings() {
  try {
    console.log('🔍 Проверяем настройки критериев поиска лидов...\n');
    
    // Проверяем настройки Google Sheets
    const googleSheetsResponse = await fetch('http://localhost:3001/api/settings/google-sheets');
    if (googleSheetsResponse.ok) {
      const googleSettings = await googleSheetsResponse.json();
      console.log('📊 Google Sheets настройки:', JSON.stringify(googleSettings, null, 2));
    } else {
      console.log('❌ Ошибка получения Google Sheets настроек:', googleSheetsResponse.status);
    }
    
    // Проверяем настройки Telegram
    const telegramResponse = await fetch('http://localhost:3001/api/settings/telegram');
    if (telegramResponse.ok) {
      const telegramSettings = await telegramResponse.json();
      console.log('📱 Telegram настройки:', JSON.stringify(telegramSettings, null, 2));
    } else {
      console.log('❌ Ошибка получения Telegram настроек:', telegramResponse.status);
    }
    
    // Проверяем статус сканера
    const scannerResponse = await fetch('http://localhost:3001/api/scanner/status');
    if (scannerResponse.ok) {
      const scannerStatus = await scannerResponse.json();
      console.log('🔍 Статус сканера:', JSON.stringify(scannerStatus, null, 2));
      
      // Проверяем наличие ключевых настроек в статусе сканера
      if (scannerStatus.settings) {
        if (scannerStatus.settings.openrouterApiKey) {
          console.log('✅ OpenRouter API ключ найден в настройках сканера');
        } else {
          console.log('❌ OpenRouter API ключ не найден в настройках сканера');
        }
        
        if (scannerStatus.settings.leadCriteria) {
          console.log('✅ Критерии поиска лидов найдены:', scannerStatus.settings.leadCriteria);
        } else {
          console.log('❌ Критерии поиска лидов не найдены в настройках сканера');
        }
      }
    } else {
      console.log('❌ Ошибка получения статуса сканера:', scannerResponse.status);
    }
    
    // Проверяем localStorage через браузерную консоль (инструкция)
    console.log('\n📝 Для проверки настроек в браузере выполните в консоли:');
    console.log('localStorage.getItem("openrouterApiKey")');
    console.log('localStorage.getItem("leadCriteria")');
    console.log('localStorage.getItem("googleSpreadsheetId")');
    
  } catch (error) {
    console.error('❌ Ошибка проверки настроек:', error.message);
  }
}

checkLeadSettings();