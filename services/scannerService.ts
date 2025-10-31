import telegramService, { TelegramConfig, TelegramMessage } from './telegramService';
import googleSheetsService, { GoogleSheetsConfig, MessageRow } from './googleSheetsService';

// Используем относительный путь для API, который будет проксироваться через Vite
const API_BASE_URL = '/api';

export interface ScannerConfig {
  telegram: TelegramConfig;
  googleSheets: GoogleSheetsConfig;
  chatIds: string[];
  scanInterval: number; // hours, default: 3 (every 3 hours)
  leadAnalysisSettings?: any;
}

export interface ScanResult {
  success: boolean;
  messagesCount: number;
  chatsProcessed?: number;
  errors?: number;
  duration?: number;
  error?: string;
  timestamp: Date;
}

export interface ScannerStatus {
  isRunning: boolean;
  isScheduled: boolean;
  lastScanTime: Date | null;
  nextScanTime: Date | null;
  totalScans: number;
  errors: string[];
  scanHistory: ScanResult[];
}

class ScannerService {
  private config: ScannerConfig | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastScanTime: Date | null = null;
  private scanHistory: ScanResult[] = [];

  async initialize(config: ScannerConfig, retryCount: number = 0): Promise<void> {
    this.config = config;
    
    try {
      await telegramService.initialize(config.telegram);
      
      // Initialize Google Sheets service
      await googleSheetsService.initialize(config.googleSheets);
      
      console.log('Scanner service initialized successfully');
    } catch (error: any) {
      if (error.message && (error.message.includes('AUTH_KEY_DUPLICATED') || error.message.includes('дублированный ключ авторизации'))) {
        const maxRetries = 5; // Уменьшаем количество попыток до 5
        if (retryCount < maxRetries) {
          // Увеличенная задержка для стабилизации
          const delay = 10000; // Фиксированная задержка 10 секунд
          
          console.log(`AUTH_KEY_DUPLICATED error, retrying in ${delay / 1000} seconds... (attempt ${retryCount + 1}/${maxRetries})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.initialize(config, retryCount + 1);
        } else {
          throw new Error(`Failed to initialize after ${maxRetries} attempts due to AUTH_KEY_DUPLICATED. Please wait a few minutes and try again.`);
        }
      }
      
      console.error('Scanner service initialization failed:', error);
      throw error;
    }
  }

  async startScheduledScanning(): Promise<void> {
    if (!this.config) {
      throw new Error('Scanner service not initialized');
    }

    if (this.intervalId) {
      this.stopScheduledScanning();
    }

    const scanInterval = (this.config.scanInterval || 3) * 60 * 60 * 1000; // Convert hours to milliseconds
    
    this.intervalId = setInterval(async () => {
      await this.performScan(this.config.leadAnalysisSettings);
    }, scanInterval);

    console.log(`Scheduled scanning started with interval: ${this.config.scanInterval || 3} hours`);
  }

  stopScheduledScanning(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Scheduled scanning stopped');
    }
  }

  async performScan(leadAnalysisSettings?: any): Promise<ScanResult> {
    if (!this.config) {
      throw new Error('Scanner service not initialized');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/scanner?action=scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedChats: this.config.chatIds,
          telegramConfig: this.config.telegram,
          sheetsConfig: this.config.googleSheets,
          leadAnalysisSettings
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to perform scan');
      }

      const result = await response.json();
      const scanResult: ScanResult = {
        success: result.result.success,
        messagesCount: result.result.totalMessages,
        chatsProcessed: result.result.chatsProcessed,
        errors: result.result.errors,
        duration: result.result.duration,
        timestamp: new Date(result.result.timestamp)
      };

      this.scanHistory.push(scanResult);
      this.lastScanTime = scanResult.timestamp;
      
      // Keep only last 50 scan results
      if (this.scanHistory.length > 50) {
        this.scanHistory = this.scanHistory.slice(-50);
      }

      return scanResult;
    } catch (error) {
      console.error('Perform scan error:', error);
      const errorResult: ScanResult = {
        success: false,
        messagesCount: 0,
        chatsProcessed: 0,
        errors: 1,
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
      
      this.scanHistory.push(errorResult);
      return errorResult;
    }
  }

  async getStatus(): Promise<ScannerStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/scanner/status`);
      if (!response.ok) {
        return {
          isRunning: false,
          isScheduled: this.intervalId !== null,
          lastScanTime: this.lastScanTime,
          nextScanTime: null,
          totalScans: this.scanHistory.length,
          errors: [],
          scanHistory: this.scanHistory
        };
      }

      const result = await response.json();
      console.log('Scanner status response:', result);
      
      // API возвращает данные напрямую, не в объекте status
      if (typeof result.isRunning === 'undefined') {
        console.error('Status data is missing from response:', result);
        return {
          isRunning: false,
          isScheduled: this.intervalId !== null,
          lastScanTime: this.lastScanTime,
          nextScanTime: null,
          totalScans: this.scanHistory.length,
          errors: ['Status data missing from server response'],
          scanHistory: this.scanHistory
        };
      }
      
      // Get scan history from backend
      const historyResponse = await fetch(`${API_BASE_URL}/scanner/history?limit=50`);
      let scanHistory = this.scanHistory;
      if (historyResponse.ok) {
        const historyResult = await historyResponse.json();
        scanHistory = historyResult.history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }

      return {
        isRunning: result.isRunning,
        isScheduled: this.intervalId !== null,
        lastScanTime: result.lastScan ? new Date(result.lastScan) : this.lastScanTime,
        nextScanTime: result.nextScan ? new Date(result.nextScan) : null,
        totalScans: result.totalScans || scanHistory.length,
        errors: result.errors || [],
        scanHistory: scanHistory
      };
    } catch (error) {
      console.error('Get status error:', error);
      return {
        isRunning: this.isRunning,
        isScheduled: this.intervalId !== null,
        lastScanTime: this.lastScanTime,
        nextScanTime: null,
        totalScans: this.scanHistory.length,
        errors: [],
        scanHistory: this.scanHistory
      };
    }
  }

  async getScanHistory(): Promise<ScanResult[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/scanner/history?limit=50`);
      if (!response.ok) {
        return this.scanHistory;
      }

      const result = await response.json();
      return result.history.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch (error) {
      console.error('Get scan history error:', error);
      return this.scanHistory;
    }
  }

  async disconnect(): Promise<void> {
    await this.stopScheduledScanning();
    this.config = null;
    console.log('Scanner service disconnected');
  }
}

export const scannerService = new ScannerService();
export default scannerService;