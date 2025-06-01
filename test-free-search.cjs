// Тест бесплатного поиска через duckduckgo-search
const { search } = require('duckduckgo-search');

async function testFreeSearch(query) {
  try {
    console.log('Тестируем бесплатный поиск для:', query);
    
    // Используем text поиск
    const results = await search(query, {
      max_results: 10,
      region: 'wt-wt',
      safesearch: 'moderate',
      time: null,
      backend: 'api'
    });
    
    console.log('Найдено результатов:', results.length);
    console.log('Результаты:');
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   ${result.body}`);
      console.log(`   URL: ${result.href}`);
      console.log('---');
    });
    
    return {
      success: true,
      results: results.map(r => ({
        title: r.title,
        snippet: r.body,
        url: r.href,
        source: 'DuckDuckGo'
      })),
      total: results.length
    };
    
  } catch (error) {
    console.error('Ошибка поиска:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Запуск теста
testFreeSearch('последние новости').then(result => {
  console.log('\nИТОГОВЫЙ РЕЗУЛЬТАТ:');
  console.log('Успех:', result.success);
  console.log('Количество результатов:', result.total);
  if (result.results && result.results.length > 0) {
    console.log('Первый результат:', result.results[0]);
  }
});