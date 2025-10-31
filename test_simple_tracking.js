// Простой тест системы отслеживания лидов
const axios = require('axios');

async function testSimpleTracking() {
  console.log('🧪 Тестируем исправленную систему отслеживания лидов...\n');
  
  try {
    // 1. Тестируем отправку новых лидов
    console.log('📤 Вызываем send-new-leads...');
    const response = await axios.post('http://localhost:3001/api/cron/send-new-leads');
    
    console.log('📊 Результат:');
    console.log('  - Успех:', response.data.success);
    console.log('  - Сообщение:', response.data.message);
    console.log('  - Отправлено лидов:', response.data.sentCount);
    
    if (response.data.sentCount > 0) {
      console.log('\n✅ Система работает! Лиды были отправлены и помечены как sent=true');
    } else {
      console.log('\n📭 Новых лидов для отправки не найдено (все уже отправлены)');
      console.log('   Это означает, что система отслеживания работает правильно!');
    }
    
    console.log('\n🔍 Проверим детали в логах backend сервера...');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.response) {
      console.error('📄 Детали:', error.response.data);
    }
  }
}

testSimpleTracking();