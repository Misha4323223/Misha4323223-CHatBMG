// Простой тест веб-поиска
const fetch = require('node-fetch');

async function testDuckDuckGoSearch(query) {
  try {
    console.log('Тестируем поиск DuckDuckGo для:', query);
    
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
    
    console.log('URL запроса:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BOOOMERANGS-Search/1.0'
      }
    });
    
    console.log('Статус ответа:', response.status);
    
    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Получены данные:', JSON.stringify(data, null, 2));
    
    let results = [];
    
    // Основной ответ
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Информация',
        snippet: data.Abstract,
        url: data.AbstractURL,
        source: 'DuckDuckGo'
      });
    }
    
    // Связанные темы
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 3).forEach(topic => {
        if (topic.Text) {
          results.push({
            title: 'Связанная тема',
            snippet: topic.Text,
            url: topic.FirstURL,
            source: 'DuckDuckGo'
          });
        }
      });
    }
    
    console.log('Обработанные результаты:', results);
    
    return {
      success: true,
      results: results,
      total: results.length
    };
    
  } catch (error) {
    console.error('Ошибка поиска:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Запуск теста
testDuckDuckGoSearch('новости').then(result => {
  console.log('ИТОГОВЫЙ РЕЗУЛЬТАТ:', JSON.stringify(result, null, 2));
});