import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

let telegramClient = null;

export default async function handler(req, res) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Debug logging removed for Vercel compatibility
    const { apiId, apiHash, phoneNumber } = req.body;
    
    if (!apiId || !apiHash || !phoneNumber) {
      // Missing required fields
      return res.status(400).json({ error: 'API ID, API Hash and phone number are required' });
    }



    // Creating Telegram client...
    
    // Disconnect existing client if any to avoid AUTH_KEY_DUPLICATED
    if (telegramClient) {
      try {
        await telegramClient.disconnect();
      } catch (e) {
        // Error disconnecting existing client
      }
      telegramClient = null;
    }
    
    const session = new StringSession('');
    telegramClient = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 2,
      timeout: 10000,
      retryDelay: 2000,
      autoReconnect: false
    });

    // Connecting to Telegram...
    await telegramClient.connect();
    
    // Sending code to phone
    const result = await telegramClient.sendCode({
      apiId: parseInt(apiId),
      apiHash: apiHash
    }, phoneNumber);
    
    // Save session string for use in verify-code
    const sessionString = telegramClient.session.save();
    
    // Code sent successfully
    res.json({ 
      success: true, 
      message: 'Code sent successfully',
      phoneCodeHash: result.phoneCodeHash,
      sessionString: sessionString
    });
  } catch (error) {
    // Error occurred during send code process
    
    // Handle specific Telegram errors
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (error.message && error.message.includes('AUTH_KEY_DUPLICATED')) {
      errorMessage = 'Обнаружен дублированный ключ авторизации. Попробуйте еще раз через несколько секунд.';
    }
    
    // Ensure we always return JSON
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to send code', 
        message: errorMessage
      });
    }
  }
}

// Export the telegramClient for use in verify-code
export { telegramClient };