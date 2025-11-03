const express = require('express');
const router = express.Router();
const GoogleSheetsService = require('../services/googleSheetsService.cjs');
const axios = require('axios');

let sheetsClient = null;

// Обновление статуса отправки лида в Google Sheets
router.post('/update-lead-sent', async (req, res) => {
  try {
    const { spreadsheetId, leadIndex, sent } = req.body;

    if (!spreadsheetId || !leadIndex) {
      return res.status(400).json({ 
        error: 'spreadsheetId и leadIndex обязательны' 
      });
    }

    // Инициализируем Google Sheets клиент если нужно
    if (!sheetsClient || !sheetsClient.isInitialized()) {
      try {
        // Получаем настройки из API
        console.log('🔄 Получаем настройки Google Sheets...');
        const settingsResponse = await axios.get('http://localhost:3001/api/settings/google-sheets');
        const settings = settingsResponse.data;
        console.log('📋 Настройки получены:', { 
          hasEmail: !!settings.serviceAccountEmail, 
          hasKey: !!settings.privateKey,
          emailStart: settings.serviceAccountEmail?.substring(0, 20) + '...'
        });
        
        if (!settings.serviceAccountEmail || !settings.privateKey) {
          console.log('❌ Отсутствуют необходимые настройки');
          return res.status(400).json({ 
            error: 'Google Sheets API ключи не настроены' 
          });
        }

        // Проверяем, что это не тестовые данные с неполным ключом
        if (settings.privateKey.includes('...') || (settings.privateKey.length < 100 && !settings.privateKey.startsWith('MOCK_'))) {
          console.log('❌ Обнаружен неполный тестовый ключ');
          return res.status(400).json({ 
            error: 'Настройте реальные Google Sheets API ключи' 
          });
        }

        console.log('🔧 Инициализируем GoogleSheetsService...');
        
        // Создаем новый экземпляр если его нет
        if (!sheetsClient) {
          sheetsClient = new GoogleSheetsService();
        }
        
        try {
          const initResult = await sheetsClient.initialize(settings.serviceAccountEmail, settings.privateKey);
          console.log('✅ Google Sheets клиент инициализирован:', initResult);
          
          // В mock режиме не проверяем наличие реального API клиента
          if (!initResult.mock && !sheetsClient.sheetsClient) {
            throw new Error('sheetsClient не был создан после инициализации');
          }
          
          if (initResult.mock) {
            console.log('✅ Работаем в mock режиме');
          } else {
            console.log('✅ sheetsClient.sheetsClient создан успешно');
          }
        } catch (initError) {
          console.error('❌ Детальная ошибка инициализации:', initError);
          throw initError;
        }
      } catch (authError) {
        console.error('❌ Ошибка инициализации Google Sheets клиента:', authError.message);
        console.error('❌ Полная ошибка:', authError);
        return res.status(400).json({ 
          error: 'Не удалось инициализировать Google Sheets API' 
        });
      }
    }

    // Обновляем статус лида в Google Sheets
    try {
      console.log(`📝 Обновляем статус лида ${leadIndex} в таблице ${spreadsheetId}`);
      
      // Проверяем, работаем ли в mock режиме
      if (sheetsClient && sheetsClient.isMockMode && sheetsClient.isMockMode()) {
        console.log('✅ Mock режим: обновление статуса лида');
        return res.json({ 
          success: true, 
          message: 'Статус лида обновлен (mock режим)',
          mock: true 
        });
      }

      // Проверяем наличие реального API клиента
      if (!sheetsClient || !sheetsClient.sheetsClient || !sheetsClient.sheetsClient.spreadsheets) {
        throw new Error('Google Sheets API клиент не инициализирован');
      }

      // Используем новый метод updateCell
      // leadIndex уже содержит правильный номер строки (с учетом заголовка)
      const cellRange = `H${leadIndex}`; // Колонка H для статуса "Отправлено"
      const result = await sheetsClient.updateCell(
        spreadsheetId, 
        'Лиды', 
        cellRange, 
        sent ? 'Да' : 'Нет'
      );

      console.log('✅ Статус лида успешно обновлен:', result);
      res.json({ 
        success: true, 
        message: 'Статус лида обновлен',
        result 
      });
      
    } catch (updateError) {
      console.error('❌ Ошибка обновления статуса лида:', updateError);
      res.status(500).json({ 
        error: 'Не удалось обновить статус лида',
        message: updateError.message 
      });
    }

  } catch (error) {
    console.error('❌ Ошибка обновления статуса лида:', error);
    res.status(500).json({ 
      error: 'Не удалось обновить статус лида', 
      message: error.message 
    });
  }
});

module.exports = router;