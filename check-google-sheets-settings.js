// Проверяем настройки Google Sheets через API
async function checkGoogleSheetsSettings() {
  console.log('🔍 Проверяем настройки Google Sheets...\n');
  
  try {
    // 1. Проверяем текущие настройки Google Sheets на backend
    console.log('📋 1. Проверяем настройки на backend:');
    const settingsResponse = await fetch('http://localhost:3001/api/settings/google-sheets');
    
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('✅ Настройки получены:', {
        hasSpreadsheetId: !!settings.spreadsheetId,
        hasApiKey: !!settings.apiKey,
        hasServiceAccountEmail: !!settings.googleServiceAccountEmail,
        hasPrivateKey: !!settings.googlePrivateKey
      });
      
      if (settings.spreadsheetId) {
        console.log('📊 Spreadsheet ID:', settings.spreadsheetId);
      }
      
      if (settings.googleServiceAccountEmail) {
        console.log('📧 Service Account Email:', settings.googleServiceAccountEmail);
      }
    } else {
      console.log('❌ Не удалось получить настройки:', settingsResponse.status);
    }
    
    // 2. Проверяем статус Google Sheets клиента
    console.log('\n📋 2. Проверяем статус Google Sheets клиента:');
    const statusResponse = await fetch('http://localhost:3001/api/sheets/status');
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('✅ Статус клиента:', status);
    } else {
      console.log('❌ Не удалось получить статус клиента:', statusResponse.status);
    }
    
    // 3. Пробуем получить заголовки листов
    console.log('\n📋 3. Проверяем доступ к листам:');
    const headersResponse = await fetch('http://localhost:3001/api/sheets/headers');
    
    if (headersResponse.ok) {
      const headers = await headersResponse.json();
      console.log('✅ Заголовки получены:', headers);
    } else {
      console.log('❌ Не удалось получить заголовки:', headersResponse.status);
      const errorText = await headersResponse.text();
      console.log('Ошибка:', errorText);
    }
    
    // 4. Проверяем переменные окружения
    console.log('\n📋 4. Проверяем переменные окружения:');
    const envVars = [
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_CLIENT_EMAIL', 
      'GOOGLE_PROJECT_ID',
      'GOOGLE_SPREADSHEET_ID',
      'GOOGLE_SHEETS_CREDENTIALS'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`✅ ${varName}: установлена (${value.length} символов)`);
      } else {
        console.log(`❌ ${varName}: не установлена`);
      }
    });
    
    // 5. Проверяем файлы конфигурации
    console.log('\n📋 5. Проверяем файлы конфигурации:');
    const fs = require('fs');
    const path = require('path');
    
    const configFiles = ['.env', '.env.local', '.env.production'];
    configFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}: существует`);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const hasGoogleSettings = content.includes('GOOGLE') || content.includes('SHEETS');
          console.log(`   Содержит Google настройки: ${hasGoogleSettings ? '✅' : '❌'}`);
        } catch (error) {
          console.log(`   Ошибка чтения: ${error.message}`);
        }
      } else {
        console.log(`❌ ${file}: не существует`);
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка при проверке настроек:', error.message);
  }
}

// Запускаем проверку
checkGoogleSheetsSettings();