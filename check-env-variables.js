const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка переменных окружения для Google Sheets...\n');

// Проверяем переменные окружения
console.log('📋 Переменные окружения:');
console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'установлена' : 'НЕ УСТАНОВЛЕНА');
console.log('GOOGLE_CLIENT_EMAIL:', process.env.GOOGLE_CLIENT_EMAIL ? 'установлена' : 'НЕ УСТАНОВЛЕНА');
console.log('GOOGLE_PROJECT_ID:', process.env.GOOGLE_PROJECT_ID ? 'установлена' : 'НЕ УСТАНОВЛЕНА');
console.log('GOOGLE_SPREADSHEET_ID:', process.env.GOOGLE_SPREADSHEET_ID ? 'установлена' : 'НЕ УСТАНОВЛЕНА');
console.log('GOOGLE_SHEETS_CREDENTIALS:', process.env.GOOGLE_SHEETS_CREDENTIALS ? 'установлена' : 'НЕ УСТАНОВЛЕНА');

console.log('\n📁 Проверка файлов конфигурации:');

// Проверяем .env файлы
const envFiles = ['.env', '.env.local', '.env.production'];
envFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} существует`);
    const content = fs.readFileSync(filePath, 'utf8');
    const hasGoogleCreds = content.includes('GOOGLE_') || content.includes('google');
    console.log(`   Содержит Google настройки: ${hasGoogleCreds ? 'ДА' : 'НЕТ'}`);
  } else {
    console.log(`❌ ${file} не найден`);
  }
});

// Если есть GOOGLE_SHEETS_CREDENTIALS, попробуем его распарсить
if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
  try {
    console.log('\n🔧 Парсинг GOOGLE_SHEETS_CREDENTIALS...');
    const creds = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
    console.log('✅ JSON валиден');
    console.log('📋 Содержимое:');
    console.log('  project_id:', creds.project_id);
    console.log('  client_email:', creds.client_email);
    console.log('  private_key:', creds.private_key ? 'присутствует' : 'отсутствует');
    
    // Предлагаем установить отдельные переменные
    console.log('\n💡 Рекомендация: установить отдельные переменные окружения:');
    console.log(`GOOGLE_PRIVATE_KEY="${creds.private_key}"`);
    console.log(`GOOGLE_CLIENT_EMAIL="${creds.client_email}"`);
    console.log(`GOOGLE_PROJECT_ID="${creds.project_id}"`);
    
  } catch (error) {
    console.log('❌ Ошибка парсинга GOOGLE_SHEETS_CREDENTIALS:', error.message);
  }
}

console.log('\n🔍 Проверка backend настроек...');

// Проверяем настройки через API
async function checkBackendSettings() {
  try {
    const response = await fetch('http://localhost:3001/api/settings/google-sheets');
    if (response.ok) {
      const settings = await response.json();
      console.log('✅ Backend Google Sheets настройки:');
      console.log('  spreadsheetId:', settings.spreadsheetId || 'НЕ УСТАНОВЛЕН');
      console.log('  apiKey присутствует:', settings.apiKey ? 'ДА' : 'НЕТ');
    } else {
      console.log('❌ Не удалось получить настройки из backend');
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к backend:', error.message);
  }
}

checkBackendSettings();