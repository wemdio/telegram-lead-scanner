const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Путь к файлу постоянных настроек (backend)
const SETTINGS_FILE = path.join(__dirname, '..', 'persistent-settings.json');

function readPersistentSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(raw || '{}');
    }
  } catch (e) {
    console.error('⚠️ Ошибка чтения persistent-settings.json:', e.message);
  }
  return {};
}

function writePersistentSettings(updates) {
  try {
    const current = readPersistentSettings();
    const merged = { ...current, ...updates };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('⚠️ Ошибка записи persistent-settings.json:', e.message);
    return false;
  }
}

// Временное хранилище настроек (в реальном приложении лучше использовать базу данных)
// Инициализация Telegram настроек из persistent, затем из ENV
const persisted = readPersistentSettings();
let telegramSettings = {
  botToken: persisted.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || null,
  channelId: persisted.telegramChannelId || process.env.TELEGRAM_CHANNEL_ID || null
};

// Настройки Google Sheets
let googleSheetsSettings = {
  serviceAccountEmail: null,
  privateKey: null,
  spreadsheetId: null
};

// Базовый эндпоинт для получения всех настроек
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      telegram: {
        botToken: telegramSettings.botToken ? 'установлен' : null,
        channelId: telegramSettings.channelId ? 'установлен' : null
      },
      googleSheets: {
        serviceAccountEmail: googleSheetsSettings.serviceAccountEmail ? 'установлен' : null,
        privateKey: googleSheetsSettings.privateKey ? 'установлен' : null,
        spreadsheetId: googleSheetsSettings.spreadsheetId || null
      }
    });
  } catch (error) {
    console.error('Ошибка получения настроек:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Эндпоинт для сохранения настроек Telegram бота
router.post('/telegram', async (req, res) => {
  try {
    const { telegramBotToken, telegramChannelId } = req.body;

    if (!telegramBotToken || !telegramChannelId) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать токен бота и ID канала'
      });
    }

    // Сохраняем настройки в памяти
    telegramSettings.botToken = telegramBotToken;
    telegramSettings.channelId = telegramChannelId;

    // Персистентно сохраняем настройки
    const saved = writePersistentSettings({
      telegramBotToken: telegramBotToken,
      telegramChannelId: telegramChannelId
    });

    console.log('📱 Настройки Telegram бота сохранены:', {
      botToken: telegramBotToken ? 'установлен' : 'не установлен',
      channelId: telegramChannelId ? 'установлен' : 'не установлен'
    });

    res.json({
      success: true,
      message: 'Настройки Telegram бота сохранены',
      persisted: !!saved
    });
  } catch (error) {
    console.error('Ошибка сохранения настроек Telegram бота:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

// Эндпоинт для получения настроек Telegram бота
router.get('/telegram', async (req, res) => {
  try {
    const persistedNow = readPersistentSettings();
    const botToken = persistedNow.telegramBotToken || telegramSettings.botToken || null;
    const channelId = persistedNow.telegramChannelId || telegramSettings.channelId || null;

    console.log('🔍 Запрос настроек Telegram бота:', {
      botToken: botToken ? 'установлен' : 'не установлен',
      channelId: channelId ? 'установлен' : 'не установлен'
    });

    res.json({
      success: true,
      botToken,
      channelId
    });
  } catch (error) {
    console.error('Ошибка получения настроек Telegram бота:', error);
    res.status(500).json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    });
  }
});

router.post('/google-sheets', (req, res) => {
  try {
    const { googleServiceAccountEmail, googlePrivateKey, googleSpreadsheetId } = req.body;
    
    googleSheetsSettings = {
      serviceAccountEmail: googleServiceAccountEmail,
      privateKey: googlePrivateKey,
      spreadsheetId: googleSpreadsheetId
    };
    
    // Сохраняем настройки в localStorage для использования в других модулях
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('googleServiceAccountEmail', googleServiceAccountEmail || '');
      localStorage.setItem('googlePrivateKey', googlePrivateKey || '');
      localStorage.setItem('googleSpreadsheetId', googleSpreadsheetId || '');
    }
    
    console.log('📊 Google Sheets настройки сохранены:', {
      serviceAccountEmail: googleServiceAccountEmail ? 'установлен' : 'не установлен',
      privateKey: googlePrivateKey ? 'установлен' : 'не установлен',
      spreadsheetId: googleSpreadsheetId || 'не установлен'
    });
    
    res.json({
      success: true,
      message: 'Google Sheets настройки сохранены'
    });
  } catch (error) {
    console.error('❌ Ошибка сохранения настроек Google Sheets:', error);
    res.status(500).json({
      success: false,
      error: 'Не удалось сохранить настройки Google Sheets'
    });
  }
});

// Получение настроек Google Sheets
router.get('/google-sheets', (req, res) => {
  res.json({
    success: true,
    serviceAccountEmail: googleSheetsSettings.serviceAccountEmail,
    privateKey: googleSheetsSettings.privateKey,
    spreadsheetId: googleSheetsSettings.spreadsheetId
  });
});

module.exports = router;