// Используем встроенный fetch в Node.js 18+

async function debugLeadsAnalysis() {
  console.log('🔍 Диагностика анализа лидов...\n');

  try {
    // 1. Проверяем статус backend
    console.log('1. Проверка backend сервера...');
    const healthResponse = await fetch('http://localhost:3002/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Backend работает:', health);
    } else {
      console.log('❌ Backend недоступен');
      return;
    }

    // 2. Проверяем настройки AI через scanner
    console.log('\n2. Проверка настроек AI через scanner...');
    const scannerStatusResponse = await fetch('http://localhost:3002/api/scanner/status');
    if (scannerStatusResponse.ok) {
      const scannerStatus = await scannerStatusResponse.json();
      console.log('📋 Статус сканера:', scannerStatus);
    } else {
      console.log('❌ Не удалось получить статус сканера');
    }

    // 3. Проверяем сообщения в Google Sheets
    console.log('\n3. Проверка сообщений в Google Sheets...');
    const messagesResponse = await fetch('http://localhost:3002/api/sheets/messages');
    if (messagesResponse.ok) {
      const messages = await messagesResponse.json();
      console.log(`📨 Найдено сообщений: ${messages.length}`);
      if (messages.length > 0) {
        console.log('📋 Пример сообщения:', {
          id: messages[0].id,
          channel: messages[0].chatTitle,
          author: messages[0].username || `${messages[0].firstName} ${messages[0].lastName}`,
          message: messages[0].message?.substring(0, 100) + '...',
          timestamp: messages[0].timestamp
        });
      }
    } else {
      console.log('❌ Не удалось получить сообщения из Google Sheets');
    }

    // 4. Проверяем лиды в Google Sheets
    console.log('\n4. Проверка лидов в Google Sheets...');
    const leadsResponse = await fetch('http://localhost:3002/api/sheets/leads');
    if (leadsResponse.ok) {
      const leads = await leadsResponse.json();
      console.log(`🎯 Найдено лидов: ${leads.length}`);
      if (leads.length > 0) {
        console.log('📋 Пример лида:', leads[0]);
      }
    } else {
      console.log('❌ Не удалось получить лиды из Google Sheets');
    }

    // 5. Тестируем анализ лидов с тестовыми данными
    console.log('\n5. Тестирование анализа лидов...');
    const testMessages = [
      {
        id: 'test1',
        chatTitle: 'Test Channel',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        message: 'Ищу работу программиста Python, опыт 3 года, готов к удаленной работе',
        timestamp: new Date().toISOString()
      },
      {
        id: 'test2',
        chatTitle: 'Test Channel',
        username: 'testuser2',
        firstName: 'Test2',
        lastName: 'User2',
        message: 'Продаю машину BMW X5, 2020 год, пробег 50000 км',
        timestamp: new Date().toISOString()
      }
    ];

    const analyzeResponse = await fetch('http://localhost:3002/api/leads/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: testMessages,
        openrouterApiKey: 'test-key-for-debug',
        criteria: 'Ищем людей которые ищут работу в IT сфере'
      })
    });

    if (analyzeResponse.ok) {
      const result = await analyzeResponse.json();
      console.log('✅ Анализ выполнен успешно:');
      console.log(`  - Найдено лидов: ${result.leads?.length || 0}`);
      if (result.leads && result.leads.length > 0) {
        console.log('📋 Найденные лиды:', result.leads);
      }
    } else {
      const errorText = await analyzeResponse.text();
      console.log('❌ Ошибка анализа:', errorText);
    }

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  }
}

debugLeadsAnalysis();