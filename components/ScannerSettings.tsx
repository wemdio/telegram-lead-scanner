import React, { useState, useEffect } from 'react';
import { ScannerSettings as ScannerSettingsType, ChatInfo } from '../types';
import { LoaderIcon } from './icons/LoaderIcon';
import { SearchIcon } from './icons/SearchIcon';
import { API_BASE_URL } from '../src/config/api';
import TelegramSessionCreator from './TelegramSessionCreator';

interface ScannerSettingsProps {
  onSave: (settings: ScannerSettingsType) => void;
  onLoadChats: (apiId: string, apiHash: string, sessionString?: string) => Promise<ChatInfo[]>;
  isLoading: boolean;
}

const ScannerSettings: React.FC<ScannerSettingsProps> = ({ onSave, onLoadChats, isLoading }) => {
  const [settings, setSettings] = useState<ScannerSettingsType>({
    telegramApiId: '',
    telegramApiHash: '',
    telegramSessionString: '',
    googleServiceAccountEmail: '',
    googlePrivateKey: '',
    googleSpreadsheetId: '',
    selectedChatIds: [],
    scanInterval: 1 // Every hour (fixed)
  });

  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load all settings from localStorage on component mount
  useEffect(() => {
    const savedSessionString = localStorage.getItem('telegramSessionString');
    const savedApiId = localStorage.getItem('telegramApiId');
    const savedApiHash = localStorage.getItem('telegramApiHash');
    const savedGoogleEmail = localStorage.getItem('googleServiceAccountEmail');
    const savedGoogleKey = localStorage.getItem('googlePrivateKey');
    const savedSpreadsheetId = localStorage.getItem('googleSpreadsheetId');
    const savedChatIds = localStorage.getItem('selectedChatIds');
    const savedScanInterval = localStorage.getItem('scanInterval');
    const savedOpenrouterApiKey = localStorage.getItem('openrouterApiKey');
    const savedLeadCriteria = localStorage.getItem('leadCriteria');
    
    setSettings(prev => ({
      ...prev,
      telegramSessionString: savedSessionString ?? '',
      telegramApiId: savedApiId ?? '',
      telegramApiHash: savedApiHash ?? '',
      googleServiceAccountEmail: savedGoogleEmail ?? '',
      googlePrivateKey: savedGoogleKey ?? '',
      googleSpreadsheetId: savedSpreadsheetId ?? '',
      selectedChatIds: savedChatIds ? JSON.parse(savedChatIds) : [],
      scanInterval: 1, // Fixed to every hour
      openrouterApiKey: savedOpenrouterApiKey ?? '',
      leadCriteria: savedLeadCriteria ?? ''
    }));
  }, []);

  // Validate session string when API credentials and session string are available
  useEffect(() => {
    const validateSession = async () => {
      if (settings.telegramApiId && settings.telegramApiHash && settings.telegramSessionString) {
        try {
          const response = await fetch(`${API_BASE_URL}/telegram/auth/validate-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiId: settings.telegramApiId,
              apiHash: settings.telegramApiHash,
              sessionString: settings.telegramSessionString
            })
          });

          const result = await response.json();
          
          if (!result.valid) {
            console.warn('Saved session string is invalid, clearing it');
            localStorage.removeItem('telegramSessionString');
            setSettings(prev => ({
              ...prev,
              telegramSessionString: ''
            }));
          }
        } catch (error) {
          console.error('Error validating session:', error);
        }
      }
    };

    validateSession();
  }, [settings.telegramApiId, settings.telegramApiHash, settings.telegramSessionString]);

  const handleInputChange = (field: keyof ScannerSettingsType, value: string | number) => {
    // Ensure value is never undefined or null
    const safeValue = value ?? '';
    
    setSettings(prev => ({
      ...prev,
      [field]: safeValue
    }));
    
    // Automatically save to localStorage when session string is updated
    if (field === 'telegramSessionString') {
      localStorage.setItem('telegramSessionString', safeValue as string);
    }
  };

  const handleLoadChats = async () => {
    if (!settings.telegramApiId || !settings.telegramApiHash) {
      alert('Пожалуйста, введите API ID и API Hash для Telegram');
      return;
    }

    setLoadingChats(true);
    try {
      const loadedChats = await onLoadChats(settings.telegramApiId, settings.telegramApiHash, settings.telegramSessionString);
      setChats(loadedChats.map(chat => ({ ...chat, selected: false })));
    } catch (error) {
      console.error('Error loading chats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке чатов';
      alert(errorMessage);
    } finally {
      setLoadingChats(false);
    }
  };

  const handleChatToggle = (chatId: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, selected: !chat.selected } : chat
    ));
    
    const selectedIds = chats
      .map(chat => chat.id === chatId ? { ...chat, selected: !chat.selected } : chat)
      .filter(chat => chat.selected)
      .map(chat => chat.id);
    
    setSettings(prev => ({
      ...prev,
      selectedChatIds: selectedIds
    }));
  };

  const handleSelectAllChats = () => {
    const allSelected = chats.every(chat => chat.selected);
    const newSelectedState = !allSelected;
    
    const updatedChats = chats.map(chat => ({ ...chat, selected: newSelectedState }));
    setChats(updatedChats);
    
    const selectedIds = newSelectedState ? updatedChats.map(chat => chat.id) : [];
    
    setSettings(prev => ({
      ...prev,
      selectedChatIds: selectedIds
    }));
  };

  const handleSave = async () => {
    if (!settings.telegramApiId || !settings.telegramApiHash || !settings.telegramSessionString) {
      alert('Пожалуйста, заполните все поля для Telegram API');
      return;
    }
    
    if (!settings.googleServiceAccountEmail || !settings.googlePrivateKey || !settings.googleSpreadsheetId) {
      alert('Пожалуйста, заполните все поля для Google Sheets');
      return;
    }
    
    if (settings.selectedChatIds.length === 0) {
      alert('Пожалуйста, выберите хотя бы один чат для мониторинга');
      return;
    }
    
    // Save all settings to localStorage
    localStorage.setItem('telegramApiId', settings.telegramApiId);
    localStorage.setItem('telegramApiHash', settings.telegramApiHash);
    localStorage.setItem('telegramSessionString', settings.telegramSessionString);
    localStorage.setItem('googleServiceAccountEmail', settings.googleServiceAccountEmail);
    localStorage.setItem('googlePrivateKey', settings.googlePrivateKey);
    localStorage.setItem('googleSpreadsheetId', settings.googleSpreadsheetId);
    localStorage.setItem('selectedChatIds', JSON.stringify(settings.selectedChatIds));
    localStorage.setItem('scanInterval', settings.scanInterval.toString());
    localStorage.setItem('openrouterApiKey', settings.openrouterApiKey || '');
    localStorage.setItem('leadCriteria', settings.leadCriteria || '');
    
    // Send Google Sheets settings to backend
    try {
      const { API_ENDPOINTS, apiRequest } = await import('../src/config/api');
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
    
    onSave(settings);
  };

  // Fixed interval: every hour

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Настройки Telegram API</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API ID
            </label>
            <input
              type="text"
              value={settings.telegramApiId}
              onChange={(e) => handleInputChange('telegramApiId', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="Введите API ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              API Hash
            </label>
            <input
              type="password"
              value={settings.telegramApiHash}
              onChange={(e) => handleInputChange('telegramApiHash', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="Введите API Hash"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Session String (опционально)
            </label>
            <input
              type="password"
              value={settings.telegramSessionString}
              onChange={(e) => handleInputChange('telegramSessionString', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="Введите session string для аутентификации"
            />
            <p className="text-xs text-slate-400 mt-1">
              Если у вас есть сохраненная сессия, введите ее здесь. Иначе потребуется новая аутентификация.
            </p>
          </div>
          
          {!settings.telegramSessionString && (
            <div className="space-y-4">
              <TelegramSessionCreator
                apiId={settings.telegramApiId}
                apiHash={settings.telegramApiHash}
                onSessionCreated={(sessionData) => {
                  console.log('Получены данные сессии:', sessionData);
                  const sessionString = sessionData?.sessionString ?? '';
                  if (sessionString) {
                    handleInputChange('telegramSessionString', sessionString);
                    console.log('Session string сохранен в localStorage:', sessionString);
                  } else {
                    console.error('Session string пуст или undefined:', sessionData);
                  }
                }}
              />
            </div>
          )}
          
          <button
            onClick={handleLoadChats}
            disabled={loadingChats || !settings.telegramApiId || !settings.telegramApiHash}
            className="btn-polza flex items-center gap-2 px-4 py-2"
          >
            {loadingChats ? (
              <LoaderIcon className="w-4 h-4" />
            ) : (
              <SearchIcon className="w-4 h-4" />
            )}
            Загрузить чаты
          </button>
        </div>
      </div>

      {chats.length > 0 && (
        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-100">Выберите чаты для мониторинга</h3>
            <button
              onClick={handleSelectAllChats}
              className="px-3 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-colors"
            >
              {chats.every(chat => chat.selected) ? 'Снять все' : 'Выбрать все'}
            </button>
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {chats.map(chat => (
              <label key={chat.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chat.selected}
                  onChange={() => handleChatToggle(chat.id)}
                  className="w-4 h-4 text-cyan-600 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
                />
                <div className="flex-1">
                  <div className="text-slate-100 font-medium">{chat.title}</div>
                  <div className="text-slate-400 text-sm">{chat.type} • ID: {chat.id}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Настройки Google Sheets</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Service Account Email
            </label>
            <input
              type="email"
              value={settings.googleServiceAccountEmail}
              onChange={(e) => handleInputChange('googleServiceAccountEmail', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="service-account@project.iam.gserviceaccount.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Private Key
            </label>
            <textarea
              value={settings.googlePrivateKey}
              onChange={(e) => handleInputChange('googlePrivateKey', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:border-cyan-500 h-24"
              placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Spreadsheet ID
            </label>
            <input
              type="text"
              value={settings.googleSpreadsheetId}
              onChange={(e) => handleInputChange('googleSpreadsheetId', e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:border-cyan-500"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            />
          </div>
        </div>
      </div>



      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Настройки сканирования</h3>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Интервал сканирования
          </label>
          <div className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-slate-100">
            Каждый час (фиксированно)
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isLoading}
        className="btn-polza w-full px-4 py-3 font-medium"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <LoaderIcon className="w-4 h-4" />
            Сохранение...
          </div>
        ) : (
          'Сохранить настройки и запустить сканер'
        )}
      </button>
    </div>
  );
};

export default ScannerSettings;