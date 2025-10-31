import React, { useState, useCallback, useEffect } from 'react';
import ScannerSettings from './components/ScannerSettings';
import ScannerStatus from './components/ScannerStatus';
import LeadsPanel from './components/LeadsPanel';
import SettingsPanel from './components/SettingsPanel';
import scannerService from './services/scannerService';
import telegramService from './services/telegramService';
import googleSheetsService from './services/googleSheetsService';
import { ScannerSettings as ScannerSettingsType, ChatInfo, ScanStatus, ScanHistoryItem } from './types';
import { PolzaLogo } from './components/icons/PolzaLogo';
// Import API configuration to ensure it's loaded
import './src/config/api';

const App: React.FC = () => {
  // Debug API configuration
  console.log('API Configuration loaded:', {
    baseUrl: 'http://localhost:3001',
    environment: 'development'
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to find leads...');
  
  // New scanner state
  const [currentTab, setCurrentTab] = useState<'scanner' | 'status' | 'ai-leads'>('ai-leads');
  const [scannerSettings, setScannerSettings] = useState<ScannerSettingsType>({
    telegramApiId: '',
    telegramApiHash: '',
    telegramSessionString: '',
    googleServiceAccountEmail: '',
    googlePrivateKey: '',
    googleSpreadsheetId: '',
    selectedChatIds: [],
    scanInterval: 1, // Фиксированный интервал - каждый час
    openrouterApiKey: '',
    leadCriteria: ''
  });
  const [scannerConfigured, setScannerConfigured] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    isRunning: false,
    isScheduled: false,
    lastScanTime: null,
    nextScanTime: null,
    totalMessages: 0
  });
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  // Restore settings and scanner state from localStorage on component mount
  useEffect(() => {
    const restoreSettings = () => {
      const savedOpenrouterApiKey = localStorage.getItem('openrouterApiKey');
      const savedLeadCriteria = localStorage.getItem('leadCriteria');
      const savedTelegramApiId = localStorage.getItem('telegramApiId');
      const savedTelegramApiHash = localStorage.getItem('telegramApiHash');
      const savedSessionString = localStorage.getItem('telegramSessionString');
      const savedSelectedChatIds = localStorage.getItem('selectedChatIds');
      const savedGoogleEmail = localStorage.getItem('googleServiceAccountEmail');
      const savedGoogleKey = localStorage.getItem('googlePrivateKey');
      const savedSpreadsheetId = localStorage.getItem('googleSpreadsheetId');
      
      // Update scanner settings with saved values
      setScannerSettings(prev => ({
        ...prev,
        openrouterApiKey: savedOpenrouterApiKey || '',
        leadCriteria: savedLeadCriteria || '',
        telegramApiId: savedTelegramApiId || '',
        telegramApiHash: savedTelegramApiHash || '',
        telegramSessionString: savedSessionString || '',
        selectedChatIds: savedSelectedChatIds ? JSON.parse(savedSelectedChatIds) : [],
        googleServiceAccountEmail: savedGoogleEmail || '',
        googlePrivateKey: savedGoogleKey || '',
        googleSpreadsheetId: savedSpreadsheetId || ''
      }));
      
      // Check if scanner was previously configured
      const hasRequiredSettings = savedTelegramApiId && savedTelegramApiHash && 
                                 savedGoogleEmail && savedGoogleKey && savedSpreadsheetId &&
                                 savedSelectedChatIds && JSON.parse(savedSelectedChatIds || '[]').length > 0;
      
      if (hasRequiredSettings) {
        setScannerConfigured(true);
        
        // Initialize scannerService with restored settings
        const initializeScannerService = async () => {
          try {
            // Add a delay before initialization to prevent AUTH_KEY_DUPLICATED
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await scannerService.initialize({
              telegram: {
                apiId: parseInt(savedTelegramApiId),
                apiHash: savedTelegramApiHash,
                sessionString: savedSessionString || ''
              },
              googleSheets: {
                serviceAccountEmail: savedGoogleEmail,
                privateKey: savedGoogleKey,
                spreadsheetId: savedSpreadsheetId
              },
              chatIds: JSON.parse(savedSelectedChatIds || '[]'),
              scanInterval: parseInt(localStorage.getItem('scanInterval') || '24'),
              leadAnalysisSettings: (savedOpenrouterApiKey && savedLeadCriteria) ? {
                openrouterApiKey: savedOpenrouterApiKey,
                leadCriteria: savedLeadCriteria
              } : undefined
            });
            console.log('✅ ScannerService restored with leadAnalysisSettings');
          } catch (error) {
            console.warn('Failed to initialize scannerService on restore:', error);
          }
        };
        
        initializeScannerService();
        
        // Update scan status to check if scanner is still running
        updateScanStatus();
      }
    };
    
    restoreSettings();
  }, []);



  // New scanner functions
  const handleScannerSave = useCallback(async (settings: ScannerSettingsType) => {
    setIsLoading(true);
    try {
      // First, initialize Google Sheets client on backend
      console.log('🔧 Initializing Google Sheets client...');
      const { API_ENDPOINTS, apiRequest } = await import('./src/config/api');
      
      const sheetsInitResponse = await apiRequest(API_ENDPOINTS.sheets.initialize, {
        method: 'POST',
        body: JSON.stringify({
          privateKey: settings.googlePrivateKey,
          clientEmail: settings.googleServiceAccountEmail,
          projectId: 'telegram-scanner' // Default project ID
        })
      });

      // apiRequest already returns parsed JSON, no need to call .json() again
      if (!sheetsInitResponse.success) {
        throw new Error(`Failed to initialize Google Sheets: ${sheetsInitResponse.message || 'Unknown error'}`);
      }

      console.log('✅ Google Sheets client initialized successfully');

      // Send Google Sheets settings to backend
      try {
        await apiRequest(API_ENDPOINTS.settings.googleSheets, {
          method: 'POST',
          body: JSON.stringify({
            googleServiceAccountEmail: settings.googleServiceAccountEmail,
            googlePrivateKey: settings.googlePrivateKey,
            googleSpreadsheetId: settings.googleSpreadsheetId
          })
        });
        console.log('✅ Google Sheets настройки отправлены в backend');
      } catch (error) {
        console.warn('⚠️ Ошибка отправки настроек Google Sheets в backend:', error);
      }

      // Initialize frontend Google Sheets service
      await googleSheetsService.initialize({
        serviceAccountEmail: settings.googleServiceAccountEmail,
        privateKey: settings.googlePrivateKey,
        spreadsheetId: settings.googleSpreadsheetId
      });
      console.log('✅ Frontend Google Sheets service initialized');

      // Get AI settings from localStorage (now managed in LeadsPanel)
      const openrouterApiKey = localStorage.getItem('openrouterApiKey') || '';
      const leadCriteria = localStorage.getItem('leadCriteria') || '';
      
      // Prepare request data
      const requestData = {
        scanInterval: settings.scanInterval,
        selectedChats: settings.selectedChatIds, // Возвращаем все чаты
        telegramConfig: {
          apiId: parseInt(settings.telegramApiId),
          apiHash: settings.telegramApiHash,
          sessionString: settings.telegramSessionString
        },
        sheetsConfig: {
          serviceAccountEmail: settings.googleServiceAccountEmail,
          privateKey: settings.googlePrivateKey
        },
        spreadsheetId: settings.googleSpreadsheetId,
        leadAnalysisSettings: (openrouterApiKey && leadCriteria) ? {
          openrouterApiKey: openrouterApiKey,
          leadCriteria: leadCriteria
        } : null
      };
      
      // Log request data for debugging
      console.log('🔍 Отправляем данные на /api/scanner/start:', {
        scanInterval: requestData.scanInterval,
        selectedChats: requestData.selectedChats?.length || 0,
        totalChatsAvailable: settings.selectedChatIds.length,
        telegramConfig: {
          apiId: requestData.telegramConfig.apiId,
          apiHash: requestData.telegramConfig.apiHash ? 'установлен' : 'не установлен',
          sessionString: requestData.telegramConfig.sessionString ? 'установлен' : 'не установлен'
        },
        sheetsConfig: {
          serviceAccountEmail: requestData.sheetsConfig.serviceAccountEmail ? 'установлен' : 'не установлен',
          privateKey: requestData.sheetsConfig.privateKey ? 'установлен' : 'не установлен'
        },
        spreadsheetId: requestData.spreadsheetId ? 'установлен' : 'не установлен',
        leadAnalysisSettings: requestData.leadAnalysisSettings ? 'установлен' : 'не установлен'
      });
      
      // Start backend scheduler
      const response = await apiRequest(API_ENDPOINTS.scanner.start, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      // apiRequest уже обрабатывает ошибки HTTP статусов, поэтому если мы дошли сюда - запрос успешен

      console.log('Backend scanner started:', response);
      
      // Initialize frontend scannerService with leadAnalysisSettings
      await scannerService.initialize({
        telegram: {
          apiId: parseInt(settings.telegramApiId),
          apiHash: settings.telegramApiHash,
          sessionString: settings.telegramSessionString
        },
        googleSheets: {
          serviceAccountEmail: settings.googleServiceAccountEmail,
          privateKey: settings.googlePrivateKey,
          spreadsheetId: settings.googleSpreadsheetId
        },
        chatIds: settings.selectedChatIds,
        scanInterval: settings.scanInterval,
        leadAnalysisSettings: (openrouterApiKey && leadCriteria) ? {
          openrouterApiKey: openrouterApiKey,
          leadCriteria: leadCriteria
        } : undefined
      });
      
      // Start scheduled scanning on frontend
      await scannerService.startScheduledScanning();
      console.log('✅ Frontend scannerService initialized and started with leadAnalysisSettings');
      
      setScannerConfigured(true);
      // Не переключаемся автоматически на вкладку статуса, чтобы избежать случайного двойного запуска
      setStatusMessage('Scanner configured and started successfully!');
      
      // Update scan status with timeout to prevent hanging
      try {
        await Promise.race([
          updateScanStatus(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Status update timeout')), 5000))
        ]);
      } catch (statusError) {
        console.warn('Status update failed, but scanner was started successfully:', statusError);
      }
    } catch (error) {
      console.error('Error configuring scanner:', error);
      setError(error instanceof Error ? error.message : 'Failed to configure scanner');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLoadChats = useCallback(async (apiId: string, apiHash: string, sessionString?: string): Promise<ChatInfo[]> => {
    try {
      await telegramService.initialize({
        apiId: parseInt(apiId),
        apiHash: apiHash,
        sessionString: sessionString
      });
      
      const chats = await telegramService.getChats();
      return chats.map(chat => ({ ...chat, selected: false }));
    } catch (error) {
      console.error('Error loading chats:', error);
      throw error;
    }
  }, []);

  const handleManualScan = useCallback(async () => {
    console.log('🚀 handleManualScan ВЫЗВАНА!');
    console.log('🔍 Проверяем состояние перед началом...');
    console.log('📊 Current isLoading:', isLoading);
    console.log('📱 Current error:', error);
    
    // Защита от повторного запуска
    if (isLoading) {
      console.log('⚠️ Сканирование уже выполняется, игнорируем повторный запуск');
      return;
    }
    
    setIsLoading(true);
    console.log('✅ isLoading установлен в true');
    try {
      // Get settings from localStorage
      const telegramApiId = localStorage.getItem('telegramApiId');
      const telegramApiHash = localStorage.getItem('telegramApiHash');
      const telegramSessionString = localStorage.getItem('telegramSessionString');
      const selectedChatIds = JSON.parse(localStorage.getItem('selectedChatIds') || '[]');
      const googleServiceAccountEmail = localStorage.getItem('googleServiceAccountEmail');
      const googlePrivateKey = localStorage.getItem('googlePrivateKey');
      const googleSpreadsheetId = localStorage.getItem('googleSpreadsheetId');
      const scanInterval = parseInt(localStorage.getItem('scanInterval') || '1');
      const openrouterApiKey = localStorage.getItem('openrouterApiKey') || '';
      const leadCriteria = localStorage.getItem('leadCriteria') || '';
      
      console.log('Настройки из localStorage:', {
        telegramApiId: telegramApiId ? 'установлен' : 'не установлен',
        telegramApiHash: telegramApiHash ? 'установлен' : 'не установлен',
        telegramSessionString: telegramSessionString ? 'установлен' : 'не установлен',
        selectedChats: selectedChatIds.length,
        googleSpreadsheetId: googleSpreadsheetId ? 'установлен' : 'не установлен',
        openrouterApiKey: openrouterApiKey ? 'установлен' : 'не установлен',
        leadCriteria: leadCriteria ? 'установлен' : 'не установлен'
      });
      
      if (!telegramApiId || !telegramApiHash) {
        throw new Error('Telegram API credentials not configured. Please go to Settings first.');
      }
      
      if (selectedChatIds.length === 0) {
        throw new Error('No chats selected. Please select chats in Settings first.');
      }
      
      // Initialize Google Sheets client before manual scan
      if (googleServiceAccountEmail && googlePrivateKey) {
        console.log('🔧 Initializing Google Sheets client for manual scan...');
        const { API_ENDPOINTS, apiRequest } = await import('./src/config/api');
        
        const sheetsInitResponse = await apiRequest(API_ENDPOINTS.sheets.initialize, {
          method: 'POST',
          body: JSON.stringify({
            privateKey: googlePrivateKey,
            clientEmail: googleServiceAccountEmail,
            projectId: 'telegram-scanner'
          })
        });

        if (!sheetsInitResponse.ok) {
          const error = await sheetsInitResponse.json();
          console.warn('Failed to initialize Google Sheets for manual scan:', error.message);
        } else {
          console.log('✅ Google Sheets client initialized for manual scan');
        }
      }
      
      console.log('Отправляю запрос на сканирование...');
      console.log('🔍 Lead Analysis Settings для отправки:', {
        openrouterApiKey: openrouterApiKey ? 'установлен' : 'не установлен',
        leadCriteria: leadCriteria ? 'установлен' : 'не установлен'
      });
      
      const { API_ENDPOINTS, apiRequest } = await import('./src/config/api');
      
      const requestData = {
         selectedChats: selectedChatIds, // Возвращаем все чаты
         telegramConfig: {
           apiId: telegramApiId && !isNaN(parseInt(telegramApiId)) ? parseInt(telegramApiId) : 0,
           apiHash: telegramApiHash,
           sessionString: telegramSessionString
         },
         sheetsConfig: {
           serviceAccountEmail: googleServiceAccountEmail || '',
           privateKey: googlePrivateKey || '',
           spreadsheetId: googleSpreadsheetId || ''
         },
         spreadsheetId: googleSpreadsheetId,
         scanInterval: scanInterval,
         leadAnalysisSettings: (openrouterApiKey && leadCriteria) ? {
           openrouterApiKey: openrouterApiKey,
           leadCriteria: leadCriteria
         } : null
       };
       
       // Log request data for debugging
       console.log('🔍 Отправляем данные на /api/scanner/scan:', {
         selectedChats: requestData.selectedChats?.length || 0,
         totalChatsAvailable: selectedChatIds.length,
        telegramConfig: {
          apiId: requestData.telegramConfig.apiId,
          apiHash: requestData.telegramConfig.apiHash ? 'установлен' : 'не установлен',
          sessionString: requestData.telegramConfig.sessionString ? 'установлен' : 'не установлен'
        },
        sheetsConfig: {
          serviceAccountEmail: requestData.sheetsConfig.serviceAccountEmail ? 'установлен' : 'не установлен',
          privateKey: requestData.sheetsConfig.privateKey ? 'установлен' : 'не установлен'
        },
        spreadsheetId: requestData.spreadsheetId ? 'установлен' : 'не установлен',
        leadAnalysisSettings: requestData.leadAnalysisSettings ? 'установлен' : 'не установлен'
      });
      
      const response = await apiRequest(API_ENDPOINTS.scanner.scan, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      console.log('Получен ответ от сервера:', response);
      if (!response.success) {
        console.error('Ошибка ответа сервера:', response);
        throw new Error(response.error || 'Failed to perform scan');
      }

      const result = response;
      console.log('Результат сканирования:', result);
      await updateScanStatus();
      setStatusMessage(`Manual scan completed. Found ${result.result.totalMessages} messages.`);
    } catch (error) {
      console.error('Error during manual scan:', error);
      setError(error instanceof Error ? error.message : 'Manual scan failed');
    } finally {
      console.log('isLoading установлен в false');
      setIsLoading(false);
    }
  }, []);

  const handleStopScanner = useCallback(async () => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('./src/config/api');
      
      const response = await apiRequest(API_ENDPOINTS.scanner.stop, {
        method: 'POST'
      });

      // apiRequest уже обрабатывает ошибки HTTP статусов, поэтому если мы дошли сюда - запрос успешен

      console.log('Backend scanner stopped:', response);
      
      // Stop frontend scannerService
      scannerService.stopScheduledScanning();
      console.log('✅ Frontend scannerService stopped');
      
      await updateScanStatus();
      setStatusMessage('Scanner stopped.');
    } catch (error) {
      console.error('Error stopping scanner:', error);
      setError(error instanceof Error ? error.message : 'Failed to stop scanner');
    }
  }, []);

  const handleOpenSpreadsheet = useCallback(() => {
    const url = googleSheetsService.getSpreadsheetUrl();
    if (url) {
      window.open(url, '_blank');
    } else {
      setError('Spreadsheet URL not available. Please configure Google Sheets settings first.');
    }
  }, []);

  const updateScanStatus = useCallback(async () => {
    try {
      const status = await scannerService.getStatus();
      setScanStatus({
        isRunning: status.isRunning,
        isScheduled: status.isScheduled,
        lastScanTime: status.lastScanTime,
        nextScanTime: status.nextScanTime,
        totalMessages: status.status?.totalMessages || 0,
        lastError: status.scanHistory && status.scanHistory.length > 0 && !status.scanHistory[status.scanHistory.length - 1].success 
          ? status.scanHistory[status.scanHistory.length - 1].error 
          : undefined
      });
      setScanHistory(status.scanHistory || []);
    } catch (error) {
      console.error('Error updating scan status:', error);
    }
  }, []);

  // Initialize status on component mount
  useEffect(() => {
    updateScanStatus();
  }, [updateScanStatus]);

  // Update status periodically
  useEffect(() => {
    if (scannerConfigured) {
      const interval = setInterval(updateScanStatus, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [scannerConfigured, updateScanStatus]);

  const renderTabContent = () => {
    switch (currentTab) {
      case 'ai-leads':
        return (
          <LeadsPanel 
            settings={scannerSettings}
            onSettingsChange={setScannerSettings}
          />
        );

      case 'scanner':
        return (
          <div className="overflow-y-auto p-6">
            <ScannerSettings 
              onSave={handleScannerSave}
              onLoadChats={handleLoadChats}
              isLoading={isLoading}
            />
          </div>
        );
      case 'status':
        return (
          <div className="overflow-y-auto p-6">
            <ScannerStatus
              status={scanStatus}
              history={scanHistory}
              onManualScan={handleManualScan}
              onStop={handleStopScanner}
              onOpenSpreadsheet={handleOpenSpreadsheet}
              isLoading={isLoading}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-900 text-slate-200">
      <header className="flex flex-col gap-3 p-6 pb-4 border-b border-slate-700">
        <div className="flex items-center justify-center">
          <PolzaLogo className="w-32 h-12 text-cyan-400" />
        </div>
        
        {/* Navigation Tabs */}
        <nav className="flex gap-1">
          <button
            onClick={() => setCurrentTab('scanner')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              currentTab === 'scanner'
                ? 'bg-polza-gradient text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Настройки TG
          </button>
          <button
            onClick={() => setCurrentTab('status')}
            disabled={!scannerConfigured}
            className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              currentTab === 'status'
                ? 'bg-polza-gradient text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Статус
          </button>
          <button
            onClick={() => setCurrentTab('ai-leads')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              currentTab === 'ai-leads'
                ? 'bg-polza-gradient text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Лиды
          </button>

        </nav>
      </header>
      
      <main className="flex-1 overflow-hidden">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default App;