const express = require('express');
const router = express.Router();
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');

// Import the Gemini service
const geminiServicePath = path.join(__dirname, '../services/geminiService.js');
let GeminiService;
try {
  // For TypeScript files in Node.js, we need to use require with ts-node or compile first
  // For now, we'll create a JavaScript version or use dynamic import
  GeminiService = require('../services/geminiService.js');
} catch (error) {
  // console.warn('Could not load GeminiService:', error.message);
}

// Import GoogleSheetsService
const GoogleSheetsService = require('../services/googleSheetsService.cjs');
const googleSheetsService = new GoogleSheetsService();

// Путь к файлу настроек
const SETTINGS_FILE = path.join(__dirname, '..', 'persistent-settings.json');

// Функция для загрузки настроек из файла
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const settings = JSON.parse(data);
      return settings;
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки настроек в leads.js:', error.message);
  }
  
  return {
    sheetsConfig: null,
    spreadsheetId: null,
    openrouterApiKey: null,
    leadCriteria: null
  };
}

// In-memory storage for leads (in production, use a database)
let storedLeads = [];
let lastAnalysisResult = null;
let leadsInitialized = false; // Флаг для отслеживания инициализации лидов
let leadResponses = []; // Хранение ответов от лидов
let chatHistory = new Map(); // Хранение истории чатов: leadId -> массив сообщений

