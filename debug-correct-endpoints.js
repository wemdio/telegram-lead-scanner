// Тест с правильными эндпоинтами API
const debugCorrectEndpoints = async () => {
  try {
    console.log('🔍 Тестирование правильных эндпоинтов...\n');
    
    // Проверяем API лидов (правильный эндпоинт)
    console.log('📊 Проверяем API лидов...');
    const leadsResponse = await fetch('http://localhost:3001/api/leads');
    console.log('Status:', leadsResponse.status);
    
    const leadsText = await leadsResponse.text();
    console.log('Raw response length:', leadsText.length);
    
    try {
      const leadsData = JSON.parse(leadsText);
      console.log('Parsed leads data structure:', {
        hasLeads: !!leadsData.leads,
        leadsCount: Array.isArray(leadsData.leads) ? leadsData.leads.length : 'Not an array',
        hasTotal: !!leadsData.total,
        total: leadsData.total,
        hasLastAnalysis: !!leadsData.lastAnalysis
      });
      
      if (leadsData.leads && leadsData.leads.length > 0) {
        console.log('✅ Первый лид:', {
          id: leadsData.leads[0].id,
          author: leadsData.leads[0].author,
          username: leadsData.leads[0].username,
          confidence: leadsData.leads[0].confidence,
          reasoning: leadsData.leads[0].reasoning?.substring(0, 100) + '...'
        });
      }
    } catch (e) {
      console.log('Failed to parse leads JSON:', e.message);
    }
    
    console.log('\n⚙️ Проверяем настройки Google Sheets...');
    const settingsResponse = await fetch('http://localhost:3001/api/settings/google-sheets');
    console.log('Status:', settingsResponse.status);
    
    const settingsText = await settingsResponse.text();
    console.log('Raw response:', settingsText);
    
    console.log('\n⚙️ Проверяем настройки Telegram...');
    const telegramSettingsResponse = await fetch('http://localhost:3001/api/settings/telegram');
    console.log('Status:', telegramSettingsResponse.status);
    
    const telegramSettingsText = await telegramSettingsResponse.text();
    console.log('Raw response:', telegramSettingsText);
    
    console.log('\n💬 Проверяем статус Google Sheets...');
    const sheetsStatusResponse = await fetch('http://localhost:3001/api/sheets/status');
    console.log('Status:', sheetsStatusResponse.status);
    
    const sheetsStatusText = await sheetsStatusResponse.text();
    console.log('Raw response:', sheetsStatusText);
    
    console.log('\n🔍 Проверяем лиды из Google Sheets...');
    const sheetsLeadsResponse = await fetch('http://localhost:3001/api/sheets/leads');
    console.log('Status:', sheetsLeadsResponse.status);
    
    const sheetsLeadsText = await sheetsLeadsResponse.text();
    console.log('Raw response length:', sheetsLeadsText.length);
    
    try {
      const sheetsLeads = JSON.parse(sheetsLeadsText);
      console.log('Google Sheets leads count:', Array.isArray(sheetsLeads) ? sheetsLeads.length : 'Not an array');
    } catch (e) {
      console.log('Failed to parse sheets leads JSON:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
};

debugCorrectEndpoints();