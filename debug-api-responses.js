// Детальная отладка ответов API
const debugApiResponses = async () => {
  try {
    console.log('🔍 Отладка API ответов...\n');
    
    // Проверяем API лидов
    console.log('📊 Проверяем API лидов...');
    const leadsResponse = await fetch('http://localhost:3001/api/leads');
    console.log('Status:', leadsResponse.status);
    console.log('Headers:', Object.fromEntries(leadsResponse.headers.entries()));
    
    const leadsText = await leadsResponse.text();
    console.log('Raw response:', leadsText);
    
    try {
      const leads = JSON.parse(leadsText);
      console.log('Parsed leads:', leads);
      console.log('Leads length:', Array.isArray(leads) ? leads.length : 'Not an array');
    } catch (e) {
      console.log('Failed to parse leads JSON:', e.message);
    }
    
    console.log('\n⚙️ Проверяем API настроек...');
    const settingsResponse = await fetch('http://localhost:3001/api/settings');
    console.log('Status:', settingsResponse.status);
    
    const settingsText = await settingsResponse.text();
    console.log('Raw response:', settingsText);
    
    try {
      const settings = JSON.parse(settingsText);
      console.log('Parsed settings:', settings);
    } catch (e) {
      console.log('Failed to parse settings JSON:', e.message);
    }
    
    console.log('\n💬 Проверяем API сообщений...');
    const messagesResponse = await fetch('http://localhost:3001/api/sheets/messages');
    console.log('Status:', messagesResponse.status);
    
    const messagesText = await messagesResponse.text();
    console.log('Raw response:', messagesText);
    
    try {
      const messages = JSON.parse(messagesText);
      console.log('Parsed messages:', messages);
      console.log('Messages length:', Array.isArray(messages) ? messages.length : 'Not an array');
    } catch (e) {
      console.log('Failed to parse messages JSON:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка отладки:', error.message);
  }
};

debugApiResponses();