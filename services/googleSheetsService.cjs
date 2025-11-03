const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.sheetsClient = null;
    this.auth = null;
  }

  async initialize(serviceAccountEmailOrCredentials, privateKey = null) {
    try {
      let credentials;
      
      // Поддерживаем два способа вызова:
      // 1. initialize(serviceAccountEmail, privateKey) - старый способ
      // 2. initialize(credentials) - новый способ с объектом
      if (typeof serviceAccountEmailOrCredentials === 'string' && privateKey) {
        credentials = {
          clientEmail: serviceAccountEmailOrCredentials,
          privateKey: privateKey,
          projectId: 'default-project' // Можно использовать дефолтное значение
        };
      } else if (typeof serviceAccountEmailOrCredentials === 'object') {
        credentials = serviceAccountEmailOrCredentials;
      } else {
        throw new Error('Invalid parameters for initialize method');
      }
      
      const { privateKey: credPrivateKey, clientEmail, projectId } = credentials;
      
      if (!credPrivateKey || !clientEmail) {
        throw new Error('Private key and client email are required');
      }

      // Check if we're using mock/test credentials
      const isMockMode = credPrivateKey.includes('MOCK') || 
                        clientEmail.includes('mock') || 
                        (projectId && projectId.includes('mock')) ||
                        credPrivateKey.includes('your_private_key_here') ||
                        clientEmail.includes('your_client_email_here') ||
                        (projectId && projectId.includes('your_project_id_here')) ||
                        credPrivateKey === 'test_key' ||
                        clientEmail === 'test@example.com' ||
                        (projectId && projectId === 'test_project') ||
                        !credPrivateKey.includes('BEGIN PRIVATE KEY');

      if (isMockMode) {
        console.log('📋 GoogleSheetsService initialized in mock mode');
        this.sheetsClient = { mock: true };
        this.auth = { mock: true };
        return { success: true, mock: true };
      }

      // Clean and format the private key properly
      let cleanPrivateKey = credPrivateKey.trim();
      
      if (cleanPrivateKey.includes('\\\\n')) {
        cleanPrivateKey = cleanPrivateKey.replace(/\\\\n/g, '\n');
      }
      if (cleanPrivateKey.includes('\\n')) {
        cleanPrivateKey = cleanPrivateKey.replace(/\\n/g, '\n');
      }
      
      if (!cleanPrivateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        cleanPrivateKey = '-----BEGIN PRIVATE KEY-----\n' + cleanPrivateKey;
      }
      if (!cleanPrivateKey.endsWith('-----END PRIVATE KEY-----')) {
        cleanPrivateKey = cleanPrivateKey + '\n-----END PRIVATE KEY-----';
      }

      // Create JWT auth
      this.auth = new google.auth.JWT(
        clientEmail,
        null,
        cleanPrivateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );

      // Authorize
      await this.auth.authorize();

      // Initialize the Sheets API client
      this.sheetsClient = google.sheets({ version: 'v4', auth: this.auth });

      console.log('✅ GoogleSheetsService initialized successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to initialize GoogleSheetsService:', error);
      throw error;
    }
  }

  async readSettingsFromSheet(spreadsheetId) {
    try {
      if (!this.sheetsClient) {
        throw new Error('GoogleSheetsService not initialized');
      }

      if (this.sheetsClient.mock) {
        console.log('📋 Mock: Reading settings from Настройки TG sheet');
        return { 
          success: true, 
          settings: {
            serviceAccountEmail: 'mock@example.com',
            privateKey: 'mock_private_key',
            telegramBotToken: 'mock_bot_token',
            telegramChannelId: 'mock_channel_id'
          },
          mock: true 
        };
      }

      const sheetName = 'Настройки TG';
      const range = `${sheetName}!A:B`;
      
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range
      });

      const rows = response.data.values || [];
      const settings = {};
      
      // Парсим настройки из формата ключ-значение
      rows.forEach(row => {
        if (row.length >= 2 && row[0] && row[1]) {
          const key = row[0].trim().toLowerCase();
          const value = row[1].trim();
          
          // Маппинг ключей на стандартные названия
          if (key.includes('service account email') || key.includes('email')) {
            settings.serviceAccountEmail = value;
          } else if (key.includes('private key') || key.includes('ключ')) {
            settings.privateKey = value;
          } else if (key.includes('bot token') || key.includes('токен')) {
            settings.telegramBotToken = value;
          } else if (key.includes('channel id') || key.includes('канал')) {
            settings.telegramChannelId = value;
          }
        }
      });

      console.log('✅ Settings read from sheet successfully');
      return { success: true, settings };
      
    } catch (error) {
      console.error('❌ Failed to read settings from sheet:', error);
      throw error;
    }
  }

  async appendToSheet(spreadsheetId, sheetName, values) {
    try {
      if (!this.sheetsClient) {
        throw new Error('GoogleSheetsService not initialized');
      }

      if (this.sheetsClient.mock) {
        console.log(`📋 Mock: Appending ${values.length} rows to ${sheetName}`);
        return { success: true, mock: true };
      }

      const range = `${sheetName}!A:A`;
      
      const response = await this.sheetsClient.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });

      console.log(`✅ Successfully appended ${values.length} rows to ${sheetName}`);
      return { success: true, response: response.data };
      
    } catch (error) {
      console.error(`❌ Failed to append to sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async getSheetData(spreadsheetId, sheetName, range = 'A:Z') {
    try {
      if (!this.sheetsClient) {
        throw new Error('GoogleSheetsService not initialized');
      }

      if (this.sheetsClient.mock) {
        console.log(`📋 Mock: Getting data from sheet ${sheetName}`);
        return { values: [] };
      }

      const fullRange = `${sheetName}!${range}`;
      
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: fullRange
      });

      return response.data;
      
    } catch (error) {
      console.error(`❌ Failed to get data from sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async createSheet(spreadsheetId, sheetName) {
    try {
      if (!this.sheetsClient) {
        throw new Error('GoogleSheetsService not initialized');
      }

      if (this.sheetsClient.mock) {
        console.log(`📋 Mock: Creating sheet ${sheetName}`);
        return { success: true, mock: true };
      }

      const response = await this.sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName
              }
            }
          }]
        }
      });

      console.log(`✅ Successfully created sheet ${sheetName}`);
      return { success: true, response: response.data };
      
    } catch (error) {
      console.error(`❌ Failed to create sheet ${sheetName}:`, error);
      throw error;
    }
  }

  async ensureSheetExists(spreadsheetId, sheetName) {
    try {
      if (!this.sheetsClient) {
        throw new Error('GoogleSheetsService not initialized');
      }

      if (this.sheetsClient.mock) {
        console.log(`📋 Mock: Ensuring sheet ${sheetName} exists`);
        return { success: true, mock: true };
      }

      // Try to get sheet info
      try {
        await this.sheetsClient.spreadsheets.get({
          spreadsheetId,
          ranges: [`${sheetName}!A1`]
        });
        console.log(`✅ Sheet ${sheetName} already exists`);
        return { success: true, exists: true };
      } catch (error) {
        if (error.code === 400) {
          // Sheet doesn't exist, create it
          console.log(`📋 Creating sheet ${sheetName}...`);
          await this.createSheet(spreadsheetId, sheetName);
          return { success: true, created: true };
        }
        throw error;
      }
      
    } catch (error) {
      console.error(`❌ Failed to ensure sheet ${sheetName} exists:`, error);
      throw error;
    }
  }

  async getLeads(spreadsheetId, sheetName = 'Лиды') {
    if (!this.isInitialized()) {
      throw new Error('Service not initialized');
    }
    if (this.isMockMode()) {
      console.log(`Mock: Getting leads from ${sheetName}`);
      return [];
    }
    await this.ensureSheetExists(spreadsheetId, sheetName);
    const data = await this.getSheetData(spreadsheetId, sheetName, 'A:H');
    const values = data.values || [];
    if (values.length === 0) return [];
    const leads = values.slice(1).map((row, index) => ({
      id: `sheet-lead-${index + 1}`,
      timestamp: row[0] || '',
      name: row[1] || '',
      username: row[2] || '',
      channel: row[3] || '',
      message: row[4] || '',
      reason: row[5] || '',
      confidence: parseFloat(row[6]) || 0,
      sent: row[7] === 'Да',
    }));
    return leads;
  }

  isInitialized() {
    return this.sheetsClient !== null;
  }

  isMockMode() {
    return this.sheetsClient && this.sheetsClient.mock === true;
  }
}

module.exports = GoogleSheetsService;

// Экспортируем также функцию для совместимости
module.exports.getGoogleSheetsClient = () => {
  const service = new GoogleSheetsService();
  return service;
};