/**
 * Тестовый файл для проверки веб-поиска
 */

const { needsWebSearch, performWebSearch, formatSearchResultsForAI } = require('./web-search-provider');

async function testWebSearch() {
    console.log('🔍 ТЕСТИРУЕМ ВЕБ-ПОИСК...');
    
    const testQueries = [
        'Какая погода в Москве',
        'Последние новости',
        'Курс доллара сегодня',
        'Что такое программирование' // не должен активировать поиск
    ];
    
    for (const query of testQueries) {
        console.log(`\n--- Тестируем: "${query}" ---`);
        
        const needsSearch = needsWebSearch(query);
        console.log('Нужен поиск:', needsSearch);
        
        if (needsSearch) {
            try {
                const results = await performWebSearch(query);
                console.log('Результаты поиска:', results.success ? `${results.results.length} найдено` : 'Ошибка');
                
                if (results.success) {
                    const formatted = formatSearchResultsForAI(results);
                    console.log('Форматированный результат для AI:', formatted.substring(0, 200) + '...');
                }
            } catch (error) {
                console.error('Ошибка поиска:', error.message);
            }
        }
    }
}

// Запускаем тест
testWebSearch().then(() => {
    console.log('\n✅ Тест веб-поиска завершен');
}).catch(error => {
    console.error('❌ Ошибка теста:', error);
});