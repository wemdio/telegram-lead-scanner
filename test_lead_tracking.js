// Тестовый скрипт для проверки системы отслеживания лидов
const axios = require('axios');

async function testLeadTracking() {
  console.log('🧪 Начинаем тестирование системы отслеживания лидов...');
  
  try {
    // 1. Получаем настройки Google Sheets
    console.log('\n📊 Получаем настройки Google Sheets...');
    const sheetsSettings = await axios.get('http://localhost:3001/api/settings/google-sheets');
    console.log('✅ Настройки получены:', sheetsSettings.data.success);
    
    // 2. Создаем тестовые лиды
    console.log('\n📝 Создаем тестовые лиды...');
    const testLeads = [
      {
        timestamp: new Date().toISOString(),
        channel: '@test_channel_1',
        name: 'Тестовый Лид 1',
        username: '@test_user_1',
        message: 'Ищу услуги по разработке сайта',
        reasoning: 'Потенциальный клиент для веб-разработки',
        sent: false
      },
      {
        timestamp: new Date().toISOString(),
        channel: '@test_channel_2', 
        name: 'Тестовый Лид 2',
        username: '@test_user_2',
        message: 'Нужна помощь с маркетингом',
        reasoning: 'Интересуется маркетинговыми услугами',
        sent: false
      }
    ];
    
    // 3. Добавляем лиды в Google Sheets
    const addLeadsResponse = await axios.post('http://localhost:3001/api/sheets/add-leads', {
      leads: testLeads,
      sheetName: 'Лиды'
    });
    
    console.log('✅ Тестовые лиды добавлены:', addLeadsResponse.data.success);
    
    // 4. Проверяем отправку новых лидов
    console.log('\n📤 Тестируем отправку новых лидов...');
    const sendResponse = await axios.post('http://localhost:3001/api/cron/send-new-leads');
    console.log('📊 Результат отправки:', sendResponse.data);
    
    // 5. Проверяем обновление статуса в Google Sheets
    console.log('\n📋 Проверяем лиды после отправки...');
    
    // Ждем немного для обработки
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Получаем обновленные лиды
    const updatedLeadsResponse = await axios.get('http://localhost:3001/api/sheets/data/test?range=A:Z');
    console.log('📊 Обновленные лиды получены');
    
    console.log('\n✅ Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    if (error.response) {
      console.error('📄 Детали ошибки:', error.response.data);
    }
  }
}

// Запускаем тест
testLeadTracking();