// Browser-compatible implementation
// Note: In a real application, these operations would be handled by a backend server

import { API_BASE_URL } from '../src/config/api';

export interface GoogleSheetsConfig {
  serviceAccountEmail: string;
  privateKey: string;
  spreadsheetId: string;
}

export interface MessageRow {
  timestamp: string;
  chatTitle: string;
  username: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  message: string;
  chatId?: string;
  messageType?: string;
}

class GoogleSheetsService {
  private config: GoogleSheetsConfig | null = null;
  private currentSpreadsheetId: string | null = null;

  async initialize(config: GoogleSheetsConfig): Promise<void> {
    this.config = config;
    this.currentSpreadsheetId = config.spreadsheetId;
    console.log('Google Sheets service initialized (browser mode)');
    
    // In a real application, this would make an API call to your backend
    // which would handle the actual Google Sheets API communication
  }

  async createSpreadsheet(title: string): Promise<string> {
    if (!this.config) {
      throw new Error('Google Sheets service not initialized');
    }

    // Mock implementation for demonstration
    console.log(`Mock: Creating spreadsheet with title: ${title}`);
    const mockSpreadsheetId = 'mock-spreadsheet-id-' + Date.now();
    return mockSpreadsheetId;
  }

  private async addHeaders(spreadsheetId: string): Promise<void> {
    const headers = [
      'Timestamp',
      'Chat Title', 
      'Username',
      'First Name',
      'Last Name',
      'User ID',
      'Message',
      'Chat ID',
      'Message Type'
    ];
    
    // Mock implementation for demonstration
    console.log(`Mock: Adding headers to spreadsheet ${spreadsheetId}:`, headers);
  }

  async appendMessages(messages: MessageRow[], spreadsheetId?: string): Promise<void> {
    if (!this.config) {
      throw new Error('Google Sheets service not initialized');
    }

    const targetSpreadsheetId = spreadsheetId || this.currentSpreadsheetId;
    if (!targetSpreadsheetId) {
      throw new Error('No spreadsheet ID provided or configured');
    }

    try {
      // Send messages in the format expected by backend
      const response = await fetch(`${API_BASE_URL}/sheets/append`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId: targetSpreadsheetId,
          messages: messages
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to append messages');
      }

      console.log(`Successfully appended ${messages.length} messages to spreadsheet`);
    } catch (error) {
      console.error('Append messages error:', error);
      throw error;
    }
  }

  async getLastRowIndex(spreadsheetId?: string): Promise<number> {
    if (!this.config) {
      throw new Error('Google Sheets service not initialized');
    }

    const targetSpreadsheetId = spreadsheetId || this.currentSpreadsheetId;
    if (!targetSpreadsheetId) {
      throw new Error('No spreadsheet ID provided or configured');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sheets/data/${targetSpreadsheetId}?range=A:A`);
      if (!response.ok) {
        return 1; // Just headers
      }

      const result = await response.json();
      return result.data.length;
    } catch (error) {
      console.error('Get last row index error:', error);
      return 1;
    }
  }

  async clearSheet(spreadsheetId?: string): Promise<void> {
    if (!this.config) {
      throw new Error('Google Sheets service not initialized');
    }

    const targetSpreadsheetId = spreadsheetId || this.currentSpreadsheetId;
    if (!targetSpreadsheetId) {
      throw new Error('No spreadsheet ID provided or configured');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sheets/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId: targetSpreadsheetId,
          range: 'A2:Z' // Clear all data except headers
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to clear sheet');
      }

      console.log('Sheet cleared successfully');
    } catch (error) {
      console.error('Clear sheet error:', error);
      throw error;
    }
  }

  getSpreadsheetUrl(spreadsheetId?: string): string {
    const targetSpreadsheetId = spreadsheetId || this.currentSpreadsheetId;
    if (!targetSpreadsheetId) {
      return '';
    }
    return `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`;
  }

  async getStatus(): Promise<{ connected: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/sheets/status`);
      if (!response.ok) {
        return { connected: false };
      }
      return await response.json();
    } catch (error) {
      return { connected: false };
    }
  }

  setCurrentSpreadsheetId(spreadsheetId: string): void {
    this.currentSpreadsheetId = spreadsheetId;
  }

  getCurrentSpreadsheetId(): string | null {
    return this.currentSpreadsheetId;
  }
}

export const googleSheetsService = new GoogleSheetsService();
export default googleSheetsService;