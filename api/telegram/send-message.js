import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client = null;

  try {
    const { targetUsername, message, apiId, apiHash, sessionString } = req.body;
    
    if (!targetUsername || !message) {
      return res.status(400).json({ error: 'Target username and message are required' });
    }

    if (!apiId || !apiHash || !sessionString) {
      return res.status(400).json({ error: 'Telegram authentication data (apiId, apiHash, sessionString) is required' });
    }

    // Create Telegram client
    const session = new StringSession(sessionString);
    client = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });

    // Connect to Telegram
    await client.connect();

    if (!client.connected) {
      return res.status(400).json({
        success: false,
        error: 'Failed to connect to Telegram'
      });
    }

    // Send message
    await client.sendMessage(targetUsername, { message: message });

    // Disconnect client
    await client.disconnect();

    return res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully',
      targetUsername,
      messageContent: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    
    // Ensure client is disconnected on error
    if (client) {
      try {
        await client.disconnect();
      } catch (disconnectError) {
        console.error('Error disconnecting client:', disconnectError);
      }
    }

    return res.status(500).json({ 
      error: 'Failed to send message', 
      details: error.message 
    });
  }
}