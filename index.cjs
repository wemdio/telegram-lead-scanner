const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Load environment variables based on NODE_ENV
// В production среде (облачный деплой) переменные окружения настраиваются через панель управления
// Timeweb Cloud автоматически устанавливает NODE_ENV=production
if (process.env.NODE_ENV !== 'production' && !process.env.PORT) {
  // Только в development режиме загружаем .env файлы
  require('dotenv').config();
}

const telegramRoutes = require('./routes/telegram.cjs');
const telegramBotRoutes = require('./routes/telegram-bot.cjs');
const sheetsRoutes = require('./routes/sheets.cjs');
const sheetsTestRoutes = require('./routes/sheets-test.cjs');
const scannerRoutes = require('./routes/scanner.cjs');
const leadsRoutes = require('./routes/leads.cjs');
const leadsUpdateRoutes = require('./routes/leads-update.cjs');
const cronRoutes = require('./routes/cron.cjs');
const sheetsUpdateRoutes = require('./routes/sheets-update.cjs');
const settingsRoutes = require('./routes/settings.cjs');

// Функция для проверки и запуска автоанализа при старте сервера
async function checkAndTriggerAutoAnalysis() {
  try {
    console.log('🔍 Проверяем необходимость автоанализа при запуске сервера...');
    
    // В облачной среде пропускаем автоанализ при запуске, чтобы избежать циклических запросов
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Пропускаем автоанализ при запуске в production среде');
      return;
    }
    
    // Добавляем задержку для полной инициализации сервера
    setTimeout(async () => {
      try {
        const serverPort = process.env.PORT || 3001;
        const response = await fetch(`http://localhost:${serverPort}/api/scanner/status`);
        const scannerStatus = await response.json();
        
        if (scannerStatus.lastScan) {
          const lastScanTime = new Date(scannerStatus.lastScan);
          const now = new Date();
          const timeSinceLastScan = now - lastScanTime;
          const minutesSinceLastScan = Math.floor(timeSinceLastScan / (1000 * 60));
          
          console.log(`⏰ Время с последнего сканирования: ${minutesSinceLastScan} минут`);
          
          // Если прошло больше 2 минут с последнего сканирования, запускаем автоанализ
          if (minutesSinceLastScan >= 2) {
            console.log('🚀 Запускаем автоанализ для пропущенного сканирования...');
            
            // Запускаем автоанализ
            const analysisResponse = await fetch(`http://localhost:${serverPort}/api/scanner/trigger-analysis`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            });
        
        if (analysisResponse.ok) {
          console.log('✅ Автоанализ успешно запущен при старте сервера');
        } else {
          console.log('❌ Ошибка при запуске автоанализа:', await analysisResponse.text());
        }
      } else {
        console.log('⏳ Автоанализ не требуется - прошло менее 2 минут с последнего сканирования');
      }
    } else {
      console.log('ℹ️ Сканирование еще не проводилось');
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке автоанализа:', error.message);
  }
    }, 5000); // Задержка 5 секунд для полной инициализации сервера
  } catch (error) {
    console.error('❌ Ошибка при инициализации автоанализа:', error.message);
  }
}

const app = express();
const net = require('net');

// Function to find available port
function findAvailablePort(startPort = 3001) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is busy, try next one
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

let PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for frequent status polling
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.'
    });
  }
});

