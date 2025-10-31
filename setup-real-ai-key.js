const fs = require('fs');
const path = require('path');

// Создаем HTML страницу для настройки реального AI ключа
const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Настройка реального AI ключа</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        
        h2 {
            color: #555;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        
        .status {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-weight: bold;
        }
        
        .success { 
            background-color: #d4edda; 
            color: #155724; 
            border: 1px solid #c3e6cb;
        }
        
        .error { 
            background-color: #f8d7da; 
            color: #721c24; 
            border: 1px solid #f5c6cb;
        }
        
        .info { 
            background-color: #d1ecf1; 
            color: #0c5460; 
            border: 1px solid #bee5eb;
        }
        
        .warning { 
            background-color: #fff3cd; 
            color: #856404; 
            border: 1px solid #ffeaa7;
        }
        
        input, textarea {
            width: 100%;
            padding: 12px;
            margin: 8px 0;
            border: 2px solid #ddd;
            border-radius: 8px;
            box-sizing: border-box;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
        }
        
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin: 8px;
            font-size: 16px;
            font-weight: bold;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        .danger {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        }
        
        .test-btn {
            background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
        }
        
        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #e9ecef;
        }
        
        .step {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin: 15px 0;
            border-left: 5px solid #667eea;
        }
        
        .step h3 {
            margin-top: 0;
            color: #667eea;
        }
        
        .api-key-input {
            font-family: 'Courier New', monospace;
            background-color: #f8f9fa;
        }
        
        .criteria-input {
            min-height: 120px;
            resize: vertical;
        }
    </style>
</head>
<body>
    <h1>🚀 Настройка реального OpenRouter API ключа</h1>
    
    <div class="container">
        <h2>📋 Инструкция по получению API ключа</h2>
        
        <div class="step">
            <h3>Шаг 1: Регистрация на OpenRouter</h3>
            <p>1. Перейдите на сайт <a href="https://openrouter.ai" target="_blank">https://openrouter.ai</a></p>
            <p>2. Нажмите "Sign Up" и зарегистрируйтесь</p>
            <p>3. Подтвердите email адрес</p>
        </div>
        
        <div class="step">
            <h3>Шаг 2: Получение API ключа</h3>
            <p>1. Войдите в аккаунт OpenRouter</p>
            <p>2. Перейдите в раздел "API Keys" или "Keys"</p>
            <p>3. Нажмите "Create Key" или "Generate API Key"</p>
            <p>4. Скопируйте полученный ключ (начинается с "sk-or-v1-")</p>
        </div>
        
        <div class="step">
            <h3>Шаг 3: Пополнение баланса</h3>
            <p>1. Перейдите в раздел "Credits" или "Billing"</p>
            <p>2. Пополните баланс на $5-10 для тестирования</p>
            <p>3. Убедитесь что баланс отображается корректно</p>
        </div>
    </div>
    
    <div class="container">
        <h2>⚙️ Настройка API ключа</h2>
        
        <label><strong>OpenRouter API Key:</strong></label>
        <input type="password" id="apiKey" class="api-key-input" placeholder="sk-or-v1-ваш-ключ-здесь">
        
        <label><strong>Критерии поиска лидов:</strong></label>
        <textarea id="criteria" class="criteria-input" placeholder="Например:
