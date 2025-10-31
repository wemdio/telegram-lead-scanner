// Скрипт для установки настроек AI в localStorage
// Запускается в консоли браузера на странице http://localhost:3000

console.log('🔧 Устанавливаем настройки AI в localStorage...');

// Устанавливаем тестовые настройки AI
localStorage.setItem('geminiApiKey', 'sk-or-v1-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
localStorage.setItem('leadCriteria', 'ищу специалистов по инфографике');

console.log('✅ Настройки AI установлены:');
console.log('- geminiApiKey:', localStorage.getItem('geminiApiKey'));
console.log('- leadCriteria:', localStorage.getItem('leadCriteria'));

// Проверяем все настройки в localStorage
console.log('\n📋 Все настройки в localStorage:');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(`- ${key}:`, value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'пусто');
}

console.log('\n🧪 Теперь можно протестировать ручное сканирование!');
console.log('Перейдите в раздел "Статус" и нажмите "Запустить сканирование"');