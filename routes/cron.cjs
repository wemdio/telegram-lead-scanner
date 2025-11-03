const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const { getGoogleSheetsClient } = require('../services/googleSheetsService.cjs');

const router = express.Router();

// Хранилище для cron job
let cronJob = null;
let isRunning = false;
let lastRun = null;
let nextRun = null;
const scheduleDescription = 'Каждые 30 минут (в 0 и 30 минут)';

function computeNextRun(fromDate = new Date()) {
  const d = new Date(fromDate);
  d.setSeconds(0, 0);
  const minutes = d.getMinutes();
  if (minutes < 30) {
    d.setMinutes(30);
  } else {
    d.setMinutes(0);
    d.setHours(d.getHours() + 1);
  }
  return d;
}

// Функция для отправки новых лидов в Telegram
async function sendNewLeadsToTelegram() {
  let sentCount = 0;
  try {
    console.log('🚀 Начинаем отправку новых лидов в Telegram...');
    
    let spreadsheetId;
    let botToken, channelId;
    
    // Сначала получаем базовые настройки для доступа к Google Sheets
    try {
      const settingsResponse = await axios.get('http://localhost:3001/api/settings/google-sheets');
      if (settingsResponse.data.success) {
        spreadsheetId = settingsResponse.data.spreadsheetId;
        console.log('📊 Получен spreadsheetId из localStorage');
      } else {
        console.log('⚠️ Не удалось получить spreadsheetId из localStorage, используем переменные окружения');
        spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
      }
    } catch (error) {
      console.log('⚠️ Ошибка при получении spreadsheetId из localStorage, используем переменные окружения:', error.message);
      spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    }
    
    if (!spreadsheetId) {
      console.log('❌ Не настроен spreadsheetId, используем mock режим для тестирования');
      // В mock режиме используем фиктивный spreadsheetId
      spreadsheetId = 'mock_spreadsheet_id_12345';
    }

    // Пытаемся получить настройки из вкладки "Настройки TG" в Google Sheets
    // Для этого нужна минимальная инициализация с базовыми credentials
    let sheetSettingsFound = false;
    
    try {
      console.log('📋 Пытаемся получить настройки из вкладки "Настройки TG"...');
      
      // Сначала инициализируем с базовыми настройками из localStorage для доступа к листу
      try {
        const baseSettingsResponse = await axios.get('http://localhost:3001/api/settings/google-sheets');
        if (baseSettingsResponse.data.success) {
          const { serviceAccountEmail, privateKey } = baseSettingsResponse.data;
          
          const baseInitResponse = await axios.post('http://localhost:3001/api/sheets/auto-initialize', {
            googleServiceAccountEmail: serviceAccountEmail,
            googlePrivateKey: privateKey,
            googleSpreadsheetId: spreadsheetId
          });
          
          if (baseInitResponse.data.success) {
            console.log('✅ Базовая инициализация Google Sheets выполнена');
          }
        }
      } catch (baseInitError) {
        console.log('⚠️ Ошибка базовой инициализации:', baseInitError.message);
      }
      
      const sheetSettingsResponse = await axios.get(`http://localhost:3001/api/sheets/settings/${spreadsheetId}`);
      
      if (sheetSettingsResponse.data.success && sheetSettingsResponse.data.settings) {
        const settings = sheetSettingsResponse.data.settings;
        botToken = settings.telegramBotToken;
        channelId = settings.telegramChannelId;
        sheetSettingsFound = true;
        
        // Если в листе есть настройки Google Sheets, обновляем их и переинициализируем
        if (settings.serviceAccountEmail && settings.privateKey) {
          console.log('🔄 Обновляем настройки Google Sheets из листа...');
          try {
            const updateResponse = await axios.post('http://localhost:3001/api/settings/google-sheets', {
              serviceAccountEmail: settings.serviceAccountEmail,
              privateKey: settings.privateKey,
              spreadsheetId: spreadsheetId
            });
            
            if (updateResponse.data.success) {
              console.log('✅ Настройки Google Sheets обновлены из листа');
              
              // Переинициализируем клиент с реальными настройками из листа
              const reinitResponse = await axios.post('http://localhost:3001/api/sheets/auto-initialize', {
                googleServiceAccountEmail: settings.serviceAccountEmail,
                googlePrivateKey: settings.privateKey,
                googleSpreadsheetId: spreadsheetId
              });
              
              if (reinitResponse.data.success) {
                console.log('✅ Google Sheets клиент переинициализирован с реальными настройками из листа');
              }
            }
          } catch (updateError) {
            console.log('⚠️ Ошибка обновления настроек Google Sheets:', updateError.message);
          }
        }
        
        console.log('📱 Получены настройки Telegram из листа "Настройки TG"');
      } else {
        console.log('⚠️ Не удалось получить настройки из листа');
        throw new Error('Settings not found in sheet');
      }
    } catch (sheetError) {
      console.log('⚠️ Ошибка получения настроек из листа, используем localStorage:', sheetError.message);
      sheetSettingsFound = false;
    }
    
    // Fallback к настройкам из localStorage если не удалось получить из листа
    if (!sheetSettingsFound) {
      try {
        const settingsResponse = await axios.get('http://localhost:3001/api/settings/telegram');
        if (settingsResponse.data.success) {
          botToken = settingsResponse.data.botToken;
          channelId = settingsResponse.data.channelId;
          console.log('📱 Получены настройки Telegram бота из localStorage');
        } else {
          console.log('⚠️ Не удалось получить настройки из localStorage, используем переменные окружения');
          botToken = process.env.TELEGRAM_BOT_TOKEN;
          channelId = process.env.TELEGRAM_CHANNEL_ID;
        }
      } catch (error) {
        console.log('⚠️ Ошибка при получении настроек из localStorage, используем переменные окружения:', error.message);
        botToken = process.env.TELEGRAM_BOT_TOKEN;
        channelId = process.env.TELEGRAM_CHANNEL_ID;
      }
      
      // Если используем fallback настройки, инициализируем Google Sheets с настройками из localStorage
      try {
        const settingsResponse = await axios.get('http://localhost:3001/api/settings/google-sheets');
        if (settingsResponse.data.success) {
          const { serviceAccountEmail, privateKey } = settingsResponse.data;
          
          const autoInitResponse = await axios.post('http://localhost:3001/api/sheets/auto-initialize', {
            googleServiceAccountEmail: serviceAccountEmail,
            googlePrivateKey: privateKey,
            googleSpreadsheetId: spreadsheetId
          });
          
          if (autoInitResponse.data.success) {
            console.log('✅ Google Sheets клиент инициализирован с настройками из localStorage');
          }
        }
      } catch (initError) {
        console.log('⚠️ Ошибка инициализации Google Sheets:', initError.message);
      }
    }
    
    if (!botToken || !channelId) {
      console.error('❌ Отсутствуют настройки Telegram бота');
      return { sentCount: 0 };
    }
    
    // Получаем лиды из внутреннего API
    const response = await axios.get(`http://localhost:3001/api/leads`);
    const leads = response.data.leads;
    
    console.log(`📊 Получено лидов из внутреннего API: ${leads ? leads.length : 'undefined'}`);
    console.log('📋 Структура первого лида:', leads && leads.length > 0 ? JSON.stringify(leads[0], null, 2) : 'нет лидов');
    
    if (!leads || leads.length === 0) {
      console.log('📭 Нет лидов для проверки во внутреннем API');
      return { sentCount: 0 };
    }
    
    // Фильтруем только неотправленные лиды (sent === false или sent отсутствует)
    // Сохраняем оригинальный индекс для каждого лида
    const newLeads = leads.map((lead, originalIndex) => ({
      ...lead,
      originalIndex: originalIndex
    })).filter(lead => lead.sent !== true);
    
    console.log(`🔍 Лидов после фильтрации: ${newLeads.length}`);
    console.log('📋 Первый неотправленный лид:', newLeads.length > 0 ? JSON.stringify(newLeads[0], null, 2) : 'нет неотправленных лидов');
    
    if (newLeads.length === 0) {
      console.log('📭 Нет новых лидов для отправки');
      return { sentCount: 0 };
    }
    
    console.log(`📤 Найдено ${newLeads.length} новых лидов для отправки`);
    
    // Проверяем дубликаты лидов
    const duplicateCheck = checkForDuplicateLeads(newLeads);
    const leadsToSend = duplicateCheck.uniqueLeads;
    
    if (duplicateCheck.duplicateCount > 0) {
      console.log(`⚠️ Найдено ${duplicateCheck.duplicateCount} дубликатов, которые будут пропущены`);
    }
    
    if (leadsToSend.length === 0) {
      console.log('📭 Нет уникальных лидов для отправки после проверки дубликатов');
      return { sentCount: 0 };
    }
    
    console.log(`📤 Отправляем ${leadsToSend.length} уникальных лидов`);
    
    // Отправляем каждый уникальный лид в Telegram с задержками для соблюдения rate limits
    for (let i = 0; i < leadsToSend.length; i++) {
      const lead = leadsToSend[i];
      
      try {
        // Отправляем лид в Telegram
        console.log(`📤 Отправляем лид ${i + 1}/${leadsToSend.length}:`, {
          name: lead.name,
          channel: lead.channel,
          timestamp: lead.timestamp,
          sent: lead.sent
        });
        
        // Функция для отправки с повторными попытками при rate limiting
        const sendWithRetry = async (retryCount = 0) => {
          try {
            const telegramResponse = await axios.post('http://localhost:3001/api/telegram-bot/send-lead-notification', {
              botToken: botToken,
              channelId: channelId,
              lead: lead
            });
            return telegramResponse;
          } catch (error) {
            // Проверяем на ошибку rate limiting
            if (error.response && error.response.status === 400 && 
                error.response.data && error.response.data.error && 
                error.response.data.error.includes('Too Many Requests')) {
              
              if (retryCount < 3) { // Максимум 3 попытки
                const waitTime = Math.min(30000, (retryCount + 1) * 15000); // 15, 30, 30 секунд
                console.log(`⏳ Rate limit достигнут, ждем ${waitTime/1000} секунд перед повторной попыткой (попытка ${retryCount + 1}/3)...`);
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return await sendWithRetry(retryCount + 1);
              } else {
                console.error(`❌ Превышено максимальное количество попыток для лида ${i + 1}`);
                throw error;
              }
            } else {
              throw error;
            }
          }
        };
        
        const telegramResponse = await sendWithRetry();
        
        console.log(`📨 Ответ Telegram API для лида ${i + 1}:`, telegramResponse.data);
        
        if (telegramResponse.data.success) {
          // Используем функцию markLeadAsSent для корректного обновления статуса
          try {
            await markLeadAsSent(lead, spreadsheetId);
            console.log(`✅ Лид ${lead.originalIndex + 1} отправлен и помечен как отправленный`);
            sentCount++;
          } catch (markError) {
            console.error(`❌ Ошибка при пометке лида как отправленного:`, markError.message);
            // Все равно увеличиваем счетчик, так как лид был отправлен в Telegram
            sentCount++;
          }
        } else {
          console.log(`❌ Telegram API вернул неуспешный ответ для лида ${i + 1}`);
        }
        
        // Добавляем задержку между отправками для соблюдения rate limits (1.5 секунды)
        if (i < leadsToSend.length - 1) { // Не ждем после последнего лида
          console.log(`⏳ Ждем 1.5 секунды перед отправкой следующего лида...`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
      } catch (error) {
        console.error(`❌ Ошибка при отправке лида ${i + 1}:`, error.message);
        
        // Добавляем задержку даже при ошибке, чтобы не спамить API
        if (i < leadsToSend.length - 1) {
          console.log(`⏳ Ждем 2 секунды после ошибки перед следующей попыткой...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    console.log(`✅ Обработка новых лидов завершена. Отправлено: ${sentCount}`);
    return { sentCount };
    
  } catch (error) {
    console.error('❌ Ошибка при отправке новых лидов:', error.message);
    return { sentCount };
  }
}

// Функция отправки лида в Telegram канал
async function sendLeadToTelegramChannel(lead, botToken, channelId) {
  // Используем новый эндпоинт telegram-bot для отправки лидов
  const response = await fetch('http://localhost:3001/api/telegram-bot/send-lead-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lead: lead,
      botToken: botToken,
      channelId: channelId
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Telegram API error: ${errorData.error || 'Unknown error'}`);
  }

  return await response.json();
}

// Функция для пометки лида как отправленного
async function markLeadAsSent(lead, spreadsheetId) {
  try {
    // 1. Обновляем статус во внутреннем хранилище
    if (lead.originalIndex !== undefined) {
      console.log(`📝 Обновляем статус лида во внутреннем хранилище (индекс: ${lead.originalIndex})`);
      
      const internalUpdateResponse = await axios.post('http://localhost:3001/api/leads/update-sent', {
        leadId: lead.originalIndex,
        sent: true
      });

      if (internalUpdateResponse.data.success) {
        console.log('✅ Статус лида обновлен во внутреннем хранилище');
      } else {
        console.error('⚠️ Не удалось обновить статус лида во внутреннем хранилище:', internalUpdateResponse.data);
      }
    }

    // 2. Обновляем статус в Google Sheets (если есть spreadsheetId)
    if (spreadsheetId) {
      console.log(`📝 Обновляем статус лида в Google Sheets (spreadsheetId: ${spreadsheetId})`);
      
      // Используем новый API для обновления статуса лида
      const updateResponse = await axios.post('http://localhost:3001/api/sheets/update-lead-sent', {
        spreadsheetId: spreadsheetId,
        leadIndex: lead.originalIndex + 1, // +1 потому что в Sheets нумерация с 1, плюс заголовок уже учтен
        sent: true
      });

      if (updateResponse.data.success) {
        console.log('✅ Статус лида обновлен в Google Sheets');
      } else {
        console.error('❌ API вернул неуспешный результат:', updateResponse.data);
        throw new Error(`Не удалось обновить статус лида в Google Sheets: ${updateResponse.data.error || 'Unknown error'}`);
      }
    }

  } catch (error) {
    console.error('❌ Ошибка при пометке лида как отправленного:', error);
    throw error;
  }
}

// Запуск cron job (каждый час)
router.post('/start', (req, res) => {
  try {
    if (cronJob) {
      cronJob.stop();
    }

    // Запускаем каждые 30 минут: в 0 и 30 минут каждого часа
    cronJob = cron.schedule('0,30 * * * *', async () => {
      lastRun = new Date();
      try {
        await sendNewLeadsToTelegram();
      } finally {
        nextRun = computeNextRun(new Date());
      }
    }, {
      scheduled: false,
      timezone: 'Europe/Moscow'
    });

    cronJob.start();
    nextRun = computeNextRun(new Date());
    
    console.log('⏰ Cron job для автоматической отправки лидов запущен (каждые 30 минут)');
    
    res.json({ 
      success: true, 
      message: 'Автоматическая отправка лидов запущена (каждые 30 минут)',
      schedule: scheduleDescription,
      nextRun: nextRun ? nextRun.toISOString() : null
    });
  } catch (error) {
    console.error('❌ Ошибка запуска cron job:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Не удалось запустить автоматическую отправку' 
    });
  }
});

// Остановка cron job
router.post('/stop', (req, res) => {
  try {
    if (cronJob) {
      cronJob.stop();
      cronJob = null;
      nextRun = null;
      console.log('⏹️ Cron job для автоматической отправки лидов остановлен');
    }
    
    res.json({ 
      success: true, 
      message: 'Автоматическая отправка лидов остановлена' 
    });
  } catch (error) {
    console.error('❌ Ошибка остановки cron job:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Не удалось остановить автоматическую отправку' 
    });
  }
});

// Получение статуса cron job
router.get('/status', (req, res) => {
  const running = cronJob && cronJob.running;
  console.log('📊 Статус cron job:', { cronJob: !!cronJob, running, lastRun, nextRun });
  res.json({ 
    success: true,
    running,
    schedule: running ? scheduleDescription : 'Не запущено',
    lastRun: lastRun ? lastRun.toISOString() : null,
    nextRun: nextRun ? nextRun.toISOString() : null
  });
});

// Ручной запуск отправки новых лидов
router.post('/send-new-leads', async (req, res) => {
  try {
    const result = await sendNewLeadsToTelegram();
    res.json({ 
      success: true, 
      message: 'Отправка новых лидов выполнена',
      sentCount: result.sentCount
    });
  } catch (error) {
    console.error('❌ Ошибка ручной отправки лидов:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Не удалось выполнить отправку лидов',
      sentCount: 0
    });
  }
});

module.exports = router;

// Функция для проверки дубликатов лидов
function checkForDuplicateLeads(newLeads) {
  console.log('🔍 Проверяем дубликаты лидов...');
  
  const uniqueLeads = [];
  const duplicates = [];
  const seenLeads = new Set();
  
  for (const lead of newLeads) {
    // Создаем уникальный ключ для лида на основе имени пользователя, канала, времени и полного сообщения
    const leadKey = `${lead.name || 'unknown'}_${lead.channel || 'unknown'}_${lead.timestamp || 'unknown'}_${lead.message || ''}`;
    
    console.log(`🔍 Проверяем лид: ${lead.name} из ${lead.channel} (${lead.timestamp})`);
    console.log(`🔑 Ключ лида: ${leadKey.substring(0, 100)}...`);
    
    if (seenLeads.has(leadKey)) {
      duplicates.push(lead);
      console.log(`🔄 Найден дубликат лида: ${lead.name} - ${(lead.message || '').substring(0, 50)}...`);
    } else {
      seenLeads.add(leadKey);
      uniqueLeads.push(lead);
      console.log(`✅ Лид уникален, добавляем в список для отправки`);
    }
  }
  
  console.log(`✅ Уникальных лидов: ${uniqueLeads.length}, дубликатов: ${duplicates.length}`);
  
  return {
    uniqueLeads,
    duplicates,
    duplicateCount: duplicates.length
  };
}