// Используем встроенный fetch в Node.js

async function debugAIAPI() {
  try {
    console.log('🔍 Отладка ИИ API...');

    // Получаем настройки
    const settingsResponse = await fetch('http://localhost:3001/api/scanner/status');
    const settings = await settingsResponse.json();
    
    const openrouterApiKey = settings.status.openrouterApiKey;
    const leadCriteria = settings.status.leadCriteria;
    
    console.log('🔑 API ключ:', openrouterApiKey ? `${openrouterApiKey.substring(0, 20)}...` : 'отсутствует');
    console.log('📋 Критерии:', leadCriteria ? 'установлены' : 'отсутствуют');

    // Тестовое сообщение - очень явный лид
    const testMessage = {
      id: 1,
      username: 'test_user',
      text: 'Ищу веб-разработчика для создания сайта. Бюджет 100 000 рублей. Пишите @test_user',
      date: new Date().toISOString(),
      chat_id: 'test_chat'
    };

    console.log('📝 Тестовое сообщение:', testMessage.text);

    // Прямой запрос к OpenRouter API
    console.log('\n🚀 Отправляем запрос к OpenRouter API...');
    
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Telegram Lead Scanner'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct',
        messages: [
          {
            role: 'system',
            content: `Ты анализируешь сообщения из Telegram чатов для поиска потенциальных клиентов (лидов).

Критерии поиска лидов:
${leadCriteria}

Отвечай ТОЛЬКО в формате JSON:
{
  "isLead": true/false,
  "confidence": 0-100,
  "reason": "объяснение решения",
  "leadInfo": {
    "service": "какая услуга нужна",
    "budget": "бюджет если указан",
    "contact": "контактная информация если есть",
    "urgency": "срочность если указана"
  }
}`
          },
          {
            role: 'user',
            content: `Проанализируй это сообщение: "${testMessage.text}"`
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    console.log('📊 Статус ответа OpenRouter:', openrouterResponse.status);
    
    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      console.log('❌ Ошибка OpenRouter:', errorText);
      return;
    }

    const openrouterResult = await openrouterResponse.json();
    console.log('🤖 Полный ответ OpenRouter:', JSON.stringify(openrouterResult, null, 2));

    if (openrouterResult.choices && openrouterResult.choices[0]) {
      const aiResponse = openrouterResult.choices[0].message.content;
      console.log('\n💬 Ответ ИИ:', aiResponse);
      
      try {
        const parsedResponse = JSON.parse(aiResponse);
        console.log('\n✅ Распарсенный ответ:', JSON.stringify(parsedResponse, null, 2));
        
        if (parsedResponse.isLead) {
          console.log('🎯 ИИ определил это как лид!');
        } else {
          console.log('❌ ИИ НЕ определил это как лид');
        }
      } catch (parseError) {
        console.log('❌ Ошибка парсинга JSON ответа ИИ:', parseError.message);
        console.log('📝 Сырой ответ:', aiResponse);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка при отладке ИИ API:', error);
  }
}

debugAIAPI();