// Apply rate limiting to all API routes except status polling
app.use('/api/telegram', limiter);
app.use('/api/sheets', limiter);
// No rate limiting for scanner status to allow frequent polling
// app.use('/api/scanner', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    console.log('🔧 CORS check - origin:', origin);
    
    // Allow requests with no origin (like mobile apps, Electron, or curl requests)
    if (!origin) {
      console.log('🔧 CORS: No origin - allowing');
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [process.env.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:5174']
      : ['http://localhost:5173', 'http://localhost:5174'];
    
    console.log('🔧 CORS: Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('🔧 CORS: Origin allowed');
      callback(null, true);
    } else {
      console.log('🔧 CORS: Origin not in allowed list, but allowing anyway for Electron compatibility');
      callback(null, true); // Allow all origins for Electron compatibility
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware with UTF-8 encoding
app.use(express.json({ limit: '10mb', charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, limit: '10mb', charset: 'utf-8' }));

// Set default charset for responses
app.use((req, res, next) => {
  res.charset = 'utf-8';
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Telegram Lead Scanner API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      scanner: {
        start: 'POST /api/scanner/start',
        stop: 'POST /api/scanner/stop',
        scan: 'POST /api/scanner/scan',
        status: 'GET /api/scanner/status',
        history: 'GET /api/scanner/history'
      },
      telegram: {
        initialize: 'POST /api/telegram/initialize',
        chats: 'GET /api/telegram/chats',
        messages: 'POST /api/telegram/messages',
        status: 'GET /api/telegram/status',
        disconnect: 'POST /api/telegram/disconnect'
      },
      sheets: {
        initialize: 'POST /api/sheets/initialize',
        create: 'POST /api/sheets/create',
        headers: 'POST /api/sheets/headers',
        append: 'POST /api/sheets/append',
        clear: 'POST /api/sheets/clear',
        data: 'GET /api/sheets/data/:spreadsheetId',
        status: 'GET /api/sheets/status'
      },
      leads: {
        list: 'GET /api/leads',
        analyze: 'POST /api/leads/analyze',
        clear: 'DELETE /api/leads',
        stats: 'GET /api/leads/stats'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/telegram', telegramRoutes);
app.use('/api/telegram-bot', telegramBotRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/sheets', sheetsTestRoutes);
app.use('/api/sheets', sheetsUpdateRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/leads', leadsUpdateRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Auto-initialize Google Sheets client if credentials are available
async function initializeGoogleSheets() {
  const { GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PROJECT_ID, GOOGLE_SHEETS_CREDENTIALS } = process.env;
  
  let credentials = null;
  
  // Try to use GOOGLE_SHEETS_CREDENTIALS first (JSON format)
  if (GOOGLE_SHEETS_CREDENTIALS && GOOGLE_SHEETS_CREDENTIALS !== 'your_credentials_here') {
    try {
      credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
      console.log('📋 Found Google Sheets credentials in JSON format');
    } catch (error) {
      console.log('⚠️ Failed to parse GOOGLE_SHEETS_CREDENTIALS:', error.message);
    }
  }
  
  // Fallback to individual environment variables
  if (!credentials && GOOGLE_SHEETS_PRIVATE_KEY && GOOGLE_SHEETS_CLIENT_EMAIL && GOOGLE_SHEETS_PROJECT_ID &&
      GOOGLE_SHEETS_PRIVATE_KEY !== 'your_private_key_here' &&
      GOOGLE_SHEETS_CLIENT_EMAIL !== 'your_client_email_here' &&
      GOOGLE_SHEETS_PROJECT_ID !== 'your_project_id_here') {
    
    credentials = {
      private_key: GOOGLE_SHEETS_PRIVATE_KEY,
      client_email: GOOGLE_SHEETS_CLIENT_EMAIL,
      project_id: GOOGLE_SHEETS_PROJECT_ID
    };
    console.log('📋 Found Google Sheets credentials in individual variables');
  }
  
  if (credentials) {
    try {
      console.log('🔧 Auto-initializing Google Sheets client...');
      
      const response = await fetch(`http://localhost:${PORT}/api/sheets/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privateKey: credentials.private_key,
          clientEmail: credentials.client_email,
          projectId: credentials.project_id
        })
      });
      
      if (response.ok) {
        console.log('✅ Google Sheets client initialized successfully');
      } else {
        const error = await response.json();
        console.log('⚠️ Failed to auto-initialize Google Sheets:', error.message);
      }
    } catch (error) {
      console.log('⚠️ Failed to auto-initialize Google Sheets:', error.message);
    }
  } else {
    console.log('ℹ️ Google Sheets credentials not configured - manual initialization required');
  }
}

// Start server with automatic port detection
async function startServer() {
  try {
    // Use fixed port 3001
    PORT = 3001;
    
    // Note: server-port.txt is only needed for Electron app, not for backend deployment
    // Skip writing port file in production/container environment
    
    app.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Wait a moment for server to be ready, then initialize Google Sheets
      setTimeout(initializeGoogleSheets, 1000);
      
      // Проверяем время последнего сканирования и запускаем автоанализ если нужно
      setTimeout(checkAndTriggerAutoAnalysis, 2000);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please stop the process using this port or change the PORT environment variable.`);
    }
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;