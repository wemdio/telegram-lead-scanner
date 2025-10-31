async function checkFrontendSettings() {
    console.log('🔍 Проверяем настройки через фронтенд...\n');

    // 1. Проверяем настройки Google Sheets на фронтенде (порт 5173)
    console.log('📋 1. Проверяем настройки Google Sheets на фронтенде (порт 5173):');
    try {
        const frontendResponse = await fetch('http://localhost:5173/api/settings/google-sheets');
        if (frontendResponse.ok) {
            const frontendData = await frontendResponse.json();
            console.log('✅ Настройки с фронтенда получены:', {
                success: frontendData.success,
                hasServiceAccountEmail: !!frontendData.serviceAccountEmail,
                hasPrivateKey: !!frontendData.privateKey,
                hasSpreadsheetId: !!frontendData.spreadsheetId
            });
            if (frontendData.spreadsheetId) {
                console.log('📊 Spreadsheet ID с фронтенда:', frontendData.spreadsheetId);
            }
        } else {
            console.log('❌ Ошибка получения настроек с фронтенда:', frontendResponse.status);
        }
    } catch (error) {
        console.log('❌ Ошибка подключения к фронтенду:', error.message);
    }

    // 2. Проверяем настройки Google Sheets на бэкенде (порт 3001)
    console.log('\n📋 2. Проверяем настройки Google Sheets на бэкенде (порт 3001):');
    try {
        const backendResponse = await fetch('http://localhost:3001/api/settings/google-sheets');
        if (backendResponse.ok) {
            const backendData = await backendResponse.json();
            console.log('✅ Настройки с бэкенда получены:', {
                success: backendData.success,
                hasServiceAccountEmail: !!backendData.serviceAccountEmail,
                hasPrivateKey: !!backendData.privateKey,
                hasSpreadsheetId: !!backendData.spreadsheetId
            });
            if (backendData.spreadsheetId) {
                console.log('📊 Spreadsheet ID с бэкенда:', backendData.spreadsheetId);
            }
        } else {
            console.log('❌ Ошибка получения настроек с бэкенда:', backendResponse.status);
        }
    } catch (error) {
        console.log('❌ Ошибка подключения к бэкенду:', error.message);
    }

    // 3. Проверяем статус Google Sheets клиента
    console.log('\n📋 3. Проверяем статус Google Sheets клиента:');
    try {
        const statusResponse = await fetch('http://localhost:3001/api/sheets/status');
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log('✅ Статус Google Sheets клиента:', statusData);
        } else {
            console.log('❌ Ошибка получения статуса:', statusResponse.status);
        }
    } catch (error) {
        console.log('❌ Ошибка проверки статуса:', error.message);
    }

    // 4. Проверяем заголовки листов
    console.log('\n📋 4. Проверяем заголовки листов:');
    try {
        const headersResponse = await fetch('http://localhost:3001/api/sheets/headers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                headers: [
                    'Timestamp',
                    'Chat Title', 
                    'Username',
                    'First Name',
                    'Last Name',
                    'User ID',
                    'Message',
                    'Chat ID',
                    'Message Type'
                ]
            })
        });
        if (headersResponse.ok) {
            const headersData = await headersResponse.json();
            console.log('✅ Заголовки листов:', headersData);
        } else {
            console.log('❌ Ошибка получения заголовков:', headersResponse.status);
        }
    } catch (error) {
        console.log('❌ Ошибка проверки заголовков:', error.message);
    }

    // 5. Проверяем лиды
    console.log('\n📋 5. Проверяем лиды:');
    try {
        const leadsResponse = await fetch('http://localhost:3001/api/leads');
        if (leadsResponse.ok) {
            const leadsData = await leadsResponse.json();
            console.log('✅ Лиды получены:', {
                success: leadsData.success,
                count: leadsData.leads ? leadsData.leads.length : 0
            });
        } else {
            console.log('❌ Ошибка получения лидов:', leadsResponse.status);
        }
    } catch (error) {
        console.log('❌ Ошибка проверки лидов:', error.message);
    }
}

checkFrontendSettings().catch(console.error);