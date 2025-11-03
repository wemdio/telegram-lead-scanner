// API Configuration for different environments

// Environment detection
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isElectron = typeof window !== 'undefined' && (window.navigator?.userAgent?.includes('Electron') || (window as any).require || (window as any).electronAPI);

// Simple and reliable detection for Electron/Desktop app
function getApiBaseUrl(): string {
  console.log('🔧 getApiBaseUrl called - environment check:');
  console.log('  - window exists:', typeof window !== 'undefined');
  
  // If we're in a browser environment
  if (typeof window !== 'undefined') {
    console.log('  - protocol:', window.location.protocol);
    console.log('  - hostname:', window.location.hostname);
    console.log('  - port:', window.location.port);
    console.log('  - userAgent:', window.navigator?.userAgent);
    console.log('  - electronAPI exists:', !!(window as any).electronAPI);
    console.log('  - require exists:', !!(window as any).require);
    console.log('  - process.type:', typeof (window as any).process?.type);
    console.log('  - isProduction:', isProduction);
    console.log('  - isDevelopment:', isDevelopment);
    
    // В Electron окружении получаем порт динамически
    if ((window as any).electronAPI) {
      const port = (window as any).electronAPI.getServerPort();
      console.log('🔧 Detected electronAPI - using dynamic port:', port);
      return `http://localhost:${port}/api`;
    }
    
    // Для production сборки всегда используем относительный путь (через _redirects)
    if (isProduction) {
      console.log('🔧 Production build detected - using relative API path');
      return '/api';
    }
    
    // Check if running from file:// protocol in development (только для разработки)
    if (window.location.protocol === 'file:' && isDevelopment) {
      console.log('🔧 Detected file:// protocol in development - using localhost API');
      return 'http://localhost:3001/api';
    }
    
    // Check if running on localhost with Vite dev server (port 5173 or 5174)
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
        (window.location.port === '5173' || window.location.port === '5174')) {
      console.log('🔧 Detected Vite dev server - using proxy API');
      return '/api';  // Use Vite proxy
    }
    
    // Check if running on localhost (other ports)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🔧 Detected localhost - using localhost API');
      return 'http://localhost:3001/api';
    }
    
    // Check for Electron user agent
    if (window.navigator?.userAgent?.includes('Electron')) {
      console.log('🔧 Detected Electron user agent - using localhost API');
      return 'http://localhost:3001/api';
    }
    
    // Check for Electron-specific globals
    if ((window as any).require || typeof (window as any).process?.type === 'string') {
      console.log('🔧 Detected Electron globals - using localhost API');
      return 'http://localhost:3001/api';
    }
  }
  
  // Default to relative API for web deployment
  console.log('🔧 Using relative API for web deployment');
  return '/api';
}

// Base API URL configuration
export const API_BASE_URL = getApiBaseUrl();

// Debug information
console.log('🔧 Final API Configuration:', {
  protocol: typeof window !== 'undefined' ? window.location.protocol : 'undefined',
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'undefined',
  userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'undefined',
  API_BASE_URL
});

