const fs = require('fs');
const path = require('path');

async function checkTelegramSettings() {
  console.log('🔍 Проверяем настройки Telegram API...\n');

  const frontendUrl = 'http://localhost:5173';
  const backendUrl = 'http://localhost:3001';

  // 1. Check Telegram settings on frontend
  console.log('📋 1. Проверяем настройки Telegram на фронтенде (порт 5173):');
  try {
    const frontendResponse = await fetch(`${frontendUrl}/api/settings/telegram`);
    if (frontendResponse.ok) {
      const frontendData = await frontendResponse.json();
      console.log('✅ Настройки с фронтенда получены:', {
        success: frontendData.success,
        hasTelegramApiId: !!frontendData.telegramApiId,
        hasTelegramApiHash: !!frontendData.telegramApiHash,
        hasTelegramBotToken: !!frontendData.telegramBotToken,
        hasTelegramChannelId: !!frontendData.telegramChannelId
      });
    } else {
      console.log('❌ Ошибка получения настроек с фронтенда:', frontendResponse.status);
    }
  } catch (error) {
    console.error('❌ Ошибка подключения к фронтенду:', error.message);
  }

  // 2. Check Telegram settings on backend
  console.log('\n📋 2. Проверяем настройки Telegram на бэкенде (порт 3001):');
  try {
    const backendResponse = await fetch(`${backendUrl}/api/settings/telegram`);
    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log('✅ Настройки с бэкенда получены:', {
        success: backendData.success,
        hasTelegramApiId: !!backendData.telegramApiId,
        hasTelegramApiHash: !!backendData.telegramApiHash,
        hasTelegramBotToken: !!backendData.telegramBotToken,
        hasTelegramChannelId: !!backendData.telegramChannelId
      });
    } else {
      console.log('❌ Ошибка получения настроек с бэкенда:', backendResponse.status);
    }
  } catch (error) {
    console.error('❌ Ошибка подключения к бэкенду:', error.message);
  }

  // 3. Check Telegram client status
  console.log('\n📋 3. Проверяем статус Telegram клиента:');
  try {
    const statusResponse = await fetch(`${backendUrl}/api/telegram/status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Статус Telegram клиента:', statusData);
    } else {
      console.log('❌ Ошибка получения статуса клиента:', statusResponse.status);
    }
  } catch (error) {
    console.error('❌ Ошибка получения статуса клиента:', error.message);
  }

  // 4. Check environment variables
  console.log('\n📋 4. Проверяем переменные окружения:');
  const envVars = [
    'TELEGRAM_API_ID',
    'TELEGRAM_API_HASH',
    'TELEGRAM_SESSION_STRING',
    'TELEGRAM_BOT_TOKEN'
  ];

  envVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`${varName}: ${value ? '✅ установлена' : '❌ не установлена'}`);
  });

  // 5. Check .env files
  console.log('\n📋 5. Проверяем файлы конфигурации:');
  const envFiles = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '.env.production'),
    path.join(__dirname, 'backend', '.env'),
    path.join(__dirname, 'backend', '.env.local'),
    path.join(__dirname, 'backend', '.env.production')
  ];

  envFiles.forEach(filePath => {
    const fileName = path.basename(filePath);
    const dirName = path.basename(path.dirname(filePath));
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const hasTelegramSettings = content.includes('TELEGRAM_API_ID') || 
                                   content.includes('TELEGRAM_API_HASH') ||
                                   content.includes('TELEGRAM_BOT_TOKEN');
        console.log(`${dirName}/${fileName}: ✅ существует ${hasTelegramSettings ? '(содержит Telegram настройки)' : '(без Telegram настроек)'}`);
      } catch (error) {
        console.log(`${dirName}/${fileName}: ✅ существует (ошибка чтения)`);
      }
    } else {
      console.log(`${dirName}/${fileName}: ❌ не существует`);
    }
  });

  // 6. Test Telegram connection
  console.log('\n📋 6. Тестируем подключение к Telegram:');
  try {
    const testResponse = await fetch(`${backendUrl}/api/telegram/check-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Тест подключения к Telegram:', testData);
    } else {
      const errorData = await testResponse.json();
      console.log('❌ Ошибка тестирования подключения:', errorData);
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования подключения:', error.message);
  }
}

checkTelegramSettings().catch(console.error);