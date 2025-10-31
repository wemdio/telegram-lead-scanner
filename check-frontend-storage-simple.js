// Простой скрипт для проверки localStorage через DevTools Console
// Скопируйте и вставьте этот код в консоль браузера на странице http://localhost:3000

console.log('🔍 Проверяем localStorage в браузере...');

// Получаем все данные из localStorage
const storage = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  storage[key] = localStorage.getItem(key);
}

console.log('💾 Все данные в localStorage:', storage);

// Проверяем специфичные ключи для Google Sheets
const googleKeys = [
  'googleServiceAccountEmail',
  'googlePrivateKey', 
  'googleSpreadsheetId',
  'google-sheets-settings',
  'sheets-credentials',
  'googleSheetsCredentials'
];

console.log('\n🔍 Поиск Google Sheets настроек:');
googleKeys.forEach(key => {
  const value = storage[key];
  if (value) {
    console.log(`✅ ${key}:`, value.length > 100 ? value.substring(0, 100) + '...' : value);
  } else {
    console.log(`❌ ${key}: не найден`);
  }
});

// Проверяем все ключи содержащие 'google' или 'sheet'
console.log('\n🔍 Все ключи связанные с Google/Sheets:');
const relatedKeys = Object.keys(storage).filter(key => 
  key.toLowerCase().includes('google') || 
  key.toLowerCase().includes('sheet') ||
  key.toLowerCase().includes('credential')
);

if (relatedKeys.length === 0) {
  console.log('❌ Не найдено ключей связанных с Google Sheets');
} else {
  relatedKeys.forEach(key => {
    console.log(`🔑 ${key}:`, storage[key]);
  });
}

// Проверяем настройки приложения
const appSettings = localStorage.getItem('app-settings');
if (appSettings) {
  try {
    const parsed = JSON.parse(appSettings);
    console.log('\n📱 Настройки приложения:', parsed);
  } catch (e) {
    console.log('\n📱 Настройки приложения (raw):', appSettings);
  }
}

console.log('\n📋 Инструкция:');
console.log('1. Откройте http://localhost:3000 в браузере');
console.log('2. Откройте DevTools (F12)');
console.log('3. Перейдите на вкладку Console');
console.log('4. Скопируйте и вставьте этот код');
console.log('5. Нажмите Enter для выполнения');