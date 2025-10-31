const fetch = require('node-fetch');

// Test lead analysis functionality
async function testLeadAnalysis() {
  try {
    console.log('🧪 Testing lead analysis functionality...');
    
    // Test data - mock messages that should be identified as leads
    const testMessages = [
      {
        id: 'msg_001',
        timestamp: new Date().toISOString(),
        chatTitle: 'Test Chat',
        username: 'test_user',
        firstName: 'John',
        lastName: 'Doe',
        userId: '123456',
        message: 'Ищу поставщика качественных товаров для своего магазина. Готов к долгосрочному сотрудничеству.',
        chatId: 'test_chat_1'
      },
      {
        id: 'msg_002',
        timestamp: new Date().toISOString(),
        chatTitle: 'Test Chat',
        username: 'business_owner',
        firstName: 'Jane',
        lastName: 'Smith',
        userId: '789012',
        message: 'Нужен надежный партнер для развития бизнеса. Рассматриваю различные варианты сотрудничества.',
        chatId: 'test_chat_1'
      },
      {
        id: 'msg_003',
        timestamp: new Date().toISOString(),
        chatTitle: 'Test Chat',
        username: 'regular_user',
        firstName: 'Bob',
        lastName: 'Johnson',
        userId: '345678',
        message: 'Привет всем! Как дела?',
        chatId: 'test_chat_1'
      }
    ];
    
    // Test lead analysis settings - get from environment variable
    const savedGeminiApiKey = process.env.OPENROUTER_API_KEY;
    if (!savedGeminiApiKey) {
      console.error('❌ OPENROUTER_API_KEY environment variable not set');
      console.log('💡 Please set your OpenRouter API key: set OPENROUTER_API_KEY=your_key_here');
      return;
    }
    const leadAnalysisSettings = {
      geminiApiKey: savedGeminiApiKey,
      leadCriteria: 'Ищите людей, которые ищут поставщиков, партнеров для бизнеса, или выражают коммерческий интерес'
    };
    
    console.log('🔑 Using API key:', savedGeminiApiKey.substring(0, 10) + '...');
    
    console.log('📋 Test messages:', testMessages.length);
    console.log('🎯 Lead criteria:', leadAnalysisSettings.leadCriteria);
    
    // Call the lead analysis endpoint directly
    const response = await fetch('http://localhost:3001/api/leads/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: testMessages,
        criteria: leadAnalysisSettings.leadCriteria,
        geminiApiKey: leadAnalysisSettings.geminiApiKey
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Lead analysis failed:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Lead analysis result:', result);
    
    if (result.leads && result.leads.length > 0) {
      console.log(`🎯 Found ${result.leads.length} leads:`);
      result.leads.forEach((lead, index) => {
        console.log(`  ${index + 1}. ${lead.name} (@${lead.username}): ${lead.score}% - ${lead.reasoning}`);
      });
    } else {
      console.log('📝 No leads found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testLeadAnalysis();