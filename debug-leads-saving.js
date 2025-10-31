// Используем встроенный fetch в Node.js 18+ или fallback на node-fetch
let fetch;
try {
  fetch = globalThis.fetch;
  if (!fetch) {
    fetch = require('node-fetch');
  }
} catch (e) {
  // Если node-fetch не установлен, используем встроенный fetch
  fetch = globalThis.fetch;
}

const API_BASE = 'http://localhost:3002/api';

async function debugLeadsSaving() {
  console.log('🔍 Диагностика сохранения лидов в Google Sheets...\n');

  try {
    // 1. Проверяем статус бэкенда
    console.log('1️⃣ Проверка статуса бэкенда...');
    const backendResponse = await fetch(`${API_BASE}/leads/status`);
    if (backendResponse.ok) {
      const backendStatus = await backendResponse.json();
      console.log('✅ Бэкенд доступен:', backendStatus);
    } else {
      console.log('❌ Бэкенд недоступен');
      return;
    }

    // 2. Проверяем статус Google Sheets
    console.log('\n2️⃣ Проверка статуса Google Sheets...');
    const sheetsResponse = await fetch(`${API_BASE}/sheets/status`);
    if (sheetsResponse.ok) {
      const sheetsStatus = await sheetsResponse.json();
      console.log('✅ Google Sheets статус:', sheetsStatus);
    } else {
      console.log('❌ Ошибка получения статуса Google Sheets');
    }

    // 3. Получаем текущие лиды
    console.log('\n3️⃣ Получение текущих лидов...');
    const leadsResponse = await fetch(`${API_BASE}/leads`);
    if (leadsResponse.ok) {
      const leadsData = await leadsResponse.json();
      console.log(`📊 Найдено ${leadsData.leads.length} лидов в системе`);
      
      if (leadsData.leads.length > 0) {
        console.log('📋 Первый лид:', {
          id: leadsData.leads[0].id,
          name: leadsData.leads[0].name,
          username: leadsData.leads[0].username,
          channel: leadsData.leads[0].channel,
          confidence: leadsData.leads[0].confidence
        });
      }
    } else {
      console.log('❌ Ошибка получения лидов');
    }

    // 4. Тестируем анализ с реальными сообщениями
    console.log('\n4️⃣ Тестирование анализа сообщений...');
    const testMessages = [
      {
        id: 'test-msg-1',
        text: 'Ищу веб-разработчика для создания интернет-магазина. Опыт работы с React обязателен. Оплата договорная.',
        author: 'test_user_1',
        timestamp: new Date().toISOString(),
        chatId: 'test_chat',
        chatTitle: 'Работа IT'
      },
      {
        id: 'test-msg-2', 
        text: 'Нужен мобильный разработчик на Flutter. Удаленная работа. Зарплата от 100к.',
        author: 'test_user_2',
        timestamp: new Date().toISOString(),
        chatId: 'test_chat',
        chatTitle: 'Работа IT'
      }
    ];

    const testCriteria = [
      'Ищу разработчиков (веб, мобильные, фронтенд, бэкенд)',
      'Вакансии в IT сфере',
      'Предложения работы программистам'
    ];

    const analysisResponse = await fetch(`${API_BASE}/leads/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: testMessages,
        criteria: testCriteria,
        apiKey: 'test_key', // Используем тестовый ключ для проверки логики
        spreadsheetId: 'test_spreadsheet_id'
      })
    });

    if (analysisResponse.ok) {
      const analysisResult = await analysisResponse.json();
      console.log(`✅ Анализ завершен. Найдено лидов: ${analysisResult.leads.length}`);
      
      if (analysisResult.leads.length > 0) {
        console.log('📋 Найденные лиды:');
        analysisResult.leads.forEach((lead, index) => {
          console.log(`  ${index + 1}. ${lead.name} (@${lead.username}) - ${lead.confidence}% уверенности`);
          console.log(`     Причина: ${lead.reason}`);
        });
      }
    } else {
      const errorText = await analysisResponse.text();
      console.log('❌ Ошибка анализа:', errorText);
    }

    // 5. Проверяем прямое сохранение в Google Sheets
    console.log('\n5️⃣ Тестирование прямого сохранения в Google Sheets...');
    const testLead = {
      timestamp: new Date().toISOString(),
      name: 'Тестовый Лид',
      username: 'test_lead',
      channel: 'test_channel',
      message: 'Тестовое сообщение для проверки сохранения',
      reason: 'Тестовая причина',
      confidence: 85,
      sent: false
    };

    const saveResponse = await fetch(`${API_BASE}/sheets/append-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        leads: [testLead],
        spreadsheetId: 'test_spreadsheet_id',
        sheetName: 'Лиды'
      })
    });

    if (saveResponse.ok) {
      const saveResult = await saveResponse.json();
      console.log('✅ Прямое сохранение в Google Sheets успешно:', saveResult);
    } else {
      const errorText = await saveResponse.text();
      console.log('❌ Ошибка прямого сохранения:', errorText);
    }

    // 6. Проверяем чтение лидов из Google Sheets
    console.log('\n6️⃣ Проверка чтения лидов из Google Sheets...');
    const readResponse = await fetch(`${API_BASE}/sheets/leads/test_spreadsheet_id`);
    if (readResponse.ok) {
      const readResult = await readResponse.json();
      console.log('✅ Чтение из Google Sheets:', readResult);
    } else {
      const errorText = await readResponse.text();
      console.log('❌ Ошибка чтения из Google Sheets:', errorText);
    }

  } catch (error) {
    console.error('❌ Ошибка диагностики:', error.message);
  }
}

// Запускаем диагностику
debugLeadsSaving().then(() => {
  console.log('\n🏁 Диагностика завершена');
}).catch(error => {
  console.error('❌ Критическая ошибка:', error);
});