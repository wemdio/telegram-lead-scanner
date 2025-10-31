import React, { useState, useEffect } from 'react';
import { ScannerSettings } from '../types';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface Lead {
  id: string;
  author: string;
  channel: string;
  message: string;
  timestamp: string;
  reason: string;
  confidence?: number;
  contacted?: boolean; // Новое поле для отметки "Связались"
}

interface LeadResponse {
  id: string;
  leadId: string;
  leadName: string;
  message: string;
  timestamp: string;
  chatId?: string;
  read: boolean;
}

interface ChatMessage {
  id: string;
  leadId: string;
  message: string;
  timestamp: string;
  isFromLead: boolean;
  chatId?: string;
}

interface LeadsPanelProps {
  settings: ScannerSettings;
  onSettingsChange: (settings: ScannerSettings) => void;
}

const LeadsPanel: React.FC<LeadsPanelProps> = ({ settings, onSettingsChange }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [relevanceFilter, setRelevanceFilter] = useState<number>(0); // Минимальный уровень релевантности
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [localApiKey, setLocalApiKey] = useState('');
  const [localCriteria, setLocalCriteria] = useState('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Новое состояние для промпта AI генерации сообщений
  const [aiMessagePrompt, setAiMessagePrompt] = useState('');
  
  // Состояния для ответов лидов
  const [leadResponses, setLeadResponses] = useState<LeadResponse[]>([]);
  const [showResponsesPanel, setShowResponsesPanel] = useState(false);
  
  // Состояния для чата с лидами
  const [selectedChatLead, setSelectedChatLead] = useState<LeadResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Состояния для модального окна отправки сообщений
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messageType, setMessageType] = useState<'ai' | 'manual' | null>(null);
  const [manualMessage, setManualMessage] = useState('');
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Состояния для управления аккаунтами
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0); // Для ротации аккаунтов

  // Состояние для Pyrogram загрузчика
  const [selectedPyrogramFile, setSelectedPyrogramFile] = useState<File | null>(null);
  const [pyrogramAccountName, setPyrogramAccountName] = useState('');
  const [isPyrogramUploading, setIsPyrogramUploading] = useState(false);
  const [pyrogramError, setPyrogramError] = useState('');
  const [pyrogramSuccess, setPyrogramSuccess] = useState('');

  // Прокси настройки для Pyrogram
  const [pyrogramProxyHost, setPyrogramProxyHost] = useState('');
  const [pyrogramProxyPort, setPyrogramProxyPort] = useState('');
  const [pyrogramProxyUsername, setPyrogramProxyUsername] = useState('');
  const [pyrogramProxyPassword, setPyrogramProxyPassword] = useState('');
  const [pyrogramUseProxy, setPyrogramUseProxy] = useState(false);

  // JSON конфигурация
  const [selectedConfigFile, setSelectedConfigFile] = useState<File | null>(null);

  // Состояния для подключения через Auth Key
  const [authKeyInput, setAuthKeyInput] = useState('');
  const [dcIdInput, setDcIdInput] = useState('');
  const [authKeyAccountName, setAuthKeyAccountName] = useState('');
  const [isAuthKeyUploading, setIsAuthKeyUploading] = useState(false);
  const [authKeyError, setAuthKeyError] = useState('');
  const [authKeySuccess, setAuthKeySuccess] = useState('');

  // Прокси настройки для Auth Key
  const [authKeyUseProxy, setAuthKeyUseProxy] = useState(false);
  const [authKeyProxyType, setAuthKeyProxyType] = useState('http');
  const [authKeyProxyHost, setAuthKeyProxyHost] = useState('');
  const [authKeyProxyPort, setAuthKeyProxyPort] = useState('');
  const [authKeyProxyUsername, setAuthKeyProxyUsername] = useState('');
  const [authKeyProxyPassword, setAuthKeyProxyPassword] = useState('');
  
  // Состояние для ввода прокси одной строкой
  const [authKeyProxyString, setAuthKeyProxyString] = useState('');

  // Тип выбранного аккаунта
  const [selectedAccountType, setSelectedAccountType] = useState<'pyrogram' | 'authkey'>('pyrogram');

  // Состояния для настроек Telegram бота
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [botEnabled, setBotEnabled] = useState(false);
  const [showBotSettings, setShowBotSettings] = useState(false);
  const [isBotTesting, setIsBotTesting] = useState(false);
  const [botTestResult, setBotTestResult] = useState<string>('');

  // Состояния для автоматической отправки лидов
  const [cronEnabled, setCronEnabled] = useState(false);
  const [cronStatus, setCronStatus] = useState<'stopped' | 'running'>('stopped');
  const [showCronSettings, setShowCronSettings] = useState(false);
  const [cronLastRun, setCronLastRun] = useState<string>('');
  const [cronNextRun, setCronNextRun] = useState<string>('');
  const [isManualSending, setIsManualSending] = useState(false);

  // Google Sheets states
  const [localGoogleServiceAccountEmail, setLocalGoogleServiceAccountEmail] = useState('');
  const [localGooglePrivateKey, setLocalGooglePrivateKey] = useState('');
  const [localGoogleSpreadsheetId, setLocalGoogleSpreadsheetId] = useState('');

  // Загрузка настроек из localStorage при инициализации
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openrouterApiKey') || settings.geminiApiKey || '';
    const savedCriteria = localStorage.getItem('leadCriteria') || settings.leadCriteria || '';
    const savedAiPrompt = localStorage.getItem('aiMessagePrompt') || '';
    
    // Загрузка настроек Telegram бота
    const savedBotToken = localStorage.getItem('telegramBotToken') || '';
    const savedChannelId = localStorage.getItem('telegramChannelId') || '';
    const savedBotEnabled = localStorage.getItem('telegramBotEnabled') === 'true';
    
    // Загрузка настроек cron job
    const savedCronEnabled = localStorage.getItem('cronEnabled') === 'true';
    
    setLocalApiKey(savedApiKey);
    setLocalCriteria(savedCriteria);
    setAiMessagePrompt(savedAiPrompt);
    setBotToken(savedBotToken);
    setChannelId(savedChannelId);
    setBotEnabled(savedBotEnabled);
    setCronEnabled(savedCronEnabled);
    
    // Load Google Sheets settings
    const savedGoogleServiceAccountEmail = localStorage.getItem('googleServiceAccountEmail') || '';
    const savedGooglePrivateKey = localStorage.getItem('googlePrivateKey') || '';
    const savedGoogleSpreadsheetId = localStorage.getItem('googleSpreadsheetId') || '';
    
    setLocalGoogleServiceAccountEmail(savedGoogleServiceAccountEmail);
    setLocalGooglePrivateKey(savedGooglePrivateKey);
    setLocalGoogleSpreadsheetId(savedGoogleSpreadsheetId);
    
    // Обновляем родительский компонент, если есть сохраненные данные
    if (savedApiKey || savedCriteria) {
      onSettingsChange({ 
        ...settings, 
        openrouterApiKey: savedApiKey,
        leadCriteria: savedCriteria 
      });
    }
    
    syncGoogleSheetsSettings();
    
    // Загружаем статус cron job при инициализации
    if (savedCronEnabled) {
      loadCronStatus();
    }
  }, []);

  // Синхронизируем настройки Google Sheets с backend
  const syncGoogleSheetsSettings = async () => {
    const googleServiceAccountEmail = localStorage.getItem('googleServiceAccountEmail') || localGoogleServiceAccountEmail;
    const googlePrivateKey = localStorage.getItem('googlePrivateKey') || localGooglePrivateKey;
    const googleSpreadsheetId = localStorage.getItem('googleSpreadsheetId') || localGoogleSpreadsheetId;
    
    if (googleServiceAccountEmail && googlePrivateKey && googleSpreadsheetId) {
      try {
        const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
        const result = await apiRequest(API_ENDPOINTS.settings.googleSheets, {
          method: 'POST',
          body: JSON.stringify({
            googleServiceAccountEmail,
            googlePrivateKey,
            googleSpreadsheetId,
          }),
        });

        if (result && (result.success || result.ok)) {
          console.log('✅ Google Sheets настройки синхронизированы с backend');
        } else {
          console.error('⚠️ Не удалось синхронизировать настройки Google Sheets с backend');
        }
      } catch (error) {
        console.error('Error syncing Google Sheets settings:', error);
      }
    }
  };

  // Синхронизация локальных настроек с props
  useEffect(() => {
    if (settings.openrouterApiKey !== localApiKey) {
      setLocalApiKey(settings.openrouterApiKey || '');
    }
    if (settings.leadCriteria !== localCriteria) {
      setLocalCriteria(settings.leadCriteria || '');
    }
  }, [settings.openrouterApiKey, settings.leadCriteria]);

  // Загрузка лидов при монтировании компонента
  useEffect(() => {
    loadLeads();
    loadAccounts(); // Загружаем аккаунты при инициализации
    loadLeadResponses(); // Загружаем ответы лидов
  }, []);

  // Функция парсинга строки прокси в формате host:port:username:password
  const parseProxyString = (proxyString: string) => {
    if (!proxyString.trim()) {
      return null;
    }

    const parts = proxyString.trim().split(':');
    
    if (parts.length < 2) {
      return null; // Минимум нужны host и port
    }

    const host = parts[0];
    const port = parts[1];
    const username = parts[2] || '';
    const password = parts[3] || '';

    // Проверяем валидность порта
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return null;
    }

    return {
      host,
      port,
      username,
      password
    };
  };

  // Обработчик изменения строки прокси
  const handleProxyStringChange = (value: string) => {
    setAuthKeyProxyString(value);
    
    const parsed = parseProxyString(value);
    if (parsed) {
      setAuthKeyProxyHost(parsed.host);
      setAuthKeyProxyPort(parsed.port);
      setAuthKeyProxyUsername(parsed.username);
      setAuthKeyProxyPassword(parsed.password);
      
      // Автоматически устанавливаем тип прокси как SOCKS4 для данного формата
      setAuthKeyProxyType('socks4');
      
      // Включаем использование прокси
      if (!authKeyUseProxy) {
        setAuthKeyUseProxy(true);
      }
    }
  };

  // Автоматическое обновление лидов каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      loadLeads();
      loadLeadResponses(); // Также обновляем ответы лидов
    }, 10000); // 10 секунд

    return () => clearInterval(interval);
  }, []);

  const initializeGoogleSheetsIfNeeded = async () => {
    const googleServiceAccountEmail = localStorage.getItem('googleServiceAccountEmail');
    const googlePrivateKey = localStorage.getItem('googlePrivateKey');
    
    if (googleServiceAccountEmail && googlePrivateKey) {
      try {
        const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
        console.log('🔧 Инициализируем Google Sheets клиент...');
        await apiRequest(API_ENDPOINTS.sheets.initialize, {
          method: 'POST',
          body: JSON.stringify({
            privateKey: googlePrivateKey,
            clientEmail: googleServiceAccountEmail,
            projectId: 'telegram-scanner'
          })
        });
        console.log('✅ Google Sheets клиент инициализирован');
        return true;
      } catch (error) {
        console.warn('⚠️ Ошибка инициализации Google Sheets:', error);
        return false;
      }
    }
    return false;
  };

  const loadLeads = async () => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      
      // Получаем spreadsheetId из localStorage
      const spreadsheetId = localStorage.getItem('googleSpreadsheetId');
      
      if (spreadsheetId && spreadsheetId !== 'mock-spreadsheet-id') {
        // Инициализируем Google Sheets клиент если нужно
        const initialized = await initializeGoogleSheetsIfNeeded();
        
        if (initialized) {
          // Читаем лиды из Google Sheets
          console.log('📊 Загружаем лиды из Google Sheets...');
          const sheetsData = await apiRequest(`${API_ENDPOINTS.sheets.leads}/${spreadsheetId}`);
          if (sheetsData.success && sheetsData.leads) {
            setLeads(sheetsData.leads);
            console.log(`✅ Загружено ${sheetsData.leads.length} лидов из Google Sheets`);
            return;
          } else {
            console.log('⚠️ Нет лидов в Google Sheets, загружаем из локального API');
          }
        } else {
          console.log('⚠️ Не удалось инициализировать Google Sheets, загружаем из локального API');
        }
      }
      
      // Fallback к локальному API
      console.log('📋 Загружаем лиды из локального API');
      const data = await apiRequest(API_ENDPOINTS.leads.status);
      setLeads(data.leads || []);
    } catch (error) {
      console.error('Ошибка загрузки лидов:', error);
      // В случае ошибки пытаемся загрузить из локального API
      try {
        const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
        const data = await apiRequest(API_ENDPOINTS.leads.status);
        setLeads(data.leads || []);
      } catch (fallbackError) {
        console.error('Ошибка загрузки лидов из локального API:', fallbackError);
      }
    }
  };

  // Функция загрузки ответов лидов
  const loadLeadResponses = async () => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      const data = await apiRequest(API_ENDPOINTS.leads.responses);
      setLeadResponses(data.responses || []);
      console.log(`✅ Загружено ${data.responses?.length || 0} ответов лидов`);
    } catch (error) {
      console.error('Ошибка загрузки ответов лидов:', error);
      setLeadResponses([]);
    }
  };

  // Функции для обработки изменений настроек
  const handleApiKeyChange = (value: string) => {
    setLocalApiKey(value);
    // Автосохранение в localStorage
    localStorage.setItem('openrouterApiKey', value);
    // Обновление родительского компонента
    onSettingsChange({ ...settings, openrouterApiKey: value });
  };

  const handleCriteriaChange = (value: string) => {
    setLocalCriteria(value);
    // Автосохранение в localStorage
    localStorage.setItem('leadCriteria', value);
    // Обновление родительского компонента
    onSettingsChange({ ...settings, leadCriteria: value });
  };

  // Функция для обработки изменения промпта AI
  const handleAiPromptChange = (value: string) => {
    setAiMessagePrompt(value);
    // Автосохранение в localStorage
    localStorage.setItem('aiMessagePrompt', value);
  };

  // Handlers for Google Sheets settings
  const handleGoogleServiceAccountEmailChange = (value: string) => {
    setLocalGoogleServiceAccountEmail(value);
    localStorage.setItem('googleServiceAccountEmail', value);
    syncGoogleSheetsSettings();
  };

  const handleGooglePrivateKeyChange = (value: string) => {
    setLocalGooglePrivateKey(value);
    localStorage.setItem('googlePrivateKey', value);
    syncGoogleSheetsSettings();
  };

  const handleGoogleSpreadsheetIdChange = (value: string) => {
    setLocalGoogleSpreadsheetId(value);
    localStorage.setItem('googleSpreadsheetId', value);
    syncGoogleSheetsSettings();
  };

  // Функции для обработки настроек Telegram бота
  const handleBotTokenChange = async (value: string) => {
    setBotToken(value);
    localStorage.setItem('telegramBotToken', value);
    
    // Отправляем настройки на backend
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      await apiRequest('/api/settings/telegram', {
        method: 'POST',
        body: JSON.stringify({
          telegramBotToken: value,
          telegramChannelId: channelId
        })
      });

      // Также отправляем настройки Google Sheets на backend
      const googleServiceAccountEmail = localStorage.getItem('googleServiceAccountEmail');
      const googlePrivateKey = localStorage.getItem('googlePrivateKey');
      const googleSpreadsheetId = localStorage.getItem('googleSpreadsheetId');
      
      if (googleServiceAccountEmail && googlePrivateKey && googleSpreadsheetId) {
        await apiRequest(API_ENDPOINTS.settings.googleSheets, {
          method: 'POST',
          body: JSON.stringify({
            googleServiceAccountEmail,
            googlePrivateKey,
            googleSpreadsheetId
          })
        });
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек Telegram бота:', error);
    }
  };

  const handleChannelIdChange = async (value: string) => {
    setChannelId(value);
    localStorage.setItem('telegramChannelId', value);
    
    // Отправляем настройки на backend
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      await apiRequest('/api/settings/telegram', {
        method: 'POST',
        body: JSON.stringify({
          telegramBotToken: botToken,
          telegramChannelId: value
        })
      });

      // Также отправляем настройки Google Sheets на backend
      const googleServiceAccountEmail = localStorage.getItem('googleServiceAccountEmail');
      const googlePrivateKey = localStorage.getItem('googlePrivateKey');
      const googleSpreadsheetId = localStorage.getItem('googleSpreadsheetId');
      
      if (googleServiceAccountEmail && googlePrivateKey && googleSpreadsheetId) {
        await apiRequest(API_ENDPOINTS.settings.googleSheets, {
          method: 'POST',
          body: JSON.stringify({
            googleServiceAccountEmail,
            googlePrivateKey,
            googleSpreadsheetId
          })
        });
      }
    } catch (error) {
      console.error('Ошибка сохранения настроек Telegram бота:', error);
    }
  };

  const handleBotEnabledChange = (enabled: boolean) => {
    setBotEnabled(enabled);
    localStorage.setItem('telegramBotEnabled', enabled.toString());
  };

  // Функции для управления cron job
  const handleCronEnabledChange = (enabled: boolean) => {
    setCronEnabled(enabled);
    localStorage.setItem('cronEnabled', enabled.toString());
    
    if (enabled) {
      startCronJob();
    } else {
      stopCronJob();
    }
  };

  const loadCronStatus = async () => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      const result = await apiRequest(API_ENDPOINTS.cron.status);
      
      if (result.success) {
        setCronStatus(result.status);
        setCronLastRun(result.lastRun || '');
        setCronNextRun(result.nextRun || '');
      }
    } catch (error) {
      console.error('Ошибка загрузки статуса cron job:', error);
    }
  };

  const startCronJob = async () => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      const result = await apiRequest(API_ENDPOINTS.cron.start, { method: 'POST' });
      
      if (result.success) {
        setCronStatus('running');
        loadCronStatus(); // Обновляем статус
      } else {
        console.error('Ошибка запуска cron job:', result.error);
      }
    } catch (error) {
      console.error('Ошибка запуска cron job:', error);
    }
  };

  const stopCronJob = async () => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      const result = await apiRequest(API_ENDPOINTS.cron.stop, { method: 'POST' });
      
      if (result.success) {
        setCronStatus('stopped');
        loadCronStatus(); // Обновляем статус
      } else {
        console.error('Ошибка остановки cron job:', result.error);
      }
    } catch (error) {
      console.error('Ошибка остановки cron job:', error);
    }
  };

  const manualSendNewLeads = async () => {
    setIsManualSending(true);
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      const result = await apiRequest(API_ENDPOINTS.cron.sendNewLeads, { method: 'POST' });
      
      if (result.success) {
        alert(`✅ Отправлено ${result.sentCount} новых лидов`);
        loadCronStatus(); // Обновляем статус
      } else {
        alert(`❌ Ошибка отправки: ${result.error}`);
      }
    } catch (error) {
      console.error('Ошибка ручной отправки лидов:', error);
      alert('❌ Ошибка при отправке лидов');
    } finally {
      setIsManualSending(false);
    }
  };

  // Функция тестирования бота
  const testBot = async () => {
    if (!botToken || !channelId) {
      setBotTestResult('Заполните токен бота и ID канала');
      return;
    }

    setIsBotTesting(true);
    setBotTestResult('');

    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      
      const result = await apiRequest('/api/telegram-bot/test', {
        method: 'POST',
        body: JSON.stringify({
          botToken,
          channelId
        })
      });

      if (result.success) {
        setBotTestResult('✅ Бот успешно подключен к каналу');
        
        // Сохраняем настройки на сервер после успешного теста
        try {
          await apiRequest('/api/settings/telegram', {
            method: 'POST',
            body: JSON.stringify({
              telegramBotToken: botToken,
              telegramChannelId: channelId
            })
          });
          console.log('✅ Настройки Telegram сохранены на сервер после успешного теста');
        } catch (saveError) {
          console.error('❌ Ошибка сохранения настроек на сервер:', saveError);
        }
      } else {
        setBotTestResult(`❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      setBotTestResult(`❌ Ошибка подключения: ${error.message}`);
    } finally {
      setIsBotTesting(false);
    }
  };

  // Функция отправки лида в канал
  const sendLeadToChannel = async (lead: Lead) => {
    if (!botEnabled || !botToken || !channelId) {
      console.log('⚠️ Отправка лида пропущена - бот не настроен:', { botEnabled, botToken: !!botToken, channelId: !!channelId });
      return;
    }

    console.log('📤 Отправляем лид в канал:', { author: lead.author, channel: lead.channel, id: lead.id });

    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      
      console.log('📡 Отправка запроса на /api/telegram-bot/send-lead-notification...');
      const result = await apiRequest('/api/telegram-bot/send-lead-notification', {
        method: 'POST',
        body: JSON.stringify({
          botToken,
          channelId,
          lead
        })
      });

      console.log('📨 Ответ от API:', result);

      if (result.success) {
        console.log('✅ Лид отправлен в канал:', lead.author);
      } else {
        console.error('❌ Ошибка отправки лида в канал:', result.error);
      }
    } catch (error) {
      console.error('❌ Ошибка отправки лида в канал:', error);
    }
  };

  // Функция для открытия чата с лидом
  const openChatWithLead = (response: LeadResponse) => {
    setSelectedChatLead(response);
    loadChatHistory(response.leadId);
  };

  // Загрузка истории чата с лидом
  const loadChatHistory = async (leadId: string) => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      const response = await apiRequest(`${API_ENDPOINTS.leads.base}/chat/${leadId}`);
      setChatMessages(response.messages || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
      setChatMessages([]);
    }
  };

  // Отправка сообщения лиду
  const sendMessageToLead = async () => {
    if (!selectedChatLead || !newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      const response = await apiRequest(`${API_ENDPOINTS.leads.base}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: selectedChatLead.leadId,
          chatId: selectedChatLead.chatId,
          message: newMessage.trim(),
          targetUsername: selectedChatLead.chatId
        }),
      });

      if (response.success) {
        // Добавляем отправленное сообщение в чат
        const sentMessage: ChatMessage = {
          id: Date.now().toString(),
          leadId: selectedChatLead.leadId,
          message: newMessage.trim(),
          timestamp: new Date().toISOString(),
          isFromLead: false,
          chatId: selectedChatLead.chatId
        };
        
        setChatMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        
        // Показываем уведомление об успехе
        setNotification({
          type: 'success',
          message: 'Сообщение отправлено успешно!'
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Специальная обработка ошибки SESSION_REVOKED
      if (error instanceof Error && error.message.includes('SESSION_REVOKED')) {
        setNotification({
          type: 'error',
          message: '⚠️ Сессия Telegram отозвана! Требуется повторная авторизация в разделе "Управление аккаунтами"'
        });
      } else {
        setNotification({
          type: 'error',
          message: 'Ошибка при отправке сообщения'
        });
      }
    } finally {
      setSendingMessage(false);
    }
  };

  // Закрытие чата
  const closeChatWithLead = () => {
    setSelectedChatLead(null);
    setChatMessages([]);
    setNewMessage('');
  };

  // Функция отметки ответа как прочитанного
  const markResponseAsRead = async (responseId: string) => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      await apiRequest(API_ENDPOINTS.leads.markResponseRead(responseId), {
        method: 'PATCH',
        body: JSON.stringify({ responseId })
      });
      
      // Обновляем локальное состояние
      setLeadResponses(prev => 
        prev.map(response => 
          response.id === responseId 
            ? { ...response, read: true }
            : response
        )
      );
      
      console.log(`✅ Ответ ${responseId} отмечен как прочитанный`);
    } catch (error) {
      console.error('Ошибка отметки ответа как прочитанного:', error);
    }
  };

  // Функция пометки лида как связались
  const markLeadAsContacted = async (leadId: string) => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      
      const result = await apiRequest(API_ENDPOINTS.leads.markAsContacted(leadId), {
        method: 'PATCH',
        body: JSON.stringify({
          contacted: true,
          contactDate: new Date().toISOString()
        })
      });
      
      if (result.success) {
        // Обновить локальное состояние лидов
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, contacted: true, contactDate: new Date().toISOString() }
              : lead
          )
        );
        
        console.log('Лид помечен как связались');
      } else {
        console.error('Ошибка пометки лида как связались:', result.error);
      }
    } catch (error) {
      console.error('Ошибка пометки лида как связались:', error);
    }
  };

  // Функция открытия модального окна для отправки сообщения
  const openMessageModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowMessageModal(true);
    setMessageType(null);
    setManualMessage('');
    setAiGeneratedMessage('');
  };

  // Функция закрытия модального окна
  const closeMessageModal = () => {
    setShowMessageModal(false);
    setSelectedLead(null);
    setMessageType(null);
    setManualMessage('');
    setAiGeneratedMessage('');
  };

  // Функция генерации AI сообщения
  const generateAiMessage = async () => {
    // Получаем актуальные данные из localStorage
    const currentApiKey = localStorage.getItem('openrouterApiKey') || settings.openrouterApiKey;
    const currentCriteria = localStorage.getItem('leadCriteria') || settings.leadCriteria;
    const currentAiPrompt = localStorage.getItem('aiMessagePrompt') || aiMessagePrompt;
    
    if (!selectedLead || !currentApiKey) {
      alert('Не выбран лид или не настроен API ключ');
      return;
    }

    setIsGeneratingMessage(true);
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      
      const result = await apiRequest(API_ENDPOINTS.leads.generateMessage || '/api/leads/generate-message', {
        method: 'POST',
        body: JSON.stringify({
          openrouterApiKey: currentApiKey,
          lead: selectedLead,
          messageContext: '', // Контекст сообщения (может быть пустым)
          aiPrompt: currentAiPrompt, // Пользовательский промпт для генерации сообщений
          leadSearchCriteria: currentCriteria // Критерии поиска лидов для контекста
        })
      });
      
      if (result.success && result.message) {
        setAiGeneratedMessage(result.message);
      } else {
        alert('Ошибка генерации сообщения: ' + (result.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка генерации AI сообщения:', error);
      alert('Ошибка при генерации сообщения');
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  // Функция для получения следующего аккаунта (ротация)
  const getNextAccount = () => {
    if (accounts.length === 0) return null;
    
    const account = accounts[currentAccountIndex];
    // Переходим к следующему аккаунту для следующей отправки
    setCurrentAccountIndex((prevIndex) => (prevIndex + 1) % accounts.length);
    
    return account;
  };

  // Функция для получения данных аккаунта для отправки
  const getAccountData = (account: any) => {
    console.log('getAccountData вызвана с аккаунтом:', account);
    
    if (!account) {
      console.log('Аккаунт не найден');
      return null;
    }

    console.log('Тип аккаунта:', account.type);
    console.log('Данные аккаунта:', JSON.stringify(account, null, 2));

    if (account.type === 'json' && account.sessionData) {
      console.log('Обрабатываем JSON аккаунт с sessionData');
      
      // Поддержка разных форматов JSON файлов
      const sessionData = account.sessionData;
      
      // Проверяем новый формат (app_id, app_hash)
      if (sessionData.app_id && sessionData.app_hash) {
        console.log('Используем формат app_id/app_hash');
        return {
          apiId: sessionData.app_id,
          apiHash: sessionData.app_hash,
          sessionString: sessionData.session || sessionData.session_file || ''
        };
      }
      
      // Проверяем старый формат (apiId, apiHash)
      if (sessionData.apiId && sessionData.apiHash) {
        console.log('Используем формат apiId/apiHash');
        return {
          apiId: sessionData.apiId,
          apiHash: sessionData.apiHash,
          sessionString: sessionData.session || sessionData.sessionString || ''
        };
      }
      
      console.log('Не найдены необходимые поля в sessionData');
      return null;
    } else if (account.type === 'tdata') {
      console.log('Обрабатываем TData аккаунт');
      return {
        accountId: account.id
      };
    } else if (account.type === 'pyrogram' && account.sessionData) {
      console.log('Обрабатываем Pyrogram аккаунт');
      return {
        apiId: account.sessionData.apiId,
        apiHash: account.sessionData.apiHash,
        sessionString: account.sessionData.sessionString || ''
      };
    } else if (account.type === 'authkey') {
      console.log('Обрабатываем AuthKey аккаунт');
      return {
        accountId: account.id,
        apiId: '94575', // Дефолтные значения для authkey аккаунтов
        apiHash: 'a3406de8d171bb422bb6ddf3bbd800e2'
      };
    }
    
    console.log('Не удалось определить тип аккаунта или отсутствуют необходимые данные');
    return null;
  };

  // Функция отправки сообщения
  const sendMessage = async () => {
    if (!selectedLead) {
      alert('Пожалуйста, выберите лид для отправки сообщения');
      return;
    }

    // Проверяем, есть ли доступные аккаунты
    if (accounts.length === 0) {
      alert('Нет доступных аккаунтов. Пожалуйста, добавьте аккаунт в разделе "Управление аккаунтами"');
      return;
    }

    const messageToSend = messageType === 'ai' ? aiGeneratedMessage : manualMessage;
    if (!messageToSend.trim()) {
      alert('Сообщение не может быть пустым');
      return;
    }

    // Получаем следующий аккаунт для ротации
    const selectedAccount = getNextAccount();
    console.log('Выбранный аккаунт для отправки:', selectedAccount);
    
    const accountData = getAccountData(selectedAccount);
    console.log('Данные аккаунта для отправки:', accountData);
    
    if (!accountData) {
      console.error('Ошибка получения данных аккаунта. Аккаунт:', selectedAccount);
      alert('Ошибка получения данных аккаунта. Проверьте консоль для подробностей.');
      return;
    }

    setIsSendingMessage(true);
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      
      const requestBody = {
        targetUsername: selectedLead.name || selectedLead.author,
        message: messageToSend,
        ...accountData // Распаковываем данные аккаунта
      };
      
      console.log('selectedLead объект:', selectedLead);
      console.log('selectedLead.name:', selectedLead.name);
      console.log('selectedLead.author:', selectedLead.author);
      console.log('Отправляем requestBody:', JSON.stringify(requestBody, null, 2));
      console.log('targetUsername:', requestBody.targetUsername);
      console.log('message:', requestBody.message);
      console.log('accountData:', accountData);
      
      const result = await apiRequest(API_ENDPOINTS.telegram.sendMessage || '/api/telegram/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (result.success) {
        // Записываем в лист "Связались" после успешной отправки сообщения
        try {
          const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
          
          const contactData = {
            leadId: selectedLead.id,
            leadName: selectedLead.author || selectedLead.name || 'Unknown',
            leadUsername: selectedLead.username || '',
            contactDate: new Date().toISOString(),
            channel: selectedLead.channel || '',
            message: messageToSend,
            accountUsed: selectedAccount.name || selectedAccount.id
          };
          
          await apiRequest(API_ENDPOINTS.leads.markAsContacted(selectedLead.id), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
          });
          
          // Обновляем локальное состояние лидов
          setLeads(prevLeads => 
            prevLeads.map(lead => 
              lead.id === selectedLead.id 
                ? { ...lead, contacted: true, contactDate: contactData.contactDate }
                : lead
            )
          );
          
        } catch (contactError) {
          console.error('Ошибка записи контакта в Google Sheets:', contactError);
          // Не показываем ошибку пользователю, так как сообщение уже отправлено
        }
        
        alert(`Сообщение успешно отправлено с аккаунта: ${selectedAccount.name || selectedAccount.id}`);
        closeMessageModal();
      } else {
        alert('Ошибка отправки сообщения: ' + (result.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      
      // Специальная обработка ошибки SESSION_REVOKED
      if (error instanceof Error && error.message.includes('SESSION_REVOKED')) {
        alert('⚠️ Сессия Telegram была отозвана!\n\nЭто может означать:\n• Аккаунт заблокирован\n• Сессия истекла\n• Требуется повторная авторизация\n\nПожалуйста, переавторизуйтесь в разделе "Управление аккаунтами"');
      } else {
        alert('Ошибка при отправке сообщения');
      }
    } finally {
      setIsSendingMessage(false);
    }
  };









  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Дата не указана';
    
    // Попробуем разные форматы timestamp
    let date: Date;
    
    // Если это Unix timestamp (число)
    if (/^\d+$/.test(timestamp)) {
      const num = parseInt(timestamp);
      // Если это секунды (меньше чем timestamp в миллисекундах для 2030 года)
      date = new Date(num < 1900000000 ? num * 1000 : num);
    } else if (/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2} MSK$/.test(timestamp)) {
      // Если это формат "DD.MM.YYYY HH:MM:SS MSK" из backend
      const match = timestamp.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2}):(\d{2}) MSK$/);
      if (match) {
        const [, day, month, year, hours, minutes, seconds] = match;
        // Создаем дату в московском времени
        date = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}+03:00`);
      } else {
        date = new Date(timestamp);
      }
    } else {
      // Если это строка даты
      date = new Date(timestamp);
    }
    
    // Проверяем валидность даты
    if (isNaN(date.getTime())) {
      return 'Неверный формат даты';
    }
    
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Фильтрация лидов по релевантности
  const filteredLeads = leads.filter(lead => {
    // Если нет confidence, показываем лид только при фильтре 0 (все лиды)
    if (lead.confidence === undefined || lead.confidence === null) {
      return relevanceFilter === 0;
    }
    
    // Преобразуем confidence в число для корректного сравнения
    const confidenceValue = Number(lead.confidence);
    
    // Проверяем, что confidence больше или равно фильтру
    return confidenceValue >= relevanceFilter;
  });

  // Функция для обработки загрузки Pyrogram
  const handlePyrogramUpload = async () => {
    // Проверяем наличие обязательных файлов
    if (!selectedPyrogramFile || !selectedConfigFile) {
      setPyrogramError('Пожалуйста, выберите файл сессии и JSON конфигурацию');
      return;
    }

    setIsPyrogramUploading(true);
    setPyrogramError('');
    setPyrogramSuccess('');

    try {
      // Читаем и парсим JSON конфигурацию
      const configContent = await selectedConfigFile.text();
      console.log('Config content:', configContent);
      const configData = JSON.parse(configContent);
      console.log('Parsed config data:', configData);
      
      // Проверяем обязательные поля в конфигурации (поддерживаем разные форматы)
      const apiId = configData.api_id || configData.apiId || configData.app_id;
      const apiHash = configData.api_hash || configData.apiHash || configData.app_hash;
      const accountName = configData.account_name || configData.accountName || configData.name || 'Pyrogram Account';
      
      console.log('Extracted values:', { apiId, apiHash, accountName });
      
      if (!apiId || !apiHash) {
        console.log('Validation failed - missing fields:', { 
          hasApiId: !!apiId, 
          hasApiHash: !!apiHash,
          configKeys: Object.keys(configData)
        });
        setPyrogramError('JSON конфигурация должна содержать api_id/apiId/app_id и api_hash/apiHash/app_hash');
        return;
      }

      // Проверяем прокси настройки если они включены
      if (pyrogramUseProxy && (!pyrogramProxyHost || !pyrogramProxyPort)) {
        setPyrogramError('Пожалуйста, заполните хост и порт прокси');
        return;
      }

      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      
      // Читаем файл сессии как массив байтов
      const sessionFileBuffer = await selectedPyrogramFile.arrayBuffer();
      const sessionFileData = Array.from(new Uint8Array(sessionFileBuffer));
      
      const requestData = {
        type: 'pyrogram',
        path: selectedPyrogramFile.name,
        name: accountName,
        content: configContent, // JSON конфигурация как строка
        fileData: sessionFileData, // Данные файла как массив байтов
        // Добавляем прокси настройки
        proxy: pyrogramUseProxy ? {
          host: pyrogramProxyHost,
          port: parseInt(pyrogramProxyPort),
          username: pyrogramProxyUsername || undefined,
          password: pyrogramProxyPassword || undefined
        } : undefined
      };

      const result = await apiRequest(API_ENDPOINTS.telegram.addAccount || '/api/telegram/accounts/add', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (result.success) {
        setAccounts([...accounts, result.account]);
        setPyrogramSuccess('Аккаунт Pyrogram успешно подключен!');
        // Очищаем форму
        setPyrogramAccountName('');
        setSelectedPyrogramFile(null);
        setSelectedConfigFile(null);
        // Очищаем прокси настройки
        setPyrogramUseProxy(false);
        setPyrogramProxyHost('');
        setPyrogramProxyPort('');
        setPyrogramProxyUsername('');
        setPyrogramProxyPassword('');
      } else {
        setPyrogramError('Ошибка подключения аккаунта: ' + (result.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка подключения Pyrogram аккаунта:', error);
      if (error.name === 'SyntaxError') {
        setPyrogramError('Ошибка: Неверный формат JSON конфигурации');
      } else {
        setPyrogramError('Ошибка при подключении аккаунта');
      }
    } finally {
      setIsPyrogramUploading(false);
    }
  };

  // Функция для подключения аккаунта через Auth Key
  const handleAuthKeyUpload = async () => {
    if (!authKeyInput || !dcIdInput || !authKeyAccountName) {
      setAuthKeyError('Пожалуйста, заполните все поля');
      return;
    }

    // Валидация auth key (должен быть hex строкой длиной 512 символов)
    if (!/^[0-9a-fA-F]{512}$/.test(authKeyInput)) {
      setAuthKeyError('Auth Key должен быть hex строкой длиной 512 символов');
      return;
    }

    // Валидация DC ID (должен быть числом от 1 до 5)
    const dcIdNum = parseInt(dcIdInput);
    if (isNaN(dcIdNum) || dcIdNum < 1 || dcIdNum > 5) {
      setAuthKeyError('DC ID должен быть числом от 1 до 5');
      return;
    }

    // Валидация прокси, если включен
    if (authKeyUseProxy) {
      if (!authKeyProxyHost || !authKeyProxyPort) {
        setAuthKeyError('При использовании прокси необходимо указать хост и порт');
        return;
      }
      
      const portNum = parseInt(authKeyProxyPort);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        setAuthKeyError('Порт прокси должен быть числом от 1 до 65535');
        return;
      }
    }

    setIsAuthKeyUploading(true);
    setAuthKeyError('');
    setAuthKeySuccess('');

    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');

      const requestData = {
        authKey: authKeyInput,
        dcId: dcIdNum,
        accountName: authKeyAccountName,
        useProxy: authKeyUseProxy,
        proxyType: authKeyUseProxy ? authKeyProxyType : undefined,
        proxyHost: authKeyUseProxy ? authKeyProxyHost : undefined,
        proxyPort: authKeyUseProxy ? parseInt(authKeyProxyPort) : undefined,
        proxyUsername: authKeyUseProxy && authKeyProxyUsername ? authKeyProxyUsername : undefined,
        proxyPassword: authKeyUseProxy && authKeyProxyPassword ? authKeyProxyPassword : undefined
      };

      const result = await apiRequest(API_ENDPOINTS.telegram.createSessionFromAuthKey, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      if (result.success) {
        setAccounts([...accounts, result.account]);
        setAuthKeySuccess('Аккаунт успешно подключен через Auth Key!');
        // Очищаем форму
        setAuthKeyInput('');
        setDcIdInput('');
        setAuthKeyAccountName('');
        setAuthKeyUseProxy(false);
        setAuthKeyProxyType('http');
        setAuthKeyProxyHost('');
        setAuthKeyProxyPort('');
        setAuthKeyProxyUsername('');
        setAuthKeyProxyPassword('');
        setAuthKeyProxyString(''); // Очищаем поле прокси строки
      } else {
        setAuthKeyError('Ошибка подключения аккаунта: ' + (result.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка подключения аккаунта через Auth Key:', error);
      setAuthKeyError('Ошибка при подключении аккаунта');
    } finally {
      setIsAuthKeyUploading(false);
    }
  };

  // Функции для управления аккаунтами
  const handleAddAccount = async () => {
    if (selectedAccountType === 'pyrogram') {
      return handlePyrogramUpload();
    } else if (selectedAccountType === 'authkey') {
      return handleAuthKeyUpload();
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      
      const result = await apiRequest(`${API_ENDPOINTS.telegram.removeAccount}/${accountId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        setAccounts(accounts.filter(acc => acc.id !== accountId));
        alert('Аккаунт успешно удален!');
      } else {
        alert('Ошибка удаления аккаунта: ' + (result.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка удаления аккаунта:', error);
      alert('Ошибка при удалении аккаунта');
    }
  };

  const loadAccounts = async () => {
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
      
      const result = await apiRequest(API_ENDPOINTS.telegram.getAccounts || '/api/telegram/accounts', {
        method: 'GET'
      });
      
      if (result.success) {
        setAccounts(result.accounts || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки аккаунтов:', error);
    }
  };



  return (
    <div className="overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Настройки AI */}
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Настройки AI</h3>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {showSettings ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          
          {showSettings && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  OpenRouter API Key
                </label>
                <input
                  type="password"
                  value={localApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="Введите ваш OpenRouter API ключ"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Единый промпт для анализа лидов
                </label>
                <textarea
                  value={localCriteria}
                  onChange={(e) => handleCriteriaChange(e.target.value)}
                  placeholder="Вставьте единый промпт для анализа лидов. Используйте переменную $&#123;messagesText&#125; для подстановки сообщений..."
                  rows={8}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="mt-2 text-xs text-slate-400">
                  💡 Этот промпт заменяет внутренний промпт системы. Используйте переменную $&#123;messagesText&#125; для подстановки анализируемых сообщений.
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Промпт для AI генерации сообщений
                </label>
                <textarea
                  value={aiMessagePrompt}
                  onChange={(e) => handleAiPromptChange(e.target.value)}
                  placeholder="Опишите как AI должен генерировать сообщения для лидов (например: 'Создай дружелюбное сообщение, предлагающее наши услуги...')"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Google Service Account Email
                </label>
                <input
                  type="text"
                  value={localGoogleServiceAccountEmail}
                  onChange={(e) => handleGoogleServiceAccountEmailChange(e.target.value)}
                  placeholder="Введите email сервисного аккаунта Google"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Google Private Key
                </label>
                <textarea
                  value={localGooglePrivateKey}
                  onChange={(e) => handleGooglePrivateKeyChange(e.target.value)}
                  placeholder="Введите приватный ключ (многострочный)"
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Google Spreadsheet ID
                </label>
                <input
                  type="text"
                  value={localGoogleSpreadsheetId}
                  onChange={(e) => handleGoogleSpreadsheetIdChange(e.target.value)}
                  placeholder="Введите ID Google таблицы"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Настройки Telegram бота */}
              <div className="border-t border-slate-600 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-slate-200">Telegram бот для дублирования лидов</h4>
                  <button
                    onClick={() => setShowBotSettings(!showBotSettings)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {showBotSettings ? 'Скрыть' : 'Настроить'}
                  </button>
                </div>
                
                {showBotSettings && (
                  <div className="space-y-4 bg-slate-750 p-4 rounded-lg border border-slate-600">
                    <div className="flex items-center space-x-3 mb-4">
                      <input
                        type="checkbox"
                        id="botEnabled"
                        checked={botEnabled}
                        onChange={(e) => handleBotEnabledChange(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="botEnabled" className="text-sm font-medium text-slate-200">
                        Включить дублирование лидов в Telegram канал
                      </label>
                    </div>
                    
                    {botEnabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Токен Telegram бота
                          </label>
                          <input
                            type="password"
                            value={botToken}
                            onChange={(e) => handleBotTokenChange(e.target.value)}
                            placeholder="Введите токен бота (получите у @BotFather)"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            ID канала/чата
                          </label>
                          <input
                            type="text"
                            value={channelId}
                            onChange={(e) => handleChannelIdChange(e.target.value)}
                            placeholder="Введите ID канала (например: @mychannel или -1001234567890)"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={testBot}
                            disabled={!botToken || !channelId || isBotTesting}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              !botToken || !channelId || isBotTesting
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isBotTesting ? '🔄 Тестирую...' : '🧪 Тест подключения'}
                          </button>
                          
                          {botTestResult && (
                            <span className={`text-sm ${
                              botTestResult.includes('успешно') ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {botTestResult}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xs text-slate-400 bg-slate-800 p-3 rounded border border-slate-600">
                          <p className="font-medium mb-2">💡 Как настроить:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Создайте бота через @BotFather в Telegram</li>
                            <li>Скопируйте токен бота и вставьте выше</li>
                            <li>Добавьте бота в ваш канал как администратора</li>
                            <li>Введите ID канала (начинается с @ или -100)</li>
                            <li>Нажмите "Тест подключения" для проверки</li>
                          </ol>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Автоматическая отправка лидов */}
              <div className="border-t border-slate-600 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-slate-200">Автоматическая отправка лидов</h4>
                  <button
                    onClick={() => setShowCronSettings(!showCronSettings)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showCronSettings ? '▼' : '▶'}
                  </button>
                </div>
                
                {showCronSettings && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-300">Включить автоматическую отправку</label>
                      <input
                        type="checkbox"
                        checked={cronEnabled}
                        onChange={(e) => handleCronEnabledChange(e.target.checked)}
                        className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {cronEnabled && (
                      <>
                        <div className="bg-slate-800 p-3 rounded border border-slate-600">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-400">Статус:</span>
                              <span className={`ml-2 font-medium ${
                                cronStatus === 'running' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {cronStatus === 'running' ? '🟢 Активен' : '🔴 Остановлен'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400">Последний запуск:</span>
                              <span className="ml-2 text-slate-300">
                                {cronLastRun || 'Не запускался'}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400">Следующий запуск:</span>
                              <span className="ml-2 text-slate-300">
                                {cronNextRun || 'Не запланирован'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={manualSendNewLeads}
                            disabled={isManualSending}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm rounded transition-colors"
                          >
                            {isManualSending ? 'Отправка...' : 'Отправить новые лиды сейчас'}
                          </button>
                          
                          <button
                            onClick={stopCronJob}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                          >
                            🛑 Остановить отправку
                          </button>
                          
                          <button
                            onClick={loadCronStatus}
                            className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors"
                          >
                            Обновить статус
                          </button>
                        </div>

                        <div className="text-xs text-slate-400 bg-slate-800 p-3 rounded border border-slate-600">
                          <p className="font-medium mb-2">ℹ️ Как это работает:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Система автоматически проверяет новые лиды каждый час</li>
                            <li>Отправляются только лиды, которые еще не были отправлены</li>
                            <li>После отправки лид помечается как "отправленный"</li>
                            <li>Убедитесь, что настроен Telegram бот для отправки</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Управление аккаунтами для контактирования лидов */}
              <div className="border-t border-slate-600 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-slate-200">Аккаунты для контактирования лидов</h4>
                  <button
                    onClick={() => setShowAccountManager(!showAccountManager)}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {showAccountManager ? 'Скрыть' : 'Управление'}
                  </button>
                </div>
                
                {showAccountManager && (
                  <div className="space-y-4">
                    {/* Список аккаунтов */}
                    <div className="bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-slate-200">Добавленные аккаунты</h5>
                        <span className="text-xs text-slate-400">{accounts.length} аккаунтов</span>
                      </div>
                      
                      {accounts.length === 0 ? (
                        <div className="text-center py-4">
                          <div className="text-slate-400 text-sm">
                            <svg className="w-8 h-8 mx-auto mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Нет добавленных аккаунтов
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {accounts.map((account, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-slate-600 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${account.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                <div>
                                  <div className="text-sm font-medium text-white">{account.name || account.phone}</div>
                                  <div className="text-xs text-slate-400">{account.type} • {account.status === 'active' ? 'Активен' : 'Неактивен'}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveAccount(account.id)}
                                className="text-red-400 hover:text-red-300 text-sm"
                              >
                                Удалить
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Добавление нового аккаунта */}
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h5 className="text-sm font-medium text-slate-200 mb-3">Добавить новый аккаунт</h5>
                      
                      {/* Выбор типа аккаунта */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Тип аккаунта</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setSelectedAccountType('pyrogram')}
                            className={`p-4 rounded-lg border-2 transition-colors ${
                              selectedAccountType === 'pyrogram'
                                ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                                : 'border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-2">🐍</div>
                              <div className="text-lg font-medium">Pyrogram</div>
                              <div className="text-sm">Session файл + JSON</div>
                            </div>
                          </button>
                          <button
                            onClick={() => setSelectedAccountType('authkey')}
                            className={`p-4 rounded-lg border-2 transition-colors ${
                              selectedAccountType === 'authkey'
                                ? 'border-green-500 bg-green-900/30 text-green-300'
                                : 'border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-2">🔑</div>
                              <div className="text-lg font-medium">Auth Key</div>
                              <div className="text-sm">Auth Key + DC ID</div>
                            </div>
                          </button>
                        </div>
                      </div>





                      {/* Условные формы для разных типов подключения */}
                      {selectedAccountType === 'pyrogram' && (
                        <div className="space-y-4">
                          <div className="text-center mb-4">
                            <h3 className="text-lg font-medium text-slate-200">Подключение Pyrogram аккаунта</h3>
                            <p className="text-sm text-slate-400 mt-1">
                              Выберите файл сессии Pyrogram и JSON конфигурацию для подключения аккаунта
                            </p>
                          </div>

                          {/* Файл сессии Pyrogram */}
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Файл сессии Pyrogram *
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="file"
                                accept=".session"
                                onChange={(e) => setSelectedPyrogramFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="pyrogram-file-input"
                              />
                              <label
                                htmlFor="pyrogram-file-input"
                                className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white cursor-pointer hover:bg-slate-500 transition-colors flex items-center"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                {selectedPyrogramFile ? selectedPyrogramFile.name : 'Выберите .session файл'}
                              </label>
                              {selectedPyrogramFile && (
                                <button
                                  onClick={() => setSelectedPyrogramFile(null)}
                                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>

                          {/* JSON конфигурация */}
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              JSON конфигурация аккаунта *
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="file"
                                accept=".json"
                                onChange={(e) => setSelectedConfigFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="config-file-input"
                              />
                              <label
                                htmlFor="config-file-input"
                                className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white cursor-pointer hover:bg-slate-500 transition-colors flex items-center"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                {selectedConfigFile ? selectedConfigFile.name : 'Выберите JSON файл с конфигурацией'}
                              </label>
                              {selectedConfigFile && (
                                <button
                                  onClick={() => setSelectedConfigFile(null)}
                                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              JSON файл должен содержать api_id, api_hash и имя аккаунта
                            </p>
                          </div>

                          {/* Имя аккаунта (автозаполняется из JSON) */}
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Имя аккаунта
                            </label>
                            <input
                              type="text"
                              value={pyrogramAccountName}
                              onChange={(e) => setPyrogramAccountName(e.target.value)}
                              placeholder="Будет заполнено автоматически из JSON"
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              readOnly={selectedConfigFile !== null}
                            />
                          </div>
                          
                          <input
                            type="file"
                            accept=".json"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelectedConfigFile(file);
                                // Читаем JSON файл для извлечения данных
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const jsonData = JSON.parse(event.target?.result as string);
                                    if (jsonData.api_id || jsonData.app_id) {
                                      setPyrogramApiId(String(jsonData.api_id || jsonData.app_id));
                                    }
                                    if (jsonData.api_hash || jsonData.app_hash) {
                                      setPyrogramApiHash(jsonData.api_hash || jsonData.app_hash);
                                    }
                                    if (jsonData.account_name) {
                                      setPyrogramAccountName(jsonData.account_name);
                                    }
                                  } catch (error) {
                                    console.error('Ошибка чтения JSON:', error);
                                  }
                                };
                                reader.readAsText(file);
                              }
                            }}
                            className="hidden"
                            id="config-file-input"
                          />
                          
                           {/* Прокси настройки */}
                           <div className="border-t border-slate-600 pt-4">
                             <div className="flex items-center mb-3">
                               <input
                                 type="checkbox"
                                 id="use-proxy"
                                 checked={pyrogramUseProxy}
                                 onChange={(e) => setPyrogramUseProxy(e.target.checked)}
                                 className="mr-2 rounded"
                               />
                               <label htmlFor="use-proxy" className="text-sm font-medium text-slate-300">
                                 Использовать прокси (опционально)
                               </label>
                             </div>
                             
                             {pyrogramUseProxy && (
                               <div className="space-y-3">
                                 <div className="grid grid-cols-2 gap-3">
                                   <div>
                                     <label className="block text-sm font-medium text-slate-300 mb-1">
                                       Хост прокси
                                     </label>
                                     <input
                                       type="text"
                                       value={pyrogramProxyHost}
                                       onChange={(e) => setPyrogramProxyHost(e.target.value)}
                                       placeholder="127.0.0.1"
                                       className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                     />
                                   </div>
                                   <div>
                                     <label className="block text-sm font-medium text-slate-300 mb-1">
                                       Порт
                                     </label>
                                     <input
                                       type="text"
                                       value={pyrogramProxyPort}
                                       onChange={(e) => setPyrogramProxyPort(e.target.value)}
                                       placeholder="1080"
                                       className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                     />
                                   </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-3">
                                   <div>
                                     <label className="block text-sm font-medium text-slate-300 mb-1">
                                       Логин (опционально)
                                     </label>
                                     <input
                                       type="text"
                                       value={pyrogramProxyUsername}
                                       onChange={(e) => setPyrogramProxyUsername(e.target.value)}
                                       placeholder="username"
                                       className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                     />
                                   </div>
                                   <div>
                                     <label className="block text-sm font-medium text-slate-300 mb-1">
                                       Пароль (опционально)
                                     </label>
                                     <input
                                       type="password"
                                       value={pyrogramProxyPassword}
                                       onChange={(e) => setPyrogramProxyPassword(e.target.value)}
                                       placeholder="password"
                                       className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                     />
                                   </div>
                                 </div>
                               </div>
                             )}
                           </div>

                           {pyrogramError && (
                             <div className="flex items-center p-3 bg-red-900/30 border border-red-700 rounded-lg">
                               <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                               <span className="text-red-300 text-sm">{pyrogramError}</span>
                             </div>
                           )}

                           {pyrogramSuccess && (
                             <div className="flex items-center p-3 bg-green-900/30 border border-green-700 rounded-lg">
                               <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                               <span className="text-green-300 text-sm">{pyrogramSuccess}</span>
                             </div>
                           )}
                          </div>
                      )}

                      {/* Форма для Auth Key */}
                      {selectedAccountType === 'authkey' && (
                        <div className="space-y-4">
                          <div className="text-center mb-4">
                            <h3 className="text-lg font-medium text-slate-200">Подключение через Auth Key</h3>
                            <p className="text-sm text-slate-400 mt-1">
                              Введите Auth Key и DC ID для создания StringSession
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Auth Key (hex) *</label>
                            <textarea
                              value={authKeyInput}
                              onChange={(e) => setAuthKeyInput(e.target.value)}
                              placeholder="Введите auth_key в hex формате (512 символов)"
                              className="w-full p-3 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 h-32 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <div className="text-xs text-slate-400 mt-1">
                              Длина: {authKeyInput.length}/512 символов
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">DC ID *</label>
                            <select
                              value={dcIdInput}
                              onChange={(e) => setDcIdInput(Number(e.target.value))}
                              className="w-full p-3 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              <option value={0}>Выберите DC ID</option>
                              <option value={1}>DC 1 (149.154.175.53)</option>
                              <option value={2}>DC 2 (149.154.167.51)</option>
                              <option value={3}>DC 3 (149.154.175.100)</option>
                              <option value={4}>DC 4 (149.154.167.91)</option>
                              <option value={5}>DC 5 (91.108.56.130)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Имя аккаунта *</label>
                            <input
                              type="text"
                              value={authKeyAccountName}
                              onChange={(e) => setAuthKeyAccountName(e.target.value)}
                              placeholder="Введите имя аккаунта"
                              className="w-full p-3 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>

                          {/* Прокси настройки для Auth Key */}
                          <div className="border-t border-slate-600 pt-4">
                            <div className="flex items-center mb-3">
                              <input
                                type="checkbox"
                                id="authkey-use-proxy"
                                checked={authKeyUseProxy}
                                onChange={(e) => setAuthKeyUseProxy(e.target.checked)}
                                className="mr-2 rounded"
                              />
                              <label htmlFor="authkey-use-proxy" className="text-sm font-medium text-slate-300">
                                Использовать прокси (опционально)
                              </label>
                            </div>
                            
                            {authKeyUseProxy && (
                              <div className="space-y-3">
                                {/* Поле для ввода прокси одной строкой */}
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Прокси одной строкой (host:port:username:password)
                                  </label>
                                  <input
                                    type="text"
                                    value={authKeyProxyString}
                                    onChange={(e) => handleProxyStringChange(e.target.value)}
                                    placeholder="91.233.20.6:8000:xotxwC:oG3bMm"
                                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                  />
                                  <p className="text-xs text-slate-400 mt-1">
                                    Введите прокси в формате host:port:username:password (автоматически заполнит поля ниже)
                                  </p>
                                </div>
                                
                                {/* Разделитель */}
                                <div className="flex items-center my-3">
                                  <div className="flex-1 border-t border-slate-600"></div>
                                  <span className="px-3 text-xs text-slate-400">или заполните вручную</span>
                                  <div className="flex-1 border-t border-slate-600"></div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Тип прокси
                                  </label>
                                  <select
                                    value={authKeyProxyType}
                                    onChange={(e) => setAuthKeyProxyType(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                  >
                                    <option value="http">HTTP</option>
                                    <option value="https">HTTPS</option>
                                    <option value="socks4">SOCKS4</option>
                                    <option value="socks5">SOCKS5</option>
                                  </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                      Хост прокси
                                    </label>
                                    <input
                                      type="text"
                                      value={authKeyProxyHost}
                                      onChange={(e) => setAuthKeyProxyHost(e.target.value)}
                                      placeholder="127.0.0.1"
                                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                      Порт
                                    </label>
                                    <input
                                      type="text"
                                      value={authKeyProxyPort}
                                      onChange={(e) => setAuthKeyProxyPort(e.target.value)}
                                      placeholder="1080"
                                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                      Логин (опционально)
                                    </label>
                                    <input
                                      type="text"
                                      value={authKeyProxyUsername}
                                      onChange={(e) => setAuthKeyProxyUsername(e.target.value)}
                                      placeholder="username"
                                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                      Пароль (опционально)
                                    </label>
                                    <input
                                      type="password"
                                      value={authKeyProxyPassword}
                                      onChange={(e) => setAuthKeyProxyPassword(e.target.value)}
                                      placeholder="password"
                                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {authKeyError && (
                            <div className="flex items-center p-3 bg-red-900/30 border border-red-700 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                              <span className="text-red-300 text-sm">{authKeyError}</span>
                            </div>
                          )}

                          {authKeySuccess && (
                            <div className="flex items-center p-3 bg-green-900/30 border border-green-700 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                              <span className="text-green-300 text-sm">{authKeySuccess}</span>
                            </div>
                          )}

                          <button
                            onClick={handleAddAccount}
                            disabled={
                              !authKeyInput || !dcIdInput || !authKeyAccountName || isAuthKeyUploading ||
                              authKeyInput.length !== 512 || !/^[0-9a-fA-F]+$/.test(authKeyInput)
                            }
                            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                              !authKeyInput || !dcIdInput || !authKeyAccountName || isAuthKeyUploading ||
                              authKeyInput.length !== 512 || !/^[0-9a-fA-F]+$/.test(authKeyInput)
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {isAuthKeyUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Подключаю аккаунт...
                              </>
                            ) : (
                              '🔑 Подключить через Auth Key'
                            )}
                          </button>
                        </div>
                      )}

                      {selectedAccountType === 'pyrogram' && (
                        <div>
                          <button
                            onClick={handleAddAccount}
                            disabled={
                              !selectedPyrogramFile || !selectedConfigFile || isPyrogramUploading
                            }
                            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                              !selectedPyrogramFile || !selectedConfigFile || isPyrogramUploading
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                          >
                            {isPyrogramUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Подключаю аккаунт...
                              </>
                            ) : (
                              '🐍 Подключить Pyrogram аккаунт'
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedAccountType === 'authkey' && (
                      <div className="bg-slate-700 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-slate-200 mb-2">Как подключить аккаунт через Auth Key</h5>
                        <ul className="text-sm text-slate-400 space-y-1">
                          <li>• <strong>Auth Key:</strong> 512-символьная hex строка из Telegram клиента</li>
                          <li>• <strong>DC ID:</strong> Номер дата-центра (1-5)</li>
                          <li>• <strong>Имя аккаунта:</strong> Произвольное имя для идентификации</li>
                          <li>• Система автоматически создаст StringSession для подключения</li>
                          <li>• Все данные обрабатываются локально и безопасно</li>
                        </ul>
                      </div>
                    )}

                    {selectedAccountType === 'pyrogram' && (
                      <div className="bg-slate-700 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-slate-200 mb-2">Как подключить Pyrogram аккаунт</h5>
                        <ul className="text-sm text-slate-400 space-y-1">
                          <li>• <strong>Файл сессии:</strong> Выберите .session файл Pyrogram</li>
                          <li>• <strong>JSON конфигурация:</strong> Файл с api_id, api_hash и account_name</li>
                          <li>• <strong>Имя аккаунта:</strong> Автоматически извлекается из JSON</li>
                          <li>• <strong>Прокси:</strong> Опционально для дополнительной безопасности</li>
                          <li>• API данные автоматически извлекаются из JSON конфигурации</li>
                          <li>• Все данные обрабатываются локально и безопасно</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="bg-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-200 mb-2">Информация</h4>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• API ключ используется для анализа сообщений с помощью AI</li>
                  <li>• Критерии помогают AI понять, какие лиды вам нужны</li>
                  <li>• Настройки Telegram нужны для отправки сообщений лидам</li>
                  <li>• Все данные обрабатываются локально и через OpenRouter API</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Заголовок */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 shadow-lg border-polza-gradient">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-3xl font-bold text-white">AI Анализ лидов</h2>

            </div>
            <p className="text-slate-300">Автоматический поиск потенциальных клиентов после каждого парсинга</p>
          </div>
          
          {/* Информация о настройках */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`flex items-center p-3 rounded-lg ${settings.openrouterApiKey ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
              <div className={`w-3 h-3 rounded-full mr-3 ${settings.openrouterApiKey ? 'status-success' : 'status-error'}`}></div>
              <div>
                <p className="text-sm font-medium text-slate-200">OpenRouter API ключ</p>
                <p className="text-xs text-slate-400">
                  {settings.openrouterApiKey ? 'Настроен и готов к работе' : 'Требуется настройка выше'}
                </p>
              </div>
            </div>
            <div className={`flex items-center p-3 rounded-lg ${settings.leadCriteria ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
              <div className={`w-3 h-3 rounded-full mr-3 ${settings.leadCriteria ? 'status-success' : 'status-error'}`}></div>
              <div>
                <p className="text-sm font-medium text-slate-200">Критерии поиска</p>
                <p className="text-xs text-slate-400">
                  {settings.leadCriteria ? 'Критерии определены' : 'Требуется настройка выше'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Информация об автоматическом анализе */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-900/30 border border-blue-700 rounded-lg">
              <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-300 text-sm font-medium">
                Анализ лидов запускается автоматически после парсинга сообщений.
                Результаты сохраняются в интерфейсе и во втором листе Google Таблицы.
              </span>
              {leads.length === 0 && (
                <p className="text-amber-400 text-xs mt-2">
                  💡 Для запуска анализа убедитесь, что настроены: OpenRouter API ключ и критерии поиска лидов
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Фильтр по релевантности */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-600">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-100">Фильтр по релевантности</h3>
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-sm text-slate-300">Минимальный уровень:</label>
              <select
                value={relevanceFilter}
                onChange={(e) => setRelevanceFilter(Number(e.target.value))}
                className="px-4 py-2 bg-slate-700 text-slate-100 border border-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
              >
                <option value={0}>🔍 Все лиды</option>
                <option value={80}>🔥 Высокая (80%+)</option>
                <option value={60}>⚡ Средняя (60%+)</option>
                <option value={40}>💡 Низкая (40%+)</option>
                <option value={20}>📝 Очень низкая (20%+)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Список лидов */}
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-100 flex items-center">
                <svg className="w-6 h-6 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Найденные лиды
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowResponsesPanel(!showResponsesPanel)}
                  className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                    showResponsesPanel 
                      ? 'bg-green-600 text-white' 
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  💬 Ответы ({leadResponses.filter(r => !r.read).length})
                </button>
                <span className="px-3 py-1 bg-polza-gradient text-white text-sm font-medium rounded-full">
                  {filteredLeads.length}
                </span>
                {filteredLeads.length !== leads.length && (
                  <span className="text-sm text-slate-400">из {leads.length}</span>
                )}
              </div>
            </div>
          </div>
        
          {/* Панель ответов лидов */}
          {showResponsesPanel && (
            <div className="border-b border-slate-700 bg-slate-800">
              <div className="p-6">
                <h4 className="text-lg font-semibold text-slate-100 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Ответы лидов ({leadResponses.length})
                </h4>
                
                {leadResponses.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-slate-400">Ответов пока нет</p>
                    <p className="text-slate-500 text-sm mt-1">Ответы лидов будут отображаться здесь</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {leadResponses.map((response) => (
                      <div 
                        key={response.id} 
                        className={`p-4 rounded-lg border transition-all ${
                          response.read 
                            ? 'bg-slate-700 border-slate-600' 
                            : 'bg-blue-900/20 border-blue-500/30'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-slate-100">{response.leadName}</span>
                            {!response.read && (
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">Новый</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-400">
                              {new Date(response.timestamp).toLocaleString('ru-RU')}
                            </span>
                            {!response.read && (
                              <button
                                onClick={() => markResponseAsRead(response.id)}
                                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              >
                                ✓ Прочитано
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-slate-300 text-sm">{response.message}</p>
                        <div className="mt-2 text-xs text-slate-500">
                          Chat ID: {response.chatId}
                        </div>
                        
                        {/* Кнопка для открытия чата */}
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => openChatWithLead(response)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>Ответить</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-slate-400 text-lg mb-2">
                {leads.length === 0 
                  ? "Лиды пока не найдены"
                  : "Нет лидов для выбранного фильтра"
                }
              </p>
              <p className="text-slate-500 text-sm">
                {leads.length === 0 
                  ? "Запустите анализ сообщений для поиска потенциальных клиентов"
                  : "Попробуйте изменить настройки фильтра релевантности"
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="p-6 hover:bg-slate-750 transition-all duration-200 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-100 text-lg">{lead.author}</span>
                          {lead.contacted && (
                            <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Связались
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z" />
                          </svg>
                          <span className="text-sm text-slate-400 bg-slate-700 px-2 py-1 rounded">{lead.channel}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-400">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTimestamp(lead.timestamp)}</span>
                        </div>
                        {lead.confidence && (
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(lead.confidence)} bg-slate-700`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>{lead.confidence}% релевантности</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center text-sm font-medium text-slate-300 mb-2">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      Сообщение:
                    </div>
                    <div className="text-sm text-slate-200 bg-slate-700 p-4 rounded-lg border-l-4 border-polza-primary group-hover:bg-slate-600 transition-colors">
                      {lead.message}
                    </div>
                  </div>
                  
                  {lead.reason && (
                    <div>
                      <div className="flex items-center text-sm font-medium text-slate-300 mb-2">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Обоснование AI:
                      </div>
                      <div className="text-sm text-slate-400 bg-slate-700/50 p-3 rounded-lg italic">
                        {lead.reason}
                      </div>
                    </div>
                  )}
                  
                  {/* Кнопка действия */}
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <button
                      onClick={() => openMessageModal(lead)}
                      disabled={accounts.length === 0}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center ${
                        accounts.length === 0
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {accounts.length === 0 ? 'Нет аккаунтов' : 'Написать'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Модальное окно для отправки сообщений */}
        {showMessageModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Отправить сообщение</h3>
                <button
                  onClick={closeMessageModal}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-slate-700 rounded-lg">
                <p className="text-sm text-slate-300 mb-2">Получатель:</p>
                <p className="font-semibold text-white">{selectedLead.author}</p>
                <p className="text-sm text-slate-400 mt-1">Канал: {selectedLead.channel}</p>
              </div>
              
              {/* Отображение активного аккаунта */}
              {accounts.length > 0 && (
                <div className="mb-4 p-4 bg-green-900/30 border border-green-600/30 rounded-lg">
                  <p className="text-sm text-green-300 mb-2">Активный аккаунт для отправки:</p>
                  <p className="font-semibold text-green-200">
                    {accounts[currentAccountIndex]?.name || accounts[currentAccountIndex]?.id || 'Неизвестный аккаунт'}
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    Тип: {accounts[currentAccountIndex]?.type === 'json' ? 'JSON Session' : 'TData'} 
                    ({currentAccountIndex + 1} из {accounts.length})
                  </p>
                </div>
              )}
              
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-300 mb-3">Выберите тип сообщения:</p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setMessageType('ai')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      messageType === 'ai'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    🤖 AI сообщение
                  </button>
                  <button
                    onClick={() => setMessageType('manual')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      messageType === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    ✏️ Написать самому
                  </button>
                </div>
              </div>
              
              {messageType === 'ai' && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-slate-300">
                      AI сгенерированное сообщение
                    </label>
                    <button
                      onClick={generateAiMessage}
                      disabled={isGeneratingMessage || !settings.openrouterApiKey}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        isGeneratingMessage || !settings.openrouterApiKey
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {isGeneratingMessage ? '🔄 Генерирую...' : '✨ Сгенерировать'}
                    </button>
                  </div>
                  <textarea
                    value={aiGeneratedMessage}
                    onChange={(e) => setAiGeneratedMessage(e.target.value)}
                    placeholder="Нажмите 'Сгенерировать' для создания AI сообщения..."
                    rows={6}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              )}
              
              {messageType === 'manual' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Ваше сообщение
                  </label>
                  <textarea
                    value={manualMessage}
                    onChange={(e) => setManualMessage(e.target.value)}
                    placeholder="Введите ваше сообщение..."
                    rows={6}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeMessageModal}
                  className="px-4 py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={sendMessage}
                  disabled={isSendingMessage || !messageType || 
                    (messageType === 'ai' && !aiGeneratedMessage.trim()) ||
                    (messageType === 'manual' && !manualMessage.trim())}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isSendingMessage || !messageType || 
                    (messageType === 'ai' && !aiGeneratedMessage.trim()) ||
                    (messageType === 'manual' && !manualMessage.trim())
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isSendingMessage ? '📤 Отправляю...' : '📤 Отправить'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Модальное окно чата с лидом */}
        {selectedChatLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg w-full max-w-2xl h-3/4 flex flex-col">
              {/* Заголовок чата */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">{selectedChatLead.leadName}</h3>
                    <p className="text-sm text-slate-400">Chat ID: {selectedChatLead.chatId}</p>
                  </div>
                </div>
                <button
                  onClick={closeChatWithLead}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* История сообщений */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromLead ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isFromLead
                          ? 'bg-slate-700 text-slate-100'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(message.timestamp).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                ))}
                
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-slate-400">История переписки пуста</p>
                    <p className="text-slate-500 text-sm mt-1">Начните диалог с лидом</p>
                  </div>
                )}
              </div>
              
              {/* Поле ввода сообщения */}
              <div className="p-4 border-t border-slate-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !sendingMessage && newMessage.trim() && sendMessageToLead()}
                    placeholder="Введите сообщение..."
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={sendMessageToLead}
                    disabled={sendingMessage || !newMessage.trim()}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      sendingMessage || !newMessage.trim()
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {sendingMessage ? '📤' : '➤'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsPanel;