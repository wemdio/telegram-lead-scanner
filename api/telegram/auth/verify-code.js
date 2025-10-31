import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

// Import the telegramClient from send-code (this won't work in serverless, so we'll handle it differently)
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
    const { phoneNumber, phoneCode, phoneCodeHash, sessionString, apiId, apiHash } = req.body;
    
    // Debug logging
    console.log('Received request body:', req.body);
    console.log('phoneNumber:', phoneNumber, 'type:', typeof phoneNumber);
    console.log('apiId:', apiId, 'type:', typeof apiId);
    console.log('apiHash:', apiHash, 'type:', typeof apiHash);
    

    
    if (!phoneNumber || !phoneCode || !phoneCodeHash) {
      return res.status(400).json({ error: 'Phone number, code and code hash are required' });
    }

    // For serverless functions, we need to recreate the client from session
    // since we can't share state between function calls
    if (sessionString && apiId && apiHash) {
      // Disconnect existing client if any to avoid AUTH_KEY_DUPLICATED
      if (telegramClient) {
        try {
          await telegramClient.disconnect();
        } catch (e) {
          // Error disconnecting existing client
        }
        telegramClient = null;
      }
      
      // Restore client from session string
      const session = new StringSession(sessionString);
      telegramClient = new TelegramClient(session, parseInt(apiId), apiHash, {
        connectionRetries: 2,
        timeout: 10000,
        retryDelay: 2000,
        autoReconnect: false
      });
      await telegramClient.connect();
    }

    if (!telegramClient) {
      return res.status(400).json({ error: 'Authentication session not found. Please send code first.' });
    }

    // Use the stored phone code hash and provided phone code
    const result = await telegramClient.invoke(new Api.auth.SignIn({
      phoneNumber: phoneNumber,
      phoneCodeHash: phoneCodeHash,
      phoneCode: phoneCode
    }));
    
    const newSessionString = telegramClient.session.save();
    
    res.json({ 
      success: true, 
      message: 'Authentication successful',
      sessionString: newSessionString
    });
  } catch (error) {
    // Verify code error occurred
    
    // Handle specific authentication errors
    if (error.errorMessage === 'PHONE_CODE_INVALID') {
      return res.status(400).json({ 
        error: 'Invalid verification code', 
        message: 'Please check the code and try again'
      });
    }
    
    if (error.errorMessage === 'PHONE_CODE_EXPIRED') {
      return res.status(400).json({ 
        error: 'Verification code expired', 
        message: 'Please request a new code'
      });
    }
    
    // Handle AUTH_KEY_DUPLICATED error
    let errorMessage = error.message;
    if (error.message && error.message.includes('AUTH_KEY_DUPLICATED')) {
      errorMessage = 'Обнаружен дублированный ключ авторизации. Попробуйте еще раз через несколько секунд.';
    }
    
    res.status(500).json({ 
      error: 'Failed to verify code', 
      message: errorMessage 
    });
  }
}