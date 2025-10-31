// Используем встроенный fetch API (Node.js 18+)

async function checkSheetsStructure() {
    console.log('🔍 Проверяем структуру листов в Google Sheets...\n');

    try {
        // 1. Получаем настройки Google Sheets
        console.log('1️⃣ Получаем настройки Google Sheets...');
        const settingsResponse = await fetch('http://localhost:3001/api/settings/google-sheets');
        
        if (!settingsResponse.ok) {
            console.log('❌ Не удалось получить настройки Google Sheets');
            return;
        }

        const settings = await settingsResponse.json();
        console.log('✅ Настройки получены:', {
            hasApiKey: !!settings.apiKey,
            hasSpreadsheetId: !!settings.spreadsheetId,
            spreadsheetId: settings.spreadsheetId
        });

        if (!settings.apiKey || !settings.spreadsheetId) {
            console.log('❌ Отсутствуют необходимые настройки Google Sheets');
            return;
        }

        // 2. Проверяем структуру листа "Сообщения"
        console.log('\n2️⃣ Проверяем структуру листа "Сообщения"...');
        const messagesResponse = await fetch(`http://localhost:3001/api/sheets/data?spreadsheetId=${settings.spreadsheetId}&range=Сообщения!1:3`);
        
        if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            console.log('✅ Лист "Сообщения" найден');
            console.log('📊 Структура (первые 3 строки):');
            if (messagesData.values && messagesData.values.length > 0) {
                messagesData.values.forEach((row, index) => {
                    console.log(`   Строка ${index + 1}:`, row);
                });
            } else {
                console.log('   Данные отсутствуют');
            }
        } else {
            console.log('❌ Не удалось получить данные листа "Сообщения"');
        }

        // 3. Проверяем структуру листа "Лиды"
        console.log('\n3️⃣ Проверяем структуру листа "Лиды"...');
        const leadsResponse = await fetch(`http://localhost:3001/api/sheets/data?spreadsheetId=${settings.spreadsheetId}&range=Лиды!1:10`);
        
        if (leadsResponse.ok) {
            const leadsData = await leadsResponse.json();
            console.log('✅ Лист "Лиды" найден');
            console.log('📊 Структура (первые 10 строк):');
            if (leadsData.values && leadsData.values.length > 0) {
                leadsData.values.forEach((row, index) => {
                    console.log(`   Строка ${index + 1}:`, row);
                });
            } else {
                console.log('   ⚠️ Лист пустой или данные отсутствуют');
            }
        } else {
            console.log('❌ Не удалось получить данные листа "Лиды"');
            console.log('   Возможно, лист не существует или имеет другое название');
        }

        // 4. Проверяем лист "Связались" (если существует)
        console.log('\n4️⃣ Проверяем лист "Связались"...');
        const contactedResponse = await fetch(`http://localhost:3001/api/sheets/data?spreadsheetId=${settings.spreadsheetId}&range=Связались!1:5`);
        
        if (contactedResponse.ok) {
            const contactedData = await contactedResponse.json();
            console.log('✅ Лист "Связались" найден');
            console.log('📊 Структура (первые 5 строк):');
            if (contactedData.values && contactedData.values.length > 0) {
                contactedData.values.forEach((row, index) => {
                    console.log(`   Строка ${index + 1}:`, row);
                });
            } else {
                console.log('   Лист пустой или данные отсутствуют');
            }
        } else {
            console.log('⚠️ Лист "Связались" не найден (это нормально, если он не создан)');
        }

        // 5. Получаем информацию о всех листах в таблице
        console.log('\n5️⃣ Получаем список всех листов в таблице...');
        try {
            const sheetsInfoResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${settings.spreadsheetId}?key=${settings.apiKey}`);
            
            if (sheetsInfoResponse.ok) {
                const sheetsInfo = await sheetsInfoResponse.json();
                console.log('📋 Все листы в таблице:');
                if (sheetsInfo.sheets) {
                    sheetsInfo.sheets.forEach((sheet, index) => {
                        console.log(`   ${index + 1}. "${sheet.properties.title}" (ID: ${sheet.properties.sheetId})`);
                    });
                }
            } else {
                console.log('⚠️ Не удалось получить информацию о листах через Google Sheets API');
            }
        } catch (error) {
            console.log('⚠️ Ошибка при получении информации о листах:', error.message);
        }

        console.log('\n✅ Проверка структуры листов завершена!');

    } catch (error) {
        console.error('❌ Ошибка при проверке структуры листов:', error.message);
    }
}

checkSheetsStructure();