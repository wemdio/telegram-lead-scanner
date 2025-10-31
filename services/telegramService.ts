// Browser-compatible implementation
// Note: In a real application, these operations would be handled by a backend server

import { API_BASE_URL } from '../src/config/api';

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}

export interface TelegramMessage {
  id: number;
  message: string;
  fromId?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  date: Date;
  chatId: string;
  chatTitle?: string;
}

export interface TelegramChat {
  id: string;
  title: string;
  type: 'channel' | 'group' | 'supergroup';
}

class TelegramService {
  private config: TelegramConfig | null = null;

  async initialize(config: TelegramConfig): Promise<void> {
    this.config = config;
    console.log('Initializing Telegram service...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/telegram/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiId: config.apiId,
          apiHash: config.apiHash,
          sessionString: config.sessionString
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initialize Telegram client');
      }

      const result = await response.json();
      if (result.sessionString) {
        this.config.sessionString = result.sessionString;
      }
      
      console.log('Telegram service initialized successfully');
    } catch (error) {
      console.error('Telegram initialization error:', error);
      throw error;
    }
  }

  async getChats(): Promise<TelegramChat[]> {
    if (!this.config) {
      throw new Error('Telegram service not initialized');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/telegram/chats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle authentication errors specifically
        if (response.status === 401) {
          throw new Error('Требуется аутентификация Telegram. Пожалуйста, предоставьте валидный session string или пройдите аутентификацию заново.');
        }
        
        throw new Error(error.message || 'Ошибка при загрузке чатов');
      }

      const result = await response.json();
      return result.chats.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        type: chat.type as 'channel' | 'group' | 'supergroup'
      }));
    } catch (error) {
      console.error('Get chats error:', error);
      throw error;
    }
  }

  async getMessagesFromChat(
    chatId: string, 
    fromDate: Date, 
    toDate: Date,
    limit: number = 100
  ): Promise<TelegramMessage[]> {
    if (!this.config) {
      throw new Error('Telegram service not initialized');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/telegram/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          limit,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get messages');
      }

      const result = await response.json();
      return result.messages.map((msg: any) => ({
        ...msg,
        date: new Date(msg.date),
        message: msg.text || msg.message
      }));
    } catch (error) {
      console.error('Get messages error:', error);
      throw error;
    }
  }

  async getSessionString(): Promise<string> {
    if (!this.config?.sessionString) {
      throw new Error('No session string available');
    }
    return this.config.sessionString;
  }

  async disconnect(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/telegram/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      this.config = null;
      console.log('Telegram service disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      this.config = null;
    }
  }

  async getStatus(): Promise<{ connected: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/telegram/status`);
      if (!response.ok) {
        return { connected: false };
      }
      return await response.json();
    } catch (error) {
      return { connected: false };
    }
  }

  async sendAuthCode(apiId: string, apiHash: string, phoneNumber: string): Promise<{ phoneCodeHash: string; sessionString: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/telegram/auth/send-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiId,
          apiHash,
          phoneNumber
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send authentication code');
      }

      const result = await response.json();
      
      // Store sessionString for use in verify code
      if (this.config && result.sessionString) {
        this.config.sessionString = result.sessionString;
      }
      
      return result;
    } catch (error) {
      console.error('Send auth code error:', error);
      throw error;
    }
  }

  async verifyAuthCode(
    phoneNumber: string, 
    phoneCode: string, 
    phoneCodeHash: string
  ): Promise<{ sessionString: string }> {
    try {
      if (!this.config) {
        throw new Error('Telegram service not initialized');
      }
      
      const response = await fetch(`${API_BASE_URL}/telegram/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          phoneCode,
          phoneCodeHash,
          sessionString: this.config.sessionString,
          apiId: this.config.apiId,
          apiHash: this.config.apiHash
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify authentication code');
      }

      const result = await response.json();
      
      // Update the current config with the new session string
      if (this.config) {
        this.config.sessionString = result.sessionString;
      }
      
      return result;
    } catch (error) {
      console.error('Verify auth code error:', error);
      throw error;
    }
  }

  async validateSessionString(apiId: string, apiHash: string, sessionString: string): Promise<{ valid: boolean; user?: any; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/telegram/auth/validate-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiId,
          apiHash,
          sessionString
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return { valid: false, error: error.message || 'Failed to validate session' };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const telegramService = new TelegramService();
export default telegramService;