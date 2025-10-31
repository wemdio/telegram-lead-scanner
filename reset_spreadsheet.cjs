// Скрипт для сброса Google Sheets таблицы с правильными заголовками
// Используйте этот скрипт для исправления проблемы со смещением данных

const fetch = require('node-fetch');

async function resetSpreadsheet() {
  try {
    console.log('🔄 Сброс Google Sheets таблицы...');
    
    const response = await fetch('http://localhost:3001/api/sheets/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Таблица успешно сброшена!');
      console.log('📋 Заголовки:', result.headers.join(', '));
      console.log('📊 ID таблицы:', result.spreadsheetId);
    } else {
      const error = await response.text();
      console.error('❌ Ошибка при сбросе таблицы:', error);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запуск скрипта
if (require.main === module) {
  resetSpreadsheet();
}

module.exports = resetSpreadsheet;