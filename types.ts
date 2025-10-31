export interface Lead {
  id: string;
  channel: string;
  author: string;
  message: string;
  timestamp: string;
  reason: string;
  confidence?: number;
}

// For parsing Telegram's machine-readable JSON export
export interface TelegramMessage {
  id: number;
  type: 'message';
  date: string;
  from: string | null;
  from_id: string;
  text: string | (string | { type: string; text: string })[];
}

export interface TelegramExport {
  name: string;
  type: string;
  id: number;
  messages: TelegramMessage[];
}

// A simplified, universal message format to pass to the AI
export interface ProcessedMessage {
    channel: string;
    author: string;
    message: string;
    timestamp: string;
}

// New types for the scanner functionality
export interface ScannerSettings {
  telegramApiId: string;
  telegramApiHash: string;
  telegramSessionString?: string;
  googleServiceAccountEmail: string;
  googlePrivateKey: string;
  googleSpreadsheetId: string;
  selectedChatIds: string[];
  scanInterval: number; // hours
  openrouterApiKey?: string;
  leadCriteria?: string;
}

export interface ChatInfo {
  id: string;
  title: string;
  type: 'channel' | 'group' | 'supergroup';
  selected: boolean;
}

export interface ScanStatus {
  isRunning: boolean;
  isScheduled: boolean;
  lastScanTime: Date | null;
  nextScanTime: Date | null;
  totalMessages: number;
  lastError?: string;
}

export interface ScanHistoryItem {
  timestamp: Date;
  success: boolean;
  messagesCount: number;
  error?: string;
}

// Types for lead analysis
export interface LeadCriteria {
  description: string;
}

export interface AnalyzedLead {
  id: string;
  channel: string;
  author: string;
  message: string;
  timestamp: string;
  reason: string;
  confidence: number; // 0-100
}

export interface LeadAnalysisResult {
  leads: AnalyzedLead[];
  totalAnalyzed: number;
  processingTime: number;
  timestamp: Date;
}

export interface LeadAnalysisSettings {
  openrouterApiKey: string;
  criteria: LeadCriteria;
  autoAnalyze: boolean;
}
