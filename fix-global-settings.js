// Используем встроенный fetch в Node.js 18+

async function fixGlobalSettings() {
  try {
    console.log('🔧 Исправляем проблему с globalSettings...');
    
    // Получаем текущие настройки
    const statusResponse = await fetch('http://localhost:3001/api/scanner/status');
    const status = await statusResponse.json();
    
    console.log('📊 Текущий статус сканера:');
    console.log('  - openrouterApiKey:', !!status.status.openrouterApiKey);
    console.log('  - leadCriteria:', !!status.status.leadCriteria);
    
    // Если настройки отсутствуют, устанавливаем их
    if (!status.status.openrouterApiKey || !status.status.leadCriteria) {
      console.log('⚠️ Настройки ИИ отсутствуют, устанавливаем их...');
      
      const updateResponse = await fetch('http://localhost:3001/api/scanner/update-ai-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openrouterApiKey: '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',
          leadCriteria: `Найти потенциальных клиентов по следующим критериям:
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
- Технические сообщения бота`
        })
      });
      
      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log('✅ Настройки ИИ успешно обновлены:', result);
      } else {
        const error = await updateResponse.text();
        console.log('❌ Ошибка обновления настроек:', error);
      }
    } else {
      console.log('✅ Настройки ИИ уже установлены корректно');
    }
    
    // Проверяем результат
    const finalStatusResponse = await fetch('http://localhost:3001/api/scanner/status');
    const finalStatus = await finalStatusResponse.json();
    
    console.log('\n📊 Финальный статус:');
    console.log('  - openrouterApiKey:', !!finalStatus.status.openrouterApiKey);
    console.log('  - leadCriteria:', !!finalStatus.status.leadCriteria);
    
    if (finalStatus.status.openrouterApiKey && finalStatus.status.leadCriteria) {
      console.log('🎉 Проблема с globalSettings исправлена!');
    } else {
      console.log('❌ Проблема не решена, требуется дополнительная диагностика');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при исправлении globalSettings:', error);
  }
}

fixGlobalSettings();