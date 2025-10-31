const axios = require('axios');

async function debugMockMode() {
    console.log('🔧 Отладка mock режима анализа лидов...\n');
    
    // Тест 1: Проверяем статус бэкенда
    try {
        console.log('1️⃣ Проверяем статус бэкенда...');
        const statusResponse = await axios.get('http://localhost:3001/api/status');
        console.log('✅ Бэкенд доступен:', statusResponse.status);
        console.log('📊 Endpoints:', JSON.stringify(statusResponse.data.endpoints, null, 2));
    } catch (error) {
        console.error('❌ Ошибка подключения к бэкенду:', error.response?.status || error.message);
        if (error.response?.status === 404) {
            console.log('🔍 Пробуем альтернативные endpoints...');
            try {
                const healthResponse = await axios.get('http://localhost:3001/health');
                console.log('✅ Health endpoint доступен:', healthResponse.status);
            } catch (healthError) {
                console.error('❌ Health endpoint недоступен:', healthError.message);
                return;
            }
        } else {
            return;
        }
    }
    
    // Тест 2: Минимальный запрос с обязательными полями
    try {
        console.log('\n2️⃣ Тестируем минимальный запрос...');
        const minimalData = {
            openrouterApiKey: 'test-key-minimal',
            criteria: 'Ищу разработчиков'
        };
        
        const minimalResponse = await axios.post('http://localhost:3001/api/leads/analyze', minimalData);
        console.log('✅ Минимальный запрос успешен:', minimalResponse.status);
        console.log('📊 Результат:', minimalResponse.data);
    } catch (error) {
        console.error('❌ Ошибка минимального запроса:', error.response?.status, error.response?.data || error.message);
    }
    
    // Тест 3: Запрос с полными данными
    try {
        console.log('\n3️⃣ Тестируем полный запрос...');
        const fullData = {
            openrouterApiKey: 'test-key-full',
            criteria: 'Ищу веб-разработчиков и программистов',
            messages: [
                {
                    id: 'test_msg_1',
                    text: 'Привет! Я fullstack разработчик с опытом в React и Node.js',
                    author: 'TestDev',
                    timestamp: new Date().toISOString()
                }
            ],
            spreadsheetId: 'mock-spreadsheet-id',
            googleServiceAccountEmail: 'test@example.com',
            googlePrivateKey: 'MOCK_PRIVATE_KEY'
        };
        
        const fullResponse = await axios.post('http://localhost:3001/api/leads/analyze', fullData);
        console.log('✅ Полный запрос успешен:', fullResponse.status);
        console.log('📊 Найдено лидов:', fullResponse.data.leads?.length || 0);
    } catch (error) {
        console.error('❌ Ошибка полного запроса:', error.response?.status, error.response?.data || error.message);
    }
    
    // Тест 4: Запрос с пустыми данными (должен вернуть 400)
    try {
        console.log('\n4️⃣ Тестируем запрос с пустыми данными...');
        const emptyResponse = await axios.post('http://localhost:3001/api/leads/analyze', {});
        console.log('⚠️ Неожиданный успех с пустыми данными:', emptyResponse.status);
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Правильно возвращает 400 для пустых данных');
            console.log('📋 Сообщение об ошибке:', error.response.data.error);
        } else {
            console.error('❌ Неожиданная ошибка:', error.response?.status, error.response?.data || error.message);
        }
    }
    
    // Тест 5: Запрос только с API ключом (без criteria)
    try {
        console.log('\n5️⃣ Тестируем запрос без criteria...');
        const noCriteriaData = {
            openrouterApiKey: 'test-key-no-criteria'
        };
        
        const noCriteriaResponse = await axios.post('http://localhost:3001/api/leads/analyze', noCriteriaData);
        console.log('⚠️ Неожиданный успех без criteria:', noCriteriaResponse.status);
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Правильно возвращает 400 без criteria');
            console.log('📋 Сообщение об ошибке:', error.response.data.error);
        } else {
            console.error('❌ Неожиданная ошибка:', error.response?.status, error.response?.data || error.message);
        }
    }
    
    // Тест 6: Запрос только с criteria (без API ключа)
    try {
        console.log('\n6️⃣ Тестируем запрос без API ключа...');
        const noApiKeyData = {
            criteria: 'Ищу разработчиков'
        };
        
        const noApiKeyResponse = await axios.post('http://localhost:3001/api/leads/analyze', noApiKeyData);
        console.log('⚠️ Неожиданный успех без API ключа:', noApiKeyResponse.status);
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('✅ Правильно возвращает 400 без API ключа');
            console.log('📋 Сообщение об ошибке:', error.response.data.error);
        } else {
            console.error('❌ Неожиданная ошибка:', error.response?.status, error.response?.data || error.message);
        }
    }
    
    console.log('\n🏁 Отладка завершена');
}

// Запускаем отладку
debugMockMode().catch(console.error);