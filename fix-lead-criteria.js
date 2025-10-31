// Скрипт для исправления критериев поиска лидов
async function fixLeadCriteria() {
  try {
    console.log('🔧 Исправляем критерии поиска лидов...\n');
    
    // Устанавливаем более конкретные критерии поиска лидов
    const newCriteria = `Найти потенциальных клиентов по следующим критериям:
1. Люди, которые ищут услуги или товары
2. Сообщения с вопросами типа "где найти", "кто может помочь", "нужен специалист"
3. Запросы на рекомендации услуг или товаров
4. Сообщения о проблемах, которые можно решить
5. Люди, которые упоминают бюджет или готовность платить
6. Запросы на консультации или помощь
7. Сообщения с контактной информацией (телефон, email, @username)

Исключить:
- Спам и реклама
- Общие разговоры без коммерческого интереса
- Технические сообщения бота`;

    // Обновляем критерии через API сканера
    const response = await fetch('http://localhost:3001/api/scanner/update-ai-settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        openrouterApiKey: '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', // Используем существующий ключ
        leadCriteria: newCriteria
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Критерии поиска лидов успешно обновлены!');
      console.log('📝 Новые критерии:');
      console.log(newCriteria);
      
      // Проверяем обновленные настройки
      console.log('\n🔍 Проверяем обновленные настройки...');
      const statusResponse = await fetch('http://localhost:3001/api/scanner/status');
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('✅ Обновленные критерии в системе:', status.status.leadCriteria);
      }
    } else {
      console.log('❌ Ошибка обновления критериев:', response.status);
      const error = await response.text();
      console.log('Детали ошибки:', error);
    }

  } catch (error) {
    console.error('❌ Ошибка исправления критериев:', error.message);
  }
}

fixLeadCriteria();