- Ищу веб-разработчиков и программистов
- Специалисты по React, Node.js, Python
- Фрилансеры готовые к новым проектам
- Люди предлагающие услуги разработки"></textarea>
        
        <div style="text-align: center; margin: 20px 0;">
            <button onclick="saveSettings()">💾 Сохранить настройки</button>
            <button onclick="testSettings()" class="test-btn">🧪 Тестировать AI</button>
            <button onclick="clearSettings()" class="danger">🗑️ Очистить</button>
        </div>
    </div>
    
    <div class="container">
        <h2>📊 Текущие настройки</h2>
        <button onclick="checkCurrentSettings()">🔍 Проверить настройки</button>
        <div id="currentSettings"></div>
    </div>
    
    <div class="container">
        <h2>🧪 Результаты тестирования</h2>
        <div id="testResults"></div>
    </div>

    <script>
        function showMessage(elementId, message, type = 'info') {
            const element = document.getElementById(elementId);
            element.innerHTML = \`<div class="status \${type}">\${message}</div>\`;
        }

        function saveSettings() {
            const apiKey = document.getElementById('apiKey').value.trim();
            const criteria = document.getElementById('criteria').value.trim();
            
            if (!apiKey) {
                showMessage('testResults', '❌ Пожалуйста, введите API ключ', 'error');
                return;
            }
            
            if (!criteria) {
                showMessage('testResults', '❌ Пожалуйста, введите критерии поиска', 'error');
                return;
            }
            
            if (!apiKey.startsWith('sk-or-v1-')) {
                showMessage('testResults', '⚠️ API ключ должен начинаться с "sk-or-v1-"', 'warning');
            }
            
            try {
                // Сохраняем в localStorage для совместимости с разными частями приложения
                localStorage.setItem('geminiApiKey', apiKey);
                localStorage.setItem('openrouterApiKey', apiKey);
                localStorage.setItem('leadCriteria', criteria);
                
                showMessage('testResults', '✅ Настройки успешно сохранены в localStorage!', 'success');
                checkCurrentSettings();
                
            } catch (error) {
                showMessage('testResults', \`❌ Ошибка сохранения: \${error.message}\`, 'error');
            }
        }

        function checkCurrentSettings() {
            const settings = {
                'geminiApiKey': localStorage.getItem('geminiApiKey'),
                'openrouterApiKey': localStorage.getItem('openrouterApiKey'),
                'leadCriteria': localStorage.getItem('leadCriteria')
            };
            
            let html = '<h3>Сохраненные настройки:</h3>';
            
            Object.entries(settings).forEach(([key, value]) => {
                const displayValue = value ? 
                    (value.length > 50 ? value.substring(0, 20) + '...' + value.substring(value.length - 10) : value) : 
                    '❌ НЕ УСТАНОВЛЕНО';
                html += \`<p><strong>\${key}:</strong> \${displayValue}</p>\`;
            });
            
            document.getElementById('currentSettings').innerHTML = html;
        }

        async function testSettings() {
            showMessage('testResults', '🔄 Тестируем настройки AI...', 'info');
            
            const apiKey = localStorage.getItem('openrouterApiKey') || localStorage.getItem('geminiApiKey');
            const criteria = localStorage.getItem('leadCriteria');
            
            if (!apiKey || !criteria) {
                showMessage('testResults', '❌ Сначала сохраните настройки', 'error');
                return;
            }
            
            const testData = {
                openrouterApiKey: apiKey,
                criteria: criteria,
                messages: [
                    {
                        id: 'test_msg_1',
                        text: 'Привет! Я fullstack разработчик с опытом работы в React, Node.js и Python. Ищу интересные проекты для фриланса. Мой телеграм @developer123',
                        author: 'TestDeveloper',
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 'test_msg_2',
                        text: 'Кто-нибудь знает хорошего дизайнера для мобильного приложения? Нужен срочно!',
                        author: 'ClientUser',
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 'test_msg_3',
                        text: 'Я frontend разработчик, специализируюсь на Vue.js и TypeScript. Открыт для новых предложений. Контакт: @frontend_pro',
                        author: 'VueDevUser',
                        timestamp: new Date().toISOString()
                    }
                ],
                spreadsheetId: 'test_spreadsheet_id',
                googleServiceAccountEmail: 'telegram-scanner@leadscanner-470700.iam.gserviceaccount.com',
                googlePrivateKey: 'test_private_key'
            };
            
            try {
                const response = await fetch('http://localhost:3001/api/leads/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData),
                    timeout: 30000
                });
                
                const result = await response.json();
                
                let html = \`<h3>📊 Результат тестирования:</h3>\`;
                html += \`<p><strong>Статус ответа:</strong> \${response.status}</p>\`;
                
                if (response.ok) {
                    html += \`<p><strong>Найдено лидов:</strong> \${result.leads ? result.leads.length : 0}</p>\`;
                    
                    if (result.leads && result.leads.length > 0) {
                        html += '<h4>✅ Найденные лиды:</h4>';
                        result.leads.forEach((lead, index) => {
                            html += \`<div class="status success">
                                <strong>Лид \${index + 1}:</strong><br>
                                <strong>ID:</strong> \${lead.messageId || lead.id}<br>
                                <strong>Автор:</strong> \${lead.author}<br>
                                <strong>Уверенность:</strong> \${lead.confidence}%<br>
                                <strong>Причина:</strong> \${lead.reason}
                            </div>\`;
                        });
                        
                        html += '<div class="status success">🎉 <strong>Отлично! AI успешно находит лиды. Настройка завершена!</strong></div>';
                    } else {
                        html += '<div class="status warning">⚠️ Лиды не найдены. Попробуйте изменить критерии поиска или проверить сообщения.</div>';
                    }
                    
                    showMessage('testResults', html, 'success');
                } else {
                    html += \`<div class="status error">❌ Ошибка API: \${response.status}<br><pre>\${JSON.stringify(result, null, 2)}</pre></div>\`;
                    showMessage('testResults', html, 'error');
                }
                
            } catch (error) {
                let errorMsg = \`❌ Ошибка тестирования: \${error.message}\`;
                
                if (error.message.includes('Failed to fetch')) {
                    errorMsg += '<br><br>🔧 <strong>Возможные причины:</strong><br>';
                    errorMsg += '• Бэкенд не запущен (запустите: npm run dev в папке backend)<br>';
                    errorMsg += '• Неверный порт (проверьте что бэкенд работает на порту 3001)<br>';
                    errorMsg += '• Проблемы с CORS';
                }
                
                showMessage('testResults', errorMsg, 'error');
            }
        }

        function clearSettings() {
            if (confirm('Вы уверены что хотите очистить все настройки?')) {
                try {
                    localStorage.removeItem('geminiApiKey');
                    localStorage.removeItem('openrouterApiKey');
                    localStorage.removeItem('leadCriteria');
                    
                    document.getElementById('apiKey').value = '';
                    document.getElementById('criteria').value = '';
                    
                    showMessage('testResults', '🗑️ Настройки очищены', 'info');
                    checkCurrentSettings();
                } catch (error) {
                    showMessage('testResults', \`❌ Ошибка очистки: \${error.message}\`, 'error');
                }
            }
        }

        // Автоматически проверяем настройки при загрузке
        window.onload = function() {
            checkCurrentSettings();
            
            // Загружаем сохраненные значения в поля
            const savedApiKey = localStorage.getItem('openrouterApiKey') || localStorage.getItem('geminiApiKey');
            const savedCriteria = localStorage.getItem('leadCriteria');
            
            if (savedApiKey) {
                document.getElementById('apiKey').value = savedApiKey;
            }
            
            if (savedCriteria) {
                document.getElementById('criteria').value = savedCriteria;
            }
        };
    </script>
</body>
</html>`;

// Сохраняем HTML файл
const filePath = path.join(__dirname, 'setup-real-ai-key.html');
fs.writeFileSync(filePath, htmlContent, 'utf8');

console.log('✅ HTML файл создан:', filePath);
console.log('🌐 Откройте файл в браузере для настройки реального AI ключа');
console.log('📝 Инструкции по получению OpenRouter API ключа включены в интерфейс');

// Также выводим краткую инструкцию в консоль
console.log('\n📋 Краткая инструкция:');
console.log('1. Зарегистрируйтесь на https://openrouter.ai');
console.log('2. Получите API ключ в разделе "API Keys"');
console.log('3. Пополните баланс на $5-10');
console.log('4. Откройте созданный HTML файл и введите ключ');
console.log('5. Протестируйте работу AI анализа');