// Get all stored leads with contact status from Google Sheets
router.get('/', async (req, res) => {
  try {
    console.log(`🔍 GET /api/leads вызван. leadsInitialized: ${leadsInitialized}, storedLeads.length: ${storedLeads.length}`);
    
    // Загружаем лиды из Google Sheets только если они еще не были инициализированы
    if (!leadsInitialized) {
      try {
        let spreadsheetId = null;
        
        // Получаем настройки Google Sheets
        const settingsResponse = await fetch('http://localhost:3001/api/settings/google-sheets');
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          
          if (settings.success && settings.spreadsheetId && settings.spreadsheetId !== 'mock-spreadsheet-id') {
            spreadsheetId = settings.spreadsheetId;
            console.log('📊 Получен spreadsheetId из localStorage');
          } else {
            console.log('⚠️ Не удалось получить spreadsheetId из localStorage, используем переменные окружения');
            spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
          }
        } else {
          console.log('⚠️ Ошибка при получении настроек из localStorage, используем переменные окружения');
          spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
        }
        
        if (spreadsheetId && spreadsheetId !== 'mock-spreadsheet-id') {
          console.log('📋 Загружаем лиды из Google Sheets (первая инициализация)...');
          
          // Загружаем лиды из Google Sheets
          const sheetsResponse = await fetch(`http://localhost:3001/api/sheets/leads/${spreadsheetId}`);
          if (sheetsResponse.ok) {
            const sheetsData = await sheetsResponse.json();
            if (sheetsData.success && sheetsData.leads && sheetsData.leads.length > 0) {
                // Загружаем лиды из Google Sheets только при первой инициализации
                // Сохраняем локальные изменения (например, статус sent) при слиянии с данными из Google Sheets
                const existingLeadsMap = new Map(storedLeads.map(lead => [lead.id, lead]));
                const mergedLeads = sheetsData.leads.map(sheetLead => {
                  const existingLead = existingLeadsMap.get(sheetLead.id);
                  if (existingLead) {
                    // Сохраняем локальные изменения (sent, contacted, contactDate, contactStatus)
                    return {
                      ...sheetLead,
                      sent: existingLead.sent || false,
                      contacted: existingLead.contacted || false,
                      contactDate: existingLead.contactDate || null,
                      contactStatus: existingLead.contactStatus || null
                    };
                  }
                  return sheetLead;
                });
                
                storedLeads = mergedLeads;
                leadsInitialized = true; // Устанавливаем флаг инициализации
                console.log(`✅ Загружено ${sheetsData.leads.length} лидов из Google Sheets`);
              } else {
                console.log('⚠️ Не удалось получить лиды из Google Sheets или лиды отсутствуют');
              }
            } else {
              console.log('⚠️ Ошибка при загрузке лидов из Google Sheets');
            }
          } else {
            console.log('⚠️ spreadsheetId не настроен, используем локальный массив лидов');
          }
      } catch (syncError) {
        console.warn('⚠️ Не удалось загрузить лиды из Google Sheets:', syncError.message);
      }
    } else {
      console.log(`📋 Используем локальный массив лидов (${storedLeads.length} лидов)`);
    }
    
    let leadsWithContactStatus = [...storedLeads];
    
    // Загрузить данные о контактах из Google Sheets если есть API ключ
    if (process.env.GOOGLE_SHEETS_API_KEY || req.headers['x-api-key']) {
      try {
        const apiKey = process.env.GOOGLE_SHEETS_API_KEY || req.headers['x-api-key'];
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID || req.headers['x-spreadsheet-id'];
        
        if (apiKey && spreadsheetId) {
          // Загрузить данные из листа "Связались"
          const contactsRange = `Связались!A:G`;
          const contactsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${contactsRange}?key=${apiKey}`;
          
          const response = await fetch(contactsUrl);
          const data = await response.json();
          
          if (data.values && data.values.length > 0) {
            // Создать карту контактов (ID лида -> дата контакта)
            const contactsMap = new Map();
            
            // Пропускаем заголовок (первая строка)
            for (let i = 1; i < data.values.length; i++) {
              const row = data.values[i];
              if (row[0]) { // ID лида
                contactsMap.set(row[0], {
                  contacted: true,
                  contactDate: row[3] || new Date().toISOString(), // Дата контакта
                  contactName: row[1] || 'Unknown',
                  contactUsername: row[2] || '',
                  contactChannel: row[4] || '',
                  contactMessage: row[5] || '',
                  contactAccount: row[6] || ''
                });
              }
            }
            
            // Обновить статус контакта для лидов, сохраняя локальные изменения
            leadsWithContactStatus = leadsWithContactStatus.map(lead => {
              const contactInfo = contactsMap.get(lead.id);
              if (contactInfo) {
                return {
                  ...lead, // Сохраняем все локальные изменения (включая sent статус)
                  contacted: true,
                  contactDate: contactInfo.contactDate
                };
              }
              return lead; // Возвращаем лид со всеми локальными изменениями
            });
          }
        }
      } catch (error) {
        console.error('Error loading contact data from Google Sheets:', error);
        // Продолжаем с исходными данными если не удалось загрузить из Google Sheets
      }
    }
    
    res.json({
      leads: leadsWithContactStatus,
      lastAnalysis: lastAnalysisResult,
      total: leadsWithContactStatus.length
    });
  } catch (error) {
    // console.error('Error getting leads:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Get leads status
router.get('/status', (req, res) => {
  try {
    res.json({
      status: 'ready',
      leads: storedLeads, // Добавляем лиды в ответ
      totalLeads: storedLeads.length,
      lastAnalysis: lastAnalysisResult ? {
        timestamp: lastAnalysisResult.timestamp,
        totalAnalyzed: lastAnalysisResult.totalAnalyzed,
        leadsFound: lastAnalysisResult.leadsFound
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leads status' });
  }
});

// Эндпоинт для синхронизации лидов из Google Sheets
router.post('/sync-from-sheets', async (req, res) => {
  try {
    console.log('🔄 Запуск синхронизации лидов из Google Sheets...');
    
    // Получаем настройки Google Sheets
    const settingsResponse = await fetch('http://localhost:3001/api/settings/google-sheets');
    if (!settingsResponse.ok) {
      return res.status(500).json({ 
        success: false, 
        error: 'Не удалось получить настройки Google Sheets' 
      });
    }
    
    const settings = await settingsResponse.json();
    
    if (!settings.success || !settings.spreadsheetId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Настройки Google Sheets не настроены' 
      });
    }
    
    // Если это mock режим, используем тестовые данные
    if (settings.spreadsheetId === 'mock-spreadsheet-id') {
      console.log('📋 Используем mock данные для синхронизации...');
      const mockLeads = [
        {
          id: 'sheet-lead-1',
          timestamp: new Date().toISOString(),
          channel: '@mock_channel_1',
          name: 'Mock Lead 1',
          username: '@mock_user_1',
          message: 'Mock message 1',
          reasoning: 'Mock reasoning 1',
          sent: false,
          originalIndex: 0
        },
        {
          id: 'sheet-lead-2',
          timestamp: new Date().toISOString(),
          channel: '@mock_channel_2',
          name: 'Mock Lead 2',
          username: '@mock_user_2',
          message: 'Mock message 2',
          reasoning: 'Mock reasoning 2',
          sent: false,
          originalIndex: 1
        }
      ];
      
      // Объединяем с существующими лидами, избегая дубликатов
      const existingIds = new Set(storedLeads.map(lead => lead.id));
      const newLeads = mockLeads.filter(lead => !existingIds.has(lead.id));
      
      storedLeads = [...storedLeads, ...newLeads];
      
      return res.json({
        success: true,
        message: `Синхронизировано ${newLeads.length} новых лидов из Google Sheets (mock режим)`,
        totalLeads: storedLeads.length,
        newLeads: newLeads.length,
        leads: storedLeads
      });
    }
    
    // Загружаем лиды из Google Sheets
    console.log('📋 Загружаем лиды из Google Sheets...');
    const sheetsResponse = await fetch(`http://localhost:3001/api/sheets/leads/${settings.spreadsheetId}`);
    
    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      return res.status(500).json({ 
        success: false, 
        error: `Ошибка загрузки лидов из Google Sheets: ${errorText}` 
      });
    }
    
    const sheetsData = await sheetsResponse.json();
    
    if (!sheetsData.success || !sheetsData.leads) {
      return res.status(500).json({ 
        success: false, 
        error: 'Не удалось получить лиды из Google Sheets' 
      });
    }
    
    // Объединяем с существующими лидами, избегая дубликатов
    const existingIds = new Set(storedLeads.map(lead => lead.id));
    const newLeads = sheetsData.leads.filter(lead => !existingIds.has(lead.id));
    
    // Добавляем новые лиды
    storedLeads = [...storedLeads, ...newLeads];
    
    console.log(`✅ Синхронизировано ${newLeads.length} новых лидов из Google Sheets`);
    
    res.json({
      success: true,
      message: `Синхронизировано ${newLeads.length} новых лидов из Google Sheets`,
      totalLeads: storedLeads.length,
      newLeads: newLeads.length,
      leads: storedLeads
    });
    
  } catch (error) {
    console.error('❌ Ошибка синхронизации лидов:', error);
    res.status(500).json({ 
      success: false, 
      error: `Ошибка синхронизации: ${error.message}` 
    });
  }
});

// Analyze messages for leads
router.post('/analyze', async (req, res) => {
  try {
    // console.log('🔍 Starting leads analysis...');
    let { openrouterApiKey, criteria, messages, spreadsheetId, googleServiceAccountEmail, googlePrivateKey } = req.body;
    
    // Если настройки не переданы в запросе, загружаем из файла
    if (!openrouterApiKey || !criteria) {
      const savedSettings = loadSettings();
      openrouterApiKey = openrouterApiKey || savedSettings.openrouterApiKey;
      criteria = criteria || savedSettings.leadCriteria;
      console.log('📂 Загружены настройки из файла:', {
        hasApiKey: !!openrouterApiKey,
        hasCriteria: !!criteria
      });
    }
    
  // console.log(`📋 Request data: apiKey=${openrouterApiKey ? 'provided' : 'missing'}, criteria=${criteria ? 'provided' : 'missing'}, messages=${messages ? messages.length : 'none'}`);

  if (!openrouterApiKey || !criteria) {
    // console.error('❌ Missing required fields:', { openrouterApiKey: !!openrouterApiKey, criteria: !!criteria });
    return res.status(400).json({
      error: 'Missing required fields: openrouterApiKey and criteria are required'
    });
    }

    // Use messages from request body, or fallback to Google Sheets
    let messagesToAnalyze = messages;
    if (!messagesToAnalyze || messagesToAnalyze.length === 0) {
      console.log('📊 No messages in request body, getting from Google Sheets...');
      const { spreadsheetId, googleServiceAccountEmail, googlePrivateKey } = req.body;
      try {
        messagesToAnalyze = await getMessagesForAnalysis(spreadsheetId, googleServiceAccountEmail, googlePrivateKey);
        console.log(`📊 Retrieved ${messagesToAnalyze.length} messages from Google Sheets`);
      } catch (sheetsError) {
        console.error('❌ Error getting messages from Google Sheets:', sheetsError);
        return res.status(500).json({
          error: 'Failed to retrieve messages from Google Sheets',
          message: sheetsError.message
        });
      }
    } else {
      console.log(`📋 Using ${messagesToAnalyze.length} messages from request body`);
    }

    if (messagesToAnalyze.length === 0) {
      // console.log('⚠️ No messages found to analyze, using test message for demo');
      // Add a test message for demo purposes when no real messages are available
      messagesToAnalyze = [{
        id: 'test_msg_1',
        channel: 'test',
        author: 'test',
        username: 'test_user',
        message: 'test message',
        timestamp: '2024-01-01T00:00:00.000Z',
        userId: 'test_user_id',
        chatId: 'test_chat_id'
      }];
    }

    // Initialize Gemini service
    // console.log('🤖 Initializing Gemini service...');
    const GeminiServiceClass = require('../services/geminiService.js');
    const geminiService = new GeminiServiceClass();
    
    try {
      geminiService.initialize({ apiKey: openrouterApiKey });
      // console.log('✅ Gemini service initialized successfully');
    } catch (initError) {
      // console.error('❌ Failed to initialize Gemini service:', initError);
      return res.status(500).json({
        error: 'Failed to initialize Gemini service',
        message: initError.message
      });
    }

    // Analyze messages
    // console.log(`🔍 Starting analysis of ${messagesToAnalyze.length} messages...`);
    
    // Normalize criteria format - handle both string and object formats
    let normalizedCriteria;
    if (typeof criteria === 'string') {
      normalizedCriteria = { description: criteria };
    } else if (criteria && typeof criteria === 'object' && criteria.description) {
      normalizedCriteria = criteria;
    } else {
      // console.error('❌ Invalid criteria format:', criteria);
      return res.status(400).json({
        error: 'Invalid criteria format. Expected string or object with description field.'
      });
    }
    
    // console.log('📋 Normalized criteria:', normalizedCriteria);
    
    let analysisResult;
    try {
      analysisResult = await geminiService.analyzeMessagesForLeads(messagesToAnalyze, normalizedCriteria);
      // console.log('✅ Analysis completed successfully:', {
      //   leadsFound: analysisResult.leads ? analysisResult.leads.length : 0,
      //   totalAnalyzed: analysisResult.totalAnalyzed,
      //   processingTime: analysisResult.processingTime
      // });
      // If the analysis returned OpenRouter-style choices with JSON content, parse leads from it
      if ((!analysisResult.leads || (Array.isArray(analysisResult.leads) && analysisResult.leads.length === 0)) 
          && analysisResult.choices && Array.isArray(analysisResult.choices)) {
        try {
          const content = analysisResult.choices[0]?.message?.content || analysisResult.choices[0]?.text || '';
          const parsed = typeof content === 'string' ? JSON.parse(content) : content;
          if (parsed && parsed.leads && Array.isArray(parsed.leads)) {
            // Map parsed leads to normalized lead objects using source messages
            const msgById = new Map(messagesToAnalyze.map(m => [m.id, m]));
            const normalizedFromChoices = parsed.leads.map(l => {
              const src = msgById.get(l.messageId) || messagesToAnalyze[0] || {};
              return {
                id: l.messageId || src.id || Math.random().toString(36).slice(2),
                name: `${src.firstName || ''} ${src.lastName || ''}`.trim() || src.author || src.username || 'Unknown',
                firstName: src.firstName || null,
                lastName: src.lastName || null,
                username: src.username || 'невозможно получить юзернейм',
                channel: src.chatTitle || src.channel || 'Unknown',
                message: src.message || '',
                timestamp: src.timestamp || new Date().toISOString(),
                reason: l.reason || l.reasoning || 'Найден потенциальный лид',
                confidence: l.confidence || l.score || 0,
                sent: false,
              };
            });
            analysisResult.leads = normalizedFromChoices;
          }
        } catch (e) {
          // console.warn('Failed to parse choices content as leads:', e.message);
        }
      }
      // Ensure analysisResult.leads is an array for downstream processing
      const normalizedLeadsArr = Array.isArray(analysisResult.leads)
        ? analysisResult.leads
        : (analysisResult.leads ? Object.values(analysisResult.leads) : []);
      analysisResult.leads = normalizedLeadsArr;
    } catch (analysisError) {
      // console.error('❌ Analysis failed:', analysisError);
      return res.status(500).json({
        error: 'Failed to analyze messages',
        message: analysisError.message,
        stack: process.env.NODE_ENV === 'development' ? analysisError.stack : undefined
      });
    }

    // Store results
    const result = {
      ...analysisResult,
      timestamp: new Date().toISOString()
    };

    // Update stored leads - preserve existing leads and their statuses
    if (result.leads && result.leads.length > 0) {
      // Create a map of existing leads by their unique identifier
      const existingLeadsMap = new Map();
      storedLeads.forEach(lead => {
        const key = `${lead.channel}_${lead.username}_${lead.message}`;
        existingLeadsMap.set(key, lead);
      });
      
      // Merge new leads with existing ones, preserving statuses
      const mergedLeads = result.leads.map(newLead => {
        const key = `${newLead.channel}_${newLead.username}_${newLead.message}`;
        const existingLead = existingLeadsMap.get(key);
        
        if (existingLead) {
          // Preserve existing lead's status fields
          return {
            ...newLead,
            sent: existingLead.sent || false,
            contacted: existingLead.contacted || false,
            contactDate: existingLead.contactDate || null,
            contactStatus: existingLead.contactStatus || null
          };
        }
        
        return {
          ...newLead,
          sent: false,
          contacted: false,
          contactDate: null,
          contactStatus: null
        };
      });
      
      // Add any existing leads that weren't found in the new analysis
      const newLeadKeys = new Set(result.leads.map(lead => `${lead.channel}_${lead.username}_${lead.message}`));
      const preservedLeads = storedLeads.filter(lead => {
        const key = `${lead.channel}_${lead.username}_${lead.message}`;
        return !newLeadKeys.has(key);
      });
      
      storedLeads = [...mergedLeads, ...preservedLeads];
    }
    lastAnalysisResult = result;

    // Save leads to Лиды in Google Sheets if there are any leads
    if (result.leads && result.leads.length > 0) {
      try {
        const targetSpreadsheetId = spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID;
        
        if (targetSpreadsheetId && !targetSpreadsheetId.includes('mock')) {
          // Initialize if not already
          if (!googleSheetsService.isInitialized()) {
            const clientEmail = googleServiceAccountEmail || process.env.GOOGLE_SHEETS_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
            const privateKey = googlePrivateKey || process.env.GOOGLE_SHEETS_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
            await googleSheetsService.initialize({
              clientEmail,
              privateKey,
              projectId: process.env.GOOGLE_SHEETS_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || 'default-project'
            });
          }
          // Append leads (spreadsheetId, sheetName, leads)
          await googleSheetsService.appendLeads(targetSpreadsheetId, 'Лиды', result.leads);
          console.log(`✅ Successfully saved ${result.leads.length} leads to Лиды`);
        } else {
          console.log('⚠️ No valid spreadsheet ID configured for saving leads');
        }
      } catch (sheetsError) {
        console.error('❌ Error saving leads to Лиды:', sheetsError);
      }
    }

    res.json(result);

  } catch (error) {
    // console.error('Error analyzing leads:', error);
    res.status(500).json({ 
      error: 'Failed to analyze leads',
      message: error.message 
    });
  }
});

// Create a new lead
router.post('/', async (req, res) => {
  try {
    const leadData = req.body;
    
    // Validate required fields
    if (!leadData.name || !leadData.contact) {
      return res.status(400).json({ 
        error: 'Missing required fields: name and contact are required' 
      });
    }

    // Add metadata to the lead
    const newLead = {
      ...leadData,
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: leadData.timestamp || new Date().toISOString(),
      analysisTimestamp: new Date().toISOString()
    };

    // Add to in-memory storage
    storedLeads.push(newLead);

    // Try to save to Google Sheets
    try {
      await googleSheetsService.saveLead(newLead);
      console.log('✅ Lead saved to Google Sheets:', newLead.name);
    } catch (error) {
      console.log('⚠️ Failed to save lead to Google Sheets (using mock mode):', error.message);
    }

    res.json({ 
      success: true, 
      message: 'Lead created successfully',
      lead: newLead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Clear all leads
router.delete('/', (req, res) => {
  try {
    storedLeads = [];
    lastAnalysisResult = null;
    // Сбрасываем флаг инициализации и вспомогательные структуры,
    // чтобы следующий запрос заново подтянул данные из Google Sheets
    leadsInitialized = false;
    leadResponses = [];
    chatHistory = new Map();
    res.json({ message: 'All leads cleared successfully', leadsInitialized });
  } catch (error) {
    // console.error('Error clearing leads:', error);
    res.status(500).json({ error: 'Failed to clear leads' });
  }
});

// Store analyzed leads
router.post('/store', (req, res) => {
  try {
    const { leads: newLeads, analysisTimestamp, criteria } = req.body;
    
    // Normalize leads input to array (handle object maps from some analyzers)
    let incomingLeads = newLeads;
    if (!incomingLeads) {
      return res.status(400).json({ error: 'Invalid leads data' });
    }
    const normalizedIncomingLeads = Array.isArray(incomingLeads)
      ? incomingLeads
      : (typeof incomingLeads === 'object' ? Object.values(incomingLeads) : []);
    if (!Array.isArray(normalizedIncomingLeads) || normalizedIncomingLeads.length === 0) {
      return res.status(400).json({ error: 'Invalid leads data (empty after normalization)' });
    }
    
    // Add metadata to each lead
    const leadsWithMetadata = normalizedIncomingLeads.map(lead => ({
      ...lead,
      analysisTimestamp: analysisTimestamp || new Date().toISOString(),
      criteria: criteria || 'Unknown criteria',
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    
    // Add new leads to existing storage (append instead of replace)
    storedLeads = [...storedLeads, ...leadsWithMetadata];
    
    // Update last analysis result
    lastAnalysisResult = {
      leads: leadsWithMetadata,
      timestamp: analysisTimestamp || new Date().toISOString(),
      totalAnalyzed: leadsWithMetadata.length
    };
    
    // console.log(`📝 Stored ${newLeads.length} new leads`);
    
    res.json({ 
      success: true, 
      message: `Successfully stored ${normalizedIncomingLeads.length} leads`,
      leadsStored: normalizedIncomingLeads.length
    });
  } catch (error) {
    // console.error('Error storing leads:', error);
    res.status(500).json({ error: 'Failed to store leads' });
  }
});

// Get analysis statistics
router.get('/stats', (req, res) => {
  try {
    const stats = {
      totalLeads: storedLeads.length,
      lastAnalysisTime: lastAnalysisResult?.timestamp || null,
      averageConfidence: storedLeads.length > 0 
        ? storedLeads.reduce((sum, lead) => sum + lead.confidence, 0) / storedLeads.length 
        : 0,
      channelDistribution: getChannelDistribution(storedLeads)
    };
    
    res.json(stats);
  } catch (error) {
    // console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Generate personalized message for a lead
router.post('/generate-message', async (req, res) => {
  try {
    const { lead, openrouterApiKey, messageContext, aiPrompt, leadSearchCriteria } = req.body;
    
    console.log('🔍 Генерация сообщения - полученные данные:');
    console.log('- aiPrompt:', aiPrompt);
    console.log('- aiPrompt length:', aiPrompt ? aiPrompt.length : 0);
    console.log('- messageContext:', messageContext);
    console.log('- leadSearchCriteria:', leadSearchCriteria);
    console.log('- lead:', lead?.firstName, lead?.lastName);
    
    if (!lead || !openrouterApiKey) {
      return res.status(400).json({ 
        error: 'Lead data and OpenRouter API key are required' 
      });
    }

    // Check for mock API key
    const isMockApiKey = !openrouterApiKey ||
                        openrouterApiKey === 'mock' ||
                        openrouterApiKey === 'your_api_key_here' ||
                        openrouterApiKey === 'test_key' ||
                        openrouterApiKey === 'sk-test';

    if (isMockApiKey) {
      // В mock режиме тоже используем пользовательский промпт если он есть
      let mockMessage;
      
      if (aiPrompt && aiPrompt.trim()) {
        // Простая имитация выполнения пользовательского промпта с контекстом
        const leadName = lead.firstName || lead.name || lead.author || 'друг';
        // Создаем короткое сообщение согласно промпту с учетом контекста поиска
        mockMessage = `Привет, ${leadName}! Увидел ваш интерес к теме "${leadSearchCriteria || 'бизнес'}" - давайте встретимся для обсуждения!`;
      } else {
        // Стандартное mock сообщение
        mockMessage = `Привет, ${lead.firstName || 'друг'}! 

Увидел ваше сообщение в чате "${lead.channel}" и подумал, что у нас могут быть общие интересы в бизнесе. 

${lead.message ? `Особенно заинтересовало: "${lead.message.length > 100 ? lead.message.substring(0, 100) + '...' : lead.message}"` : ''}

Было бы интересно обсудить возможности сотрудничества. Готов поделиться опытом и обсудить взаимовыгодные варианты.

С уважением!`;
      }

      return res.json({
        success: true,
        message: mockMessage,
        mock: true
      });
    }

    // Use GeminiService or OpenRouter to generate personalized message
    try {
      let prompt;
      
      console.log('🔧 Формирование промпта:');
      console.log('- Есть пользовательский aiPrompt:', !!(aiPrompt && aiPrompt.trim()));
      
      if (aiPrompt && aiPrompt.trim()) {
        // Используем пользовательский промпт с контекстом поиска лидов
        const leadName = lead.name || lead.author || lead.firstName || 'Неизвестно';
        const leadLastName = lead.lastName || '';
        const fullName = `${leadName} ${leadLastName}`.trim();
        const username = lead.username || 'неизвестен';
        const channel = lead.channel || lead.chatTitle || 'Неизвестно';
        const message = lead.message || '';
        
        prompt = `КОНТЕКСТ ПРИЛОЖЕНИЯ:
Ты помогаешь пользователю написать персональное сообщение лиду, которого нашли через сканирование Telegram-чатов по критериям поиска.

КРИТЕРИИ ПОИСКА ЛИДОВ: ${leadSearchCriteria || 'Не указаны'}

ДАННЫЕ НАЙДЕННОГО ЛИДА:
- Имя: ${fullName}
- Username: @${username}
- Канал/Чат где найден: ${channel}
- Сообщение лида: "${message}"
${messageContext ? `- Дополнительный контекст: ${messageContext}` : ''}

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
1. НИКОГДА не используй плейсхолдеры типа [Ваше Имя], [Название компании], [Ваша компания] и т.п.
2. Пиши от первого лица с конкретным именем (например: "Меня зовут Дмитрий")
3. Создай ГОТОВОЕ сообщение для отправки
4. Используй данные лида и критерии поиска для персонализации
5. Объясни, как ты нашел лида (через его сообщение в чате)
6. Предложи конкретную ценность или сотрудничество

ПРИМЕРЫ ПРАВИЛЬНЫХ СООБЩЕНИЙ (БЕЗ ПЛЕЙСХОЛДЕРОВ):

Пример 1:
"Привет! Меня зовут Дмитрий. Увидел твое сообщение в чате про поиск разработчиков. Занимаюсь созданием веб-приложений уже 5 лет. Могу помочь с твоим проектом. Давай обсудим детали?"

Пример 2:
"Здравствуй! Меня зовут Анна, я маркетолог. Заметила твой пост о продвижении бизнеса в соцсетях. У меня есть опыт работы с подобными задачами. Готова поделиться идеями. Интересно?"

Пример 3:
"Привет! Меня зовут Максим. Прочитал твое сообщение о поиске дизайнера. Создаю логотипы и фирменный стиль для малого бизнеса. Могу показать портфолио. Напишешь?"

ЗАДАЧА: Напиши персональное сообщение для лида ${fullName} (@${username}), учитывая его сообщение "${message}" из чата "${channel}". Используй критерии поиска для понимания контекста.

${aiPrompt}

Напиши готовое сообщение БЕЗ ПЛЕЙСХОЛДЕРОВ:`;
        
        // Логируем полный промпт для отладки
        console.log('=== ПОЛНЫЙ ПРОМПТ ДЛЯ ИИ ===');
        console.log(prompt);
        console.log('=== КОНЕЦ ПРОМПТА ===');
        
        console.log('✅ Используется пользовательский промпт с контекстом поиска лидов');
      } else {
        // Минимальный стандартный промпт если пользовательский не задан
        const leadName = lead.name || lead.author || lead.firstName || 'Неизвестно';
        const leadLastName = lead.lastName || '';
        const fullName = `${leadName} ${leadLastName}`.trim();
        const username = lead.username || 'неизвестен';
        const channel = lead.channel || lead.chatTitle || 'Неизвестно';
        const message = lead.message || '';
        
        prompt = `КОНТЕКСТ ПРИЛОЖЕНИЯ:
Ты помогаешь пользователю написать персональное сообщение лиду, которого нашли через сканирование Telegram-чатов по критериям поиска.

КРИТЕРИИ ПОИСКА ЛИДОВ: ${leadSearchCriteria || 'Не указаны'}

ДАННЫЕ НАЙДЕННОГО ЛИДА:
- Имя: ${fullName}
- Username: @${username}
- Канал/Чат где найден: ${channel}
- Сообщение лида: "${message}"

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:
1. НИКОГДА не используй плейсхолдеры типа [Ваше Имя], [Название компании], [Ваша компания] и т.п.
2. Пиши от первого лица с конкретным именем (например: "Меня зовут Дмитрий")
3. Создай ГОТОВОЕ сообщение для отправки
4. Используй данные лида и критерии поиска для персонализации
5. Объясни, как ты нашел лида (через его сообщение в чате)
6. Предложи конкретную ценность или сотрудничество

ПРИМЕРЫ ПРАВИЛЬНЫХ СООБЩЕНИЙ (БЕЗ ПЛЕЙСХОЛДЕРОВ):

Пример 1:
"Привет! Меня зовут Дмитрий. Увидел твое сообщение в чате про поиск разработчиков. Занимаюсь созданием веб-приложений уже 5 лет. Могу помочь с твоим проектом. Давай обсудим детали?"

Пример 2:
"Здравствуй! Меня зовут Анна, я маркетолог. Заметила твой пост о продвижении бизнеса в соцсетях. У меня есть опыт работы с подобными задачами. Готова поделиться идеями. Интересно?"

Пример 3:
"Привет! Меня зовут Максим. Прочитал твое сообщение о поиске дизайнера. Создаю логотипы и фирменный стиль для малого бизнеса. Могу показать портфолио. Напишешь?"

ЗАДАЧА: Напиши персональное сообщение для лида ${fullName} (@${username}), учитывая его сообщение "${message}" из чата "${channel}". Используй критерии поиска для понимания контекста.

Напиши готовое сообщение БЕЗ ПЛЕЙСХОЛДЕРОВ:`;

        // Логируем полный промпт для отладки
        console.log('=== ПОЛНЫЙ ПРОМПТ ДЛЯ ИИ (СТАНДАРТНЫЙ) ===');
        console.log(prompt);
        console.log('=== КОНЕЦ ПРОМПТА ===');
        
        console.log('⚠️ Используется минимальный стандартный промпт с контекстом поиска лидов');
      }
      
      // ПОЛНОЕ ЛОГИРОВАНИЕ ПРОМПТА ДЛЯ ОТЛАДКИ
      console.log('🔍 ПОЛНЫЙ ПРОМПТ ДЛЯ ИИ:');
      console.log('=' * 80);
      console.log(prompt);
      console.log('=' * 80);

      // Try to use OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Telegram Lead Scanner'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content: `Ты профессиональный менеджер по продажам. Твоя задача - написать ГОТОВОЕ персонализированное сообщение для лида.

КРИТИЧЕСКИ ВАЖНО - ЗАПРЕЩЕНО:
- Использовать квадратные скобки [ ] в тексте
- Писать [Ваше Имя], [Название компании], [Ваша компания], [Имя], [Фамилия]
- Использовать любые плейсхолдеры или заполнители
- Оставлять пустые места для заполнения

ОБЯЗАТЕЛЬНО:
- Пиши конкретное имя: "Меня зовут Дмитрий" или "Меня зовут Анна"
- Создавай полностью готовое к отправке сообщение
- Используй только реальные данные из контекста
- Если нет конкретного имени - используй "Меня зовут Александр"

ПРИМЕРЫ ПРАВИЛЬНЫХ ФРАЗ:
✅ "Меня зовут Дмитрий"
✅ "Я Анна, маркетолог"
✅ "Меня зовут Максим, работаю в IT"

ПРИМЕРЫ ЗАПРЕЩЕННЫХ ФРАЗ:
❌ "Меня зовут [Ваше Имя]"
❌ "Я [Имя], работаю в [Компания]"
❌ "От [Ваше Имя]"`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedMessage = data.choices?.[0]?.message?.content?.trim();

      if (!generatedMessage) {
        throw new Error('No message generated from OpenRouter API');
      }

      res.json({
        success: true,
        message: generatedMessage
      });

    } catch (aiError) {
      console.error('Error generating message with AI:', aiError);
      
      // Fallback: создаем простое сообщение на основе пользовательского промпта
      let fallbackMessage;
      
      if (aiPrompt && aiPrompt.trim()) {
        // Создаем простое сообщение следуя инструкциям пользовательского промпта
        const leadName = lead.firstName || lead.name || lead.author || 'друг';
        
        // Анализируем промпт на ключевые слова для создания соответствующего сообщения
        const promptLower = aiPrompt.toLowerCase();
        
        if (promptLower.includes('короткое') || promptLower.includes('кратко')) {
          // Короткое сообщение
          if (promptLower.includes('встрет') || promptLower.includes('обсуд')) {
            // Правильно обрабатываем кириллические символы
            const safeMessage = lead.message ? Buffer.from(lead.message, 'utf8').toString('utf8') : '';
            const messagePreview = safeMessage && safeMessage.length > 0 ? 
              (safeMessage.length > 50 ? safeMessage.substring(0, 50) + '...' : safeMessage) : 
              'ваш интерес к теме';
            fallbackMessage = `Привет, ${leadName}! Увидел ваше сообщение про "${messagePreview}". Давайте встретимся для обсуждения!`;
          } else {
            fallbackMessage = `Привет, ${leadName}! Заинтересовало ваше сообщение. Можем обсудить детали?`;
          }
        } else if (promptLower.includes('дружелюбн')) {
          // Дружелюбное сообщение
          const safeChannel = lead.channel ? Buffer.from(lead.channel, 'utf8').toString('utf8') : 'чате';
          fallbackMessage = `Привет, ${leadName}! Увидел ваше сообщение в "${safeChannel}" и подумал, что у нас могут быть общие интересы. Было бы здорово пообщаться!`;
        } else {
          // Общий случай - простое персонализированное сообщение
          const safeMessage = lead.message ? Buffer.from(lead.message, 'utf8').toString('utf8') : '';
          const messagePreview = safeMessage && safeMessage.length > 0 ? 
            (safeMessage.length > 100 ? safeMessage.substring(0, 100) + '...' : safeMessage) : 
            'ваш интерес к теме';
          fallbackMessage = `Привет, ${leadName}! Заметил ваше сообщение про "${messagePreview}". Интересно обсудить это подробнее!`;
        }
        
        console.log('✅ Fallback: создано сообщение на основе пользовательского промпта');
      } else {
        // Стандартное fallback сообщение
        fallbackMessage = `Привет! Заметил ваше сообщение в ${lead.channel || 'чате'} и хотел бы обсудить возможности сотрудничества.

КОНТЕКСТ ЛИДА:
- Имя: ${lead.name || lead.author || lead.firstName || 'Неизвестно'} ${lead.lastName || ''}
- Канал: ${lead.channel || 'Неизвестно'}
- Сообщение: ${lead.message || 'Не указано'}
- Дата: ${lead.date || 'Не указана'}

Буду рад обсуждению!`;
      }

      res.json({
        success: true,
        message: fallbackMessage,
        fallback: true,
        aiError: aiError.message
      });
    }

  } catch (error) {
    console.error('Error in generate-message endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to generate message', 
      message: error.message 
    });
  }
});

// Helper function to get messages for analysis
async function getMessagesForAnalysis(requestSpreadsheetId, googleServiceAccountEmail, googlePrivateKey) {
  try {
    // Use spreadsheet ID from request or fallback to environment variable
    const spreadsheetId = requestSpreadsheetId || process.env.GOOGLE_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
      // console.warn('⚠️ No spreadsheet ID provided in request or environment, returning empty array');
      return [];
    }
    
    if (spreadsheetId.includes('mock')) {
      // console.warn('⚠️ Mock spreadsheet ID detected, returning empty array');
      return [];
    }
    
    // console.log(`📊 Getting messages from Google Sheets: ${spreadsheetId}`);
    
    // Get data from Google Sheets using service
    if (!googleSheetsService.isInitialized()) {
      await googleSheetsService.initialize({
        spreadsheetId,
        googleServiceAccountEmail,
        googlePrivateKey
      });
    }
    
    const rows = await googleSheetsService.getSheetData('Сообщения', 'A:I');
    
    if (!rows || rows.length === 0) {
      // console.error('❌ No data received from Google Sheets');
      return [];
    }
    
    if (rows.length <= 1) {
      // console.log('📝 No data rows found in spreadsheet (only headers or empty)');
      return [];
    }
    
    // Skip header row and parse messages
    const messages = [];
    const seenMessageIds = new Set(); // Track unique message IDs to prevent duplicates
    const headers = rows[0] || [];
    
    // Expected headers: ['Timestamp', 'Chat Title', 'Username', 'First Name', 'Last Name', 'User ID', 'Message', 'Chat ID', 'Message Type']
    const timestampIndex = headers.indexOf('Timestamp');
    const chatTitleIndex = headers.indexOf('Chat Title');
    const usernameIndex = headers.indexOf('Username');
    const firstNameIndex = headers.indexOf('First Name');
    const lastNameIndex = headers.indexOf('Last Name');
    const userIdIndex = headers.indexOf('User ID');
    const messageIndex = headers.indexOf('Message');
    const chatIdIndex = headers.indexOf('Chat ID');
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (!row || row.length === 0 || !row[messageIndex]) {
        continue;
      }
      
      // Create unique ID based on message content and user to prevent duplicates
      const messageContent = row[messageIndex] || '';
      const userId = row[userIdIndex] || 'unknown';
      const chatId = row[chatIdIndex] || 'unknown';
      const timestamp = row[timestampIndex] || new Date().toISOString();
      
      // Generate hash-like ID from content to prevent duplicates
      const contentHash = Buffer.from(`${userId}_${chatId}_${messageContent}_${timestamp}`).toString('base64').slice(0, 16);
      
      const message = {
        id: `msg_${contentHash}`,
        channel: row[chatTitleIndex] || 'Unknown Channel',
        author: `${row[firstNameIndex] || ''} ${row[lastNameIndex] || ''}`.trim() || 'Unknown User',
        username: row[usernameIndex] && row[usernameIndex] !== 'невозможно получить юзернейм' ? row[usernameIndex] : 'невозможно получить юзернейм',
        message: messageContent,
        timestamp: timestamp,
        userId: userId,
        chatId: chatId
      };
      
      // Only add messages with actual content and prevent duplicates
      if (message.message.trim() && !seenMessageIds.has(message.id)) {
        seenMessageIds.add(message.id);
        messages.push(message);
      } else if (seenMessageIds.has(message.id)) {
        // console.log(`⚠️ Skipping duplicate message with ID: ${message.id}`);
      }
    }
    
    // console.log(`📊 Loaded ${messages.length} messages from Google Sheets for analysis`);
    return messages;
    
  } catch (error) {
    // console.error('❌ Error getting messages from Google Sheets:', error);
    return [];
  }
}

// Helper function to get channel distribution
function getChannelDistribution(leads) {
  const distribution = {};
  leads.forEach(lead => {
    distribution[lead.channel] = (distribution[lead.channel] || 0) + 1;
  });
  return distribution;
}

// Получить все ответы от лидов
router.get('/responses', (req, res) => {
  try {
    res.json({
      responses: leadResponses,
      total: leadResponses.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get lead responses' });
  }
});

// Добавить новый ответ от лида
router.post('/responses', async (req, res) => {
  try {
    const { leadId, leadName, message, timestamp, chatId } = req.body;
    
    if (!leadId || !message) {
      return res.status(400).json({ error: 'Lead ID and message are required' });
    }

    const response = {
      id: Date.now().toString(),
      leadId,
      leadName: leadName || 'Unknown',
      message,
      timestamp: timestamp || new Date().toISOString(),
      chatId: chatId || null,
      read: false
    };

    leadResponses.push(response);

    // Добавляем ответ лида в историю чата
    const chatMessage = {
      id: response.id,
      leadId: leadId,
      message: message,
      timestamp: response.timestamp,
      isFromLead: true, // Сообщение от лида
      chatId: chatId
    };
    
    if (!chatHistory.has(leadId)) {
      chatHistory.set(leadId, []);
    }
    
    chatHistory.get(leadId).push(chatMessage);

    // Сохранить в Google Sheets (лист "Связались")
    try {
      // Инициализируем Google Sheets сервис если не инициализирован
      if (!googleSheetsService.isInitialized()) {
        await googleSheetsService.initialize(null, true); // mock mode
      }
      
      await googleSheetsService.appendToSheet('Связались', [
        [
          leadId,
          leadName || 'Unknown',
          chatId,
          message,
          new Date().toISOString(),
          'Отправлено',
          'Связались'
        ]
      ]);
      
      console.log('✅ Message recorded in Google Sheets');
    } catch (sheetsError) {
      console.error('Error saving message to Google Sheets:', sheetsError);
      // Не возвращаем ошибку, так как ответ уже сохранен в памяти
    }

    res.json({
      success: true,
      response
    });
  } catch (error) {
    console.error('Error adding lead response:', error);
    res.status(500).json({ error: 'Failed to add lead response' });
  }
});

// Отметить ответ как прочитанный
router.patch('/responses/:id/read', (req, res) => {
  try {
    const { id } = req.params;
    const response = leadResponses.find(r => r.id === id);
    
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    response.read = true;
    
    res.json({
      success: true,
      response
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark response as read' });
  }
});

// Пометить лида как связались
router.patch('/contact/:id', async (req, res) => {
  try {
    const leadId = req.params.id;
    const { contacted = true, contactDate = new Date().toISOString(), leadName, leadUsername, channel, message, accountUsed } = req.body;
    
    // Найти лида в массиве
    let leadIndex = storedLeads.findIndex(lead => lead.id === leadId);
    let lead = null;
    let isSheetLead = false;
    
    if (leadIndex !== -1) {
      // Лид найден в локальном хранилище
      lead = storedLeads[leadIndex];
      storedLeads[leadIndex].contacted = contacted;
      storedLeads[leadIndex].contactDate = contactDate;
    } else if (leadId.startsWith('sheet-lead-')) {
      // Это лид из Google Sheets
      isSheetLead = true;
      lead = {
        id: leadId,
        author: leadName || 'Unknown',
        username: leadUsername || '',
        channel: channel || '',
        contacted: contacted,
        contactDate: contactDate
      };
    } else {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    // Сохранить в Google Sheets если есть API ключ
    if (process.env.GOOGLE_SHEETS_API_KEY || req.headers['x-api-key']) {
      try {
        const apiKey = process.env.GOOGLE_SHEETS_API_KEY || req.headers['x-api-key'];
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID || req.headers['x-spreadsheet-id'];
        
        if (apiKey && spreadsheetId) {
          // Обновить основной лист лидов
          const range = `Лиды!A:Z`;
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
          
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.values) {
            // Найти строку с этим лидом и обновить
            const headers = data.values[0];
            const contactedIndex = headers.indexOf('contacted');
            const contactDateIndex = headers.indexOf('contactDate');
            
            for (let i = 1; i < data.values.length; i++) {
              if (data.values[i][0] === leadId) { // Предполагаем, что ID в первой колонке
                if (contactedIndex !== -1) {
                  data.values[i][contactedIndex] = contacted.toString();
                }
                if (contactDateIndex !== -1) {
                  data.values[i][contactDateIndex] = contactDate;
                }
                break;
              }
            }
            
            // Обновить данные в Google Sheets
            const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW&key=${apiKey}`;
            await fetch(updateUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                values: data.values
              })
            });
          }
          
          // Добавить запись в лист "Связались" если лид помечен как связались
          if (contacted) {
            const contactsRange = `Связались!A:G`;
            const contactsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${contactsRange}:append?valueInputOption=RAW&key=${apiKey}`;
            
            const contactRecord = [
              lead.id,
              lead.author || lead.name || leadName || 'Unknown',
              lead.username || leadUsername || '',
              contactDate,
              lead.channel || channel || '',
              message || '',
              accountUsed || ''
            ];
            
            await fetch(contactsUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                values: [contactRecord]
              })
            });
          }
        }
      } catch (error) {
        console.error('Error updating Google Sheets:', error);
        // Продолжаем выполнение даже если не удалось обновить Google Sheets
      }
    }
    
    res.json({
      success: true,
      lead: lead
    });
    
  } catch (error) {
    console.error('Error updating lead contact status:', error);
    res.status(500).json({ error: 'Failed to update lead contact status' });
  }
});

// Получить историю чата с лидом
router.get('/chat/:leadId', (req, res) => {
  try {
    const { leadId } = req.params;
    const messages = chatHistory.get(leadId) || [];
    
    res.json({
      success: true,
      messages: messages
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Отправить сообщение лиду
router.post('/send-message', async (req, res) => {
  try {
    const { leadId, leadName, chatId, message } = req.body;
    
    if (!leadId || !message || !chatId) {
      return res.status(400).json({ error: 'leadId, message, and chatId are required' });
    }
    
    // Получаем настройки аккаунта из переменных окружения или заголовков
    const accountId = process.env.TELEGRAM_ACCOUNT_ID || req.headers['x-account-id'];
    const apiId = process.env.TELEGRAM_API_ID || req.headers['x-api-id'];
    const apiHash = process.env.TELEGRAM_API_HASH || req.headers['x-api-hash'];
    const sessionString = process.env.TELEGRAM_SESSION || req.headers['x-session'];
    const phoneNumber = process.env.TELEGRAM_PHONE || req.headers['x-phone'];
    
    if (!apiId || !apiHash) {
      return res.status(400).json({ error: 'Telegram API credentials are required' });
    }
    
    // Отправляем сообщение через Telegram API
    const telegramResponse = await fetch('http://localhost:3001/api/telegram/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUsername: chatId,
        message: message,
        accountId: accountId,
        apiId: apiId,
        apiHash: apiHash,
        sessionString: sessionString,
        phoneNumber: phoneNumber
      })
    });
    
    const telegramResult = await telegramResponse.json();
    
    if (!telegramResult.success) {
      return res.status(500).json({ error: 'Failed to send message via Telegram' });
    }
    
    // Сохраняем сообщение в историю чата
    const chatMessage = {
      id: Date.now().toString(),
      leadId: leadId,
      message: message,
      timestamp: new Date().toISOString(),
      isFromLead: false, // Сообщение от нас
      chatId: chatId
    };
    
    if (!chatHistory.has(leadId)) {
      chatHistory.set(leadId, []);
    }
    
    chatHistory.get(leadId).push(chatMessage);
    
    // Записываем отправленное сообщение в Google Sheets (лист "Связались")
    try {
      // Инициализируем Google Sheets сервис если не инициализирован
      if (!googleSheetsService.isInitialized()) {
        await googleSheetsService.initialize(null, true); // mock mode
      }
      
      await googleSheetsService.appendToSheet('Связались', [
        [
          leadId,
          leadName || 'Unknown',
          chatId,
          message,
          new Date().toISOString(),
          'Отправлено',
          'Связались'
        ]
      ]);
      
      console.log('✅ Message recorded in Google Sheets');
    } catch (sheetsError) {
      console.error('Error saving message to Google Sheets:', sheetsError);
      // Не возвращаем ошибку, так как сообщение уже отправлено
    }
    
    // Обновляем статус лида в основном списке лидов
    try {
      const leadIndex = storedLeads.findIndex(lead => lead.id === leadId);
      if (leadIndex !== -1) {
        storedLeads[leadIndex].contactStatus = 'Связались';
        storedLeads[leadIndex].contactDate = new Date().toISOString();
        console.log('✅ Lead status updated to "Связались"');
      }
    } catch (statusError) {
      console.error('Error updating lead status:', statusError);
    }
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      chatMessage: chatMessage
    });
    
  } catch (error) {
    console.error('Error sending message to lead:', error);
    res.status(500).json({ error: 'Failed to send message to lead' });
  }
});

// Тестовый endpoint для проверки записи в Google Sheets без отправки Telegram сообщения
router.post('/test-contact-recording', async (req, res) => {
  try {
    const { leadId, message, leadName, chatId } = req.body;
    
    console.log('🧪 Testing contact recording to Google Sheets...');
    console.log('📋 Data:', { leadId, leadName, chatId, message });
    
    // Записываем отправленное сообщение в Google Sheets (лист "Связались")
    try {
      // Используем глобальный экземпляр googleSheetsService
      if (!googleSheetsService.isInitialized()) {
        console.log('⚠️ GoogleSheetsService not initialized, using mock mode');
        // Инициализируем в mock режиме для тестирования
        await googleSheetsService.initialize({
          privateKey: 'MOCK_KEY',
          clientEmail: 'mock@example.com',
          projectId: 'mock_project'
        });
      }
      
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID || 'test_spreadsheet_id';
      
      await googleSheetsService.appendToSheet(
        spreadsheetId,
        'Связались',
        [
          leadId,
          leadName || 'Unknown',
          chatId,
          message,
          new Date().toISOString(),
          'Тест',
          'Связались'
        ]
      );
      
      console.log('✅ Test message recorded in Google Sheets');
      
      // Обновляем статус лида в основном списке лидов
      const leadIndex = storedLeads.findIndex(lead => lead.id === leadId);
      if (leadIndex !== -1) {
        storedLeads[leadIndex].contactStatus = 'Связались';
        storedLeads[leadIndex].contactDate = new Date().toISOString();
        console.log('✅ Lead status updated to "Связались"');
      }
      
      res.json({
        success: true,
        message: 'Test contact recording successful',
        recorded: true,
        mock: googleSheetsService.isMockMode()
      });
      
    } catch (sheetsError) {
      console.error('❌ Error saving test message to Google Sheets:', sheetsError);
      res.status(500).json({ 
        error: 'Failed to record test contact in Google Sheets',
        details: sheetsError.message 
      });
    }
    
  } catch (error) {
    console.error('❌ Error in test contact recording:', error);
    res.status(500).json({ error: 'Failed to test contact recording' });
  }
});

module.exports = router;
module.exports.getStoredLeads = () => storedLeads;