// API Endpoints
export const API_ENDPOINTS = {
  // Scanner endpoints
  scanner: {
    status: `${API_BASE_URL}/scanner/status`,
    history: `${API_BASE_URL}/scanner/history`,
    start: `${API_BASE_URL}/scanner/start`,
    stop: `${API_BASE_URL}/scanner/stop`,
    scan: `${API_BASE_URL}/scanner/scan`
  },
  
  // Telegram endpoints
  telegram: {
    auth: `${API_BASE_URL}/telegram/auth`,
    sendCode: `${API_BASE_URL}/telegram/auth/send-code`,
    verifyCode: `${API_BASE_URL}/telegram/auth/verify-code`,
    clearSession: `${API_BASE_URL}/telegram/clear-session`,
    getChats: `${API_BASE_URL}/telegram/chats`,
    testConnection: `${API_BASE_URL}/telegram/status`,
    initialize: `${API_BASE_URL}/telegram/initialize`,
    disconnect: `${API_BASE_URL}/telegram/disconnect`,
    messages: `${API_BASE_URL}/telegram/messages`,
    checkConnection: `${API_BASE_URL}/telegram/check-connection`,
    sendMessage: `${API_BASE_URL}/telegram/send-message`,
    // Новые эндпоинты для управления аккаунтами
    getAccounts: `${API_BASE_URL}/telegram/accounts`,
    addAccount: `${API_BASE_URL}/telegram/accounts/add`,
    removeAccount: `${API_BASE_URL}/telegram/accounts/remove`,
    // Эндпоинты для подключения через Auth Key и Pyrogram
    createSessionFromAuthKey: `${API_BASE_URL}/telegram/create-session-from-authkey`,
    createSessionFromPyrogram: `${API_BASE_URL}/telegram/create-session-from-pyrogram`
  },
  
  // Google Sheets endpoints
  sheets: {
    initialize: `${API_BASE_URL}/sheets/initialize`,
    autoInitialize: `${API_BASE_URL}/sheets/auto-initialize`,
    create: `${API_BASE_URL}/sheets/create`,
    append: `${API_BASE_URL}/sheets/append`,
    clear: `${API_BASE_URL}/sheets/clear`,
    headers: `${API_BASE_URL}/sheets/headers`,
    status: `${API_BASE_URL}/sheets/status`,
    leads: `${API_BASE_URL}/sheets/leads` // Новый эндпоинт для чтения лидов из Google Sheets
  },
  
  // Leads endpoints
  leads: {
    base: `${API_BASE_URL}/leads`,
    status: `${API_BASE_URL}/leads/status`,
    analyze: `${API_BASE_URL}/leads/analyze`,
    stop: `${API_BASE_URL}/leads/stop`,
    generateMessage: `${API_BASE_URL}/leads/generate-message`,
    responses: `${API_BASE_URL}/leads/responses`,
    markResponseRead: (id: string) => `${API_BASE_URL}/leads/responses/${id}/read`,
    markAsContacted: (id: string) => `${API_BASE_URL}/leads/contact/${id}`,
    chat: (leadId: string) => `${API_BASE_URL}/leads/chat/${leadId}`,
    sendMessage: `${API_BASE_URL}/leads/send-message`
  },

  // Cron endpoints
  cron: {
    status: `${API_BASE_URL}/cron/status`,
    start: `${API_BASE_URL}/cron/start`,
    stop: `${API_BASE_URL}/cron/stop`,
    sendNewLeads: `${API_BASE_URL}/cron/send-new-leads`
  },

  // Settings endpoints
  settings: {
    googleSheets: `${API_BASE_URL}/settings/google-sheets`,
    telegram: `${API_BASE_URL}/settings/telegram`
  }
};

// HTTP Client configuration
export const httpConfig = {
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json'
  }
};

// Helper function to make API requests
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  console.log('🔧 API Request starting:', { url, method: options.method || 'GET' });
  
  const config = {
    ...httpConfig,
    ...options,
    headers: {
      ...httpConfig.headers,
      ...options.headers
    }
  };
  
  console.log('🔧 Request config:', config);
  
  try {
    console.log('🔧 Making fetch request...');
    const response = await fetch(url, config);
    console.log('🔧 Response received:', { 
      status: response.status, 
      ok: response.ok, 
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      let errorData = '';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorJson = await response.json();
          errorData = errorJson.error || errorJson.message || JSON.stringify(errorJson);
        } else {
          errorData = await response.text();
        }
      } catch (parseError) {
        console.warn('🔧 Failed to parse error response:', parseError);
        errorData = response.statusText || 'Unknown error';
      }
      console.error('🔧 API Error response:', errorData);
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }
    
    let responseData;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const textData = await response.text();
        responseData = textData ? JSON.parse(textData) : {};
      }
    } catch (parseError) {
      console.warn('🔧 Failed to parse response as JSON:', parseError);
      const textData = await response.text();
      responseData = { message: textData || 'Empty response' };
    }
    
    console.log('🔧 Response data:', responseData);
    return responseData;
  } catch (error) {
    console.error('🔧 API Request failed:', error);
    throw error;
  }
};

// Environment info for debugging
export const ENV_INFO = {
  isDevelopment,
  isProduction,
  isLocalhost,
  isElectron,
  userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'undefined',
  hostname: typeof window !== 'undefined' ? window.location?.hostname : 'undefined',
  baseUrl: API_BASE_URL,
  mode: import.meta.env.MODE
};

console.log('🔧 API Configuration loaded:', ENV_INFO);