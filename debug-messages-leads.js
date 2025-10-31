const fs = require('fs');

async function debugMessagesAndLeads() {
  console.log('🔍 Диагностика сообщений и лидов...\n');

  try {
    // 1. Проверяем статус backend сервера
    console.log('1. Проверяем статус backend сервера...');
    const backendResponse = await fetch('http://localhost:3002/api/scanner/status');
    if (backendResponse.ok) {
      const status = await backendResponse.json();
      console.log('✅ Backend сервер работает');
      console.log('   Сканер запущен:', status.isRunning);
      console.log('   AI настройки:', {
        hasOpenRouterKey: !!status.openrouterApiKey,
        hasLeadCriteria: !!status.leadCriteria
      });
    } else {
      console.log('❌ Backend сервер не отвечает');
      return;
    }

    // 2. Проверяем настройки Google Sheets
    console.log('\n2. Проверяем настройки Google Sheets...');
    const sheetsSettingsResponse = await fetch('http://localhost:3002/api/settings/google-sheets');
    if (sheetsSettingsResponse.ok) {
      const sheetsSettings = await sheetsSettingsResponse.json();
      console.log('✅ Настройки Google Sheets найдены');
      console.log('   Spreadsheet ID:', sheetsSettings.spreadsheetId);
    } else {
      console.log('❌ Настройки Google Sheets не найдены');
    }

    // 3. Получаем данные из листа "Сообщения"
    console.log('\n3. Проверяем лист "Сообщения"...');
    try {
      const messagesResponse = await fetch('http://localhost:3002/api/sheets/data?range=Сообщения!A:Z');
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        if (messagesData.success && messagesData.data) {
          console.log('✅ Лист "Сообщения" найден');
          console.log('   Количество строк:', messagesData.data.length);
          if (messagesData.data.length > 1) {
            console.log('   Заголовки:', messagesData.data[0]);
            console.log('   Пример сообщения:', messagesData.data[1]);
          }
        } else {
          console.log('❌ Лист "Сообщения" пуст или не найден');
        }
      } else {
        console.log('❌ Не удалось получить данные из листа "Сообщения"');
      }
    } catch (error) {
      console.log('❌ Ошибка при получении сообщений:', error.message);
    }

    // 4. Получаем данные из листа "Лиды"
    console.log('\n4. Проверяем лист "Лиды"...');
    try {
      const leadsResponse = await fetch('http://localhost:3002/api/sheets/data?range=Лиды!A:Z');
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        if (leadsData.success && leadsData.data) {
          console.log('✅ Лист "Лиды" найден');
          console.log('   Количество строк:', leadsData.data.length);
          if (leadsData.data.length > 1) {
            console.log('   Заголовки:', leadsData.data[0]);
            console.log('   Пример лида:', leadsData.data[1]);
          } else {
            console.log('   ⚠️ Лист "Лиды" содержит только заголовки или пуст');
          }
        } else {
          console.log('❌ Лист "Лиды" пуст или не найден');
        }
      } else {
        console.log('❌ Не удалось получить данные из листа "Лиды"');
      }
    } catch (error) {
      console.log('❌ Ошибка при получении лидов:', error.message);
    }

    // 5. Тестируем анализ лидов с реальными сообщениями
    console.log('\n5. Тестируем анализ лидов...');
    try {
      const testAnalysisResponse = await fetch('http://localhost:3002/api/leads/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          openrouterApiKey: 'test-key',
          criteria: 'Найти людей, которые ищут работу или услуги',
          messages: [
            {
              id: 'test1',
              text: 'Ищу работу программиста, опыт 3 года',
              author: 'TestUser1',
              date: new Date().toISOString(),
              chatTitle: 'TestChat'
            },
            {
              id: 'test2', 
              text: 'Продаю машину, недорого',
              author: 'TestUser2',
              date: new Date().toISOString(),
              chatTitle: 'TestChat'
            }
          ]
        })
      });

      if (testAnalysisResponse.ok) {
        const analysisResult = await testAnalysisResponse.json();
        console.log('✅ Анализ лидов выполнен успешно');
        console.log('   Найдено лидов:', analysisResult.leads ? analysisResult.leads.length : 0);
        if (analysisResult.leads && analysisResult.leads.length > 0) {
          console.log('   Пример лида:', analysisResult.leads[0]);
        }
      } else {
        const errorText = await testAnalysisResponse.text();
        console.log('❌ Ошибка анализа лидов:', errorText);
      }
    } catch (error) {
      console.log('❌ Ошибка при тестировании анализа:', error.message);
    }

    // 6. Проверяем логи backend сервера
    console.log('\n6. Проверяем последние действия...');
    try {
      const historyResponse = await fetch('http://localhost:3002/api/scanner/history');
      if (historyResponse.ok) {
        const history = await historyResponse.json();
        console.log('✅ История сканирования найдена');
        console.log('   Последние действия:', history.slice(-3));
      } else {
        console.log('❌ История сканирования недоступна');
      }
    } catch (error) {
      console.log('❌ Ошибка при получении истории:', error.message);
    }

  } catch (error) {
    console.error('❌ Общая ошибка диагностики:', error);
  }
}

debugMessagesAndLeads().catch(